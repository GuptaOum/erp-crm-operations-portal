#!/usr/bin/env bash
set -euo pipefail

STAGE="${1:-1}"
REGION="${AWS_REGION:-ap-south-1}"
REPO_URL="${PORTAL_REPO_URL:-https://github.com/GuptaOum/erp-crm-operations-portal.git}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

case "$STAGE" in
  1 | 2 | 3) ;;
  *)
    echo "usage: scripts/up.sh [1|2|3]" >&2
    exit 1
    ;;
esac

cd "$ROOT/infra"

echo "==> applying stage $STAGE"
terraform init -input=false >/dev/null
terraform apply -auto-approve -input=false -var "stage=$STAGE"

if [ "$STAGE" -ge 3 ]; then
  echo
  echo "==> stage 3 infrastructure is ready"
  terraform output
  echo
  echo "The API now runs from an image in ECR and the frontend from S3 behind CloudFront."
  echo "Publish the first release, then scale the group up:"
  echo
  echo "  gh workflow run deploy.yml"
  echo "  terraform -chdir=infra apply -auto-approve -var stage=3 -var asg_min_size=2"
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
