#!/usr/bin/env bash
set -euo pipefail

export PYTHONIOENCODING=utf-8

STAGE="${1:-1}"
REGION="${AWS_REGION:-ap-south-1}"
REPO_URL="${PORTAL_REPO_URL:-https://github.com/GuptaOum/erp-crm-operations-portal.git}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

case "$STAGE" in
  1 | 2 | 3 | 4) ;;
  *)
    echo "usage: scripts/up.sh [1|2|3|4]" >&2
    exit 1
    ;;
esac

cd "$ROOT/infra"

echo "==> applying stage $STAGE"
terraform init -input=false >/dev/null
terraform apply -auto-approve -input=false -var "stage=$STAGE"

if [ "$STAGE" -eq 4 ]; then
  echo
  echo "==> stage 4 infrastructure is ready"

  CLUSTER="$(terraform output -raw ecs_cluster_name)"
  SERVICE="$(terraform output -raw ecs_service_name)"
  TASK_DEF="$(aws ecs describe-services --region "$REGION" --cluster "$CLUSTER" \
    --services "$SERVICE" --query 'services[0].taskDefinition' --output text)"
  SUBNETS="$(terraform output -json private_subnet_ids | python -c 'import json,sys; print(",".join(json.load(sys.stdin)))')"
  APP_SG="$(terraform output -raw app_security_group_id)"
  TARGET_GROUP="$(aws elbv2 describe-target-groups --region "$REGION" \
    --query 'TargetGroups[0].TargetGroupArn' --output text)"

  echo
  echo "==> publishing the first release"
  echo "    a destroy deletes the ECR repository, so every stage needs a fresh image"

  gh variable set DEPLOY_ENABLED --repo "$(gh repo view --json nameWithOwner -q .nameWithOwner)" --body true
  gh workflow run deploy.yml
  sleep 15
  RUN_ID="$(gh run list --workflow Deploy --limit 1 --json databaseId -q '.[0].databaseId')"
  gh run watch "$RUN_ID" --exit-status || {
    echo "the deploy workflow failed, see the run above" >&2
    exit 1
  }

  echo
  echo "==> waiting for the service to settle on the new image"
  aws ecs wait services-stable --region "$REGION" --cluster "$CLUSTER" --services "$SERVICE"

  echo "==> waiting for the load balancer to report every target healthy"
  until [ "$(aws elbv2 describe-target-health --region "$REGION" \
    --target-group-arn "$TARGET_GROUP" \
    --query "length(TargetHealthDescriptions[?TargetHealth.State!='healthy'])" --output text)" = "0" ]; do
    sleep 15
  done

  echo
  echo "==> seeding the database"
  SEED_TASK="$(aws ecs run-task --region "$REGION" \
    --cluster "$CLUSTER" \
    --task-definition "$TASK_DEF" \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$APP_SG],assignPublicIp=DISABLED}" \
    --overrides '{"containerOverrides":[{"name":"api","command":["node","dist/seed.js"]}]}' \
    --query 'tasks[0].taskArn' --output text)"

  aws ecs wait tasks-stopped --region "$REGION" --cluster "$CLUSTER" --tasks "$SEED_TASK"

  SEED_EXIT="$(aws ecs describe-tasks --region "$REGION" --cluster "$CLUSTER" --tasks "$SEED_TASK" \
    --query 'tasks[0].containers[0].exitCode' --output text)"

  if [ "$SEED_EXIT" != "0" ]; then
    echo "the seed task exited with $SEED_EXIT, check the log group for details" >&2
    exit 1
  fi

  echo
  terraform output
  echo
  echo "==> stage 4 is serving. Sign in with admin@example.com and Portal@2026."
  echo "    Destroy it with scripts/down.sh when the demo is over."
  exit 0
fi

if [ "$STAGE" -eq 3 ]; then
  echo
  echo "==> stage 3 infrastructure is ready"

  ASG="$(terraform output -raw autoscaling_group_name)"
  TARGET_GROUP="$(aws elbv2 describe-target-groups --region "$REGION" \
    --query 'TargetGroups[0].TargetGroupArn' --output text)"

  echo
  echo "==> publishing the first release"
  echo "    a destroy deletes the ECR repository, so every stage 3 needs a fresh image"

  gh variable set DEPLOY_ENABLED --repo "$(gh repo view --json nameWithOwner -q .nameWithOwner)" --body true
  gh workflow run deploy.yml
  sleep 15
  RUN_ID="$(gh run list --workflow Deploy --limit 1 --json databaseId -q '.[0].databaseId')"
  gh run watch "$RUN_ID" --exit-status || {
    echo "the deploy workflow failed, see the run above" >&2
    exit 1
  }

  echo
  echo "==> rolling the instances onto the new image"
  echo "    the deploy workflow starts the refresh, so only start one if it did not"

  REFRESH_STATUS="$(aws autoscaling describe-instance-refreshes --region "$REGION" \
    --auto-scaling-group-name "$ASG" \
    --query 'InstanceRefreshes[0].Status' --output text 2>/dev/null || echo None)"

  case "$REFRESH_STATUS" in
    InProgress | Pending | Cancelling) ;;
    *)
      aws autoscaling start-instance-refresh --region "$REGION" \
        --auto-scaling-group-name "$ASG" \
        --preferences '{"MinHealthyPercentage":0,"InstanceWarmup":90}' >/dev/null
      ;;
  esac

  until [ "$(aws autoscaling describe-instance-refreshes --region "$REGION" \
    --auto-scaling-group-name "$ASG" \
    --query 'InstanceRefreshes[0].Status' --output text)" = "Successful" ]; do
    sleep 20
  done

  echo "==> waiting for the load balancer to report every target healthy"
  until [ "$(aws elbv2 describe-target-health --region "$REGION" \
    --target-group-arn "$TARGET_GROUP" \
    --query "length(TargetHealthDescriptions[?TargetHealth.State!='healthy'])" --output text)" = "0" ]; do
    sleep 15
  done

  echo
  echo "==> seeding the database"
  SEED_INSTANCE="$(aws autoscaling describe-auto-scaling-groups --region "$REGION" \
    --auto-scaling-group-names "$ASG" \
    --query 'AutoScalingGroups[0].Instances[0].InstanceId' --output text)"

  SEED_SCRIPT="$(cat <<'SEED'
set -e
REGION=ap-south-1
DB=$(aws ssm get-parameter --with-decryption --region $REGION --name /erp-portal/DATABASE_URL_DIRECT --query Parameter.Value --output text)
IMAGE=$(aws ecr describe-repositories --region $REGION --repository-names erp-portal-api --query 'repositories[0].repositoryUri' --output text):latest
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "${IMAGE%%/*}" >/dev/null
docker pull "$IMAGE" >/dev/null
docker run --rm -e DATABASE_URL="$DB" -e JWT_SECRET=seedonly -e NODE_ENV=production "$IMAGE" node dist/seed.js
SEED
)"

  COMMAND_ID="$(aws ssm send-command --region "$REGION" \
    --instance-ids "$SEED_INSTANCE" \
    --document-name AWS-RunShellScript \
    --parameters "$(python -c "import json,sys; print(json.dumps({'commands':[sys.stdin.read()]}))" <<<"$SEED_SCRIPT")" \
    --timeout-seconds 600 --query Command.CommandId --output text)"

  until aws ssm get-command-invocation --region "$REGION" --command-id "$COMMAND_ID" \
    --instance-id "$SEED_INSTANCE" --query Status --output text 2>/dev/null \
    | grep -qE 'Success|Failed|TimedOut'; do
    sleep 10
  done

  aws ssm get-command-invocation --region "$REGION" --command-id "$COMMAND_ID" \
    --instance-id "$SEED_INSTANCE" --query StandardOutputContent --output text | tail -3

  echo
  terraform output
  echo
  echo "==> stage 3 is serving. Sign in with admin@example.com and Portal@2026."
  echo "    Destroy it with scripts/down.sh when the demo is over."
  exit 0
fi

INSTANCE="$(terraform output -raw instance_id)"
PORTAL_HOST="$(terraform output -raw portal_host)"

echo "==> waiting for the SSM agent on $INSTANCE"
until [ "$(aws ssm describe-instance-information --region "$REGION" \
  --filters "Key=InstanceIds,Values=$INSTANCE" \
  --query 'InstanceInformationList[0].PingStatus' --output text 2>/dev/null)" = "Online" ]; do
  sleep 15
done

run_remote() {
  local source_file="$1"
  local label="$2"
  local prepared payload command_id status

  prepared="$(mktemp)"
  payload="$(mktemp)"

  sed -e "s|__REPO_URL__|$REPO_URL|g" \
      -e "s|__PORTAL_HOST__|$PORTAL_HOST|g" \
      -e "s|__STAGE__|$STAGE|g" \
      "$source_file" > "$prepared"

  python -c "import json,sys; json.dump({'Parameters': {'commands': [open(sys.argv[1], encoding='utf-8').read()], 'executionTimeout': ['3600']}}, open(sys.argv[2], 'w'))" \
    "$prepared" "$payload"

  command_id="$(aws ssm send-command --region "$REGION" --instance-ids "$INSTANCE" \
    --document-name AWS-RunShellScript --comment "$label" \
    --cli-input-json "file://$payload" --query Command.CommandId --output text)"

  echo "==> $label ($command_id)"

  while true; do
    status="$(aws ssm list-command-invocations --region "$REGION" --command-id "$command_id" \
      --query 'CommandInvocations[0].Status' --output text 2>/dev/null || echo Pending)"
    case "$status" in
      Success) break ;;
      Failed | Cancelled | TimedOut)
        echo "$label failed with status $status" >&2
        aws ssm list-command-invocations --region "$REGION" --command-id "$command_id" --details \
          --query 'CommandInvocations[0].CommandPlugins[0].Output' --output text | tail -30 >&2
        exit 1
        ;;
    esac
    sleep 15
  done
}

run_remote "$ROOT/scripts/remote-deploy.sh" "deploy application"
run_remote "$ROOT/scripts/remote-tls.sh" "issue TLS certificate"

echo
echo "==> portal is live at https://$PORTAL_HOST"
echo "    sign in with admin@example.com and the password Portal@2026"
