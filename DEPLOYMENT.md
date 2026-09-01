# Deployment

## Quick reference

Two commands cover the whole lifecycle. Both are idempotent and safe to re-run.

```bash
./scripts/up.sh 1     # bring the whole environment up at stage 1, 2 or 3
```

```bash
./scripts/down.sh     # destroy everything and confirm nothing is still billing
```

`up.sh` applies the Terraform for the stage you ask for, waits for the SSM agent, deploys the
containers, seeds the database and issues a Let's Encrypt certificate, then prints the live URL.
`down.sh` runs `terraform destroy` and then checks NAT gateways, load balancers, RDS, Auto Scaling
groups, CloudFront, instances and Elastic IPs, failing loudly if anything survived.

Stage 3 is the exception to the single command, because the Auto Scaling group boots from an image
that has to exist first. `up.sh 3` builds the infrastructure with zero instances and prints the two
follow up commands:

```bash
gh workflow run deploy.yml
terraform -chdir=infra apply -auto-approve -var stage=3 -var asg_min_size=2
```

First time only, before any of the above:

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # then fill in the two secrets and your email
terraform init
```

Infrastructure lives in [`infra/`](infra) as Terraform and targets `ap-south-1`. A single `stage`
variable controls how much of the architecture exists, so the environment grows without rewriting
anything.

| Stage | What it adds | Approximate cost |
| --- | --- | --- |
| 1 | VPC, two public and two private subnets, internet gateway, one EC2 instance with an Elastic IP, S3, ECR, SSM parameters, budget alarm | 0.72 USD per day |
| 2 | RDS PostgreSQL Multi-AZ in the private subnets | 2.06 USD per day |
| 3 | NAT gateway, application load balancer, Auto Scaling group in the private subnets, S3 and CloudFront for the frontend | 4.51 USD per day |

Costs are `ap-south-1` on demand rates taken from the AWS Pricing API, and assume the resources run
continuously. The expensive items are the NAT gateway at 0.056 USD an hour, Multi-AZ RDS at 0.052,
and the load balancer at 0.0239. Note that every public IPv4 address bills at 0.005 an hour whether
it is attached or idle. **Run `terraform destroy` when you are finished.** See
[Teardown](#teardown).

## Prerequisites

- Terraform 1.9 or newer
- AWS CLI v2, authenticated against the target account
- Docker, only if you want to build images locally

## How server configuration is managed

Nothing secret is written to a file on the instance and nothing secret is committed.

- `terraform.tfvars` holds the database password and JWT secret locally and is git ignored.
- Terraform writes them to **SSM Parameter Store** as `SecureString` values under `/erp-portal/`.
- The instance profile grants `ssm:GetParameter` on that path only. The instance reads its
  configuration at boot using its IAM role.
- There are no AWS access keys on the server. GitHub Actions authenticates through **OIDC** and
  assumes a role scoped to this repository, so there are no AWS keys in GitHub either.
- There is no SSH ingress in any security group and no key pair is required. Shell access is
  through **SSM Session Manager**.

## One time state bucket

Terraform state records what exists. If it is lost, `terraform destroy` cannot clean up and
resources keep billing. State therefore lives in a versioned S3 bucket rather than on one laptop.

```bash
cd infra/bootstrap
terraform init
terraform apply
```

Then point the main configuration at it:

```bash
cd infra
cp backend.tf.example backend.tf
terraform init -migrate-state
```

## Configure

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```

Fill in `terraform.tfvars`:

```hcl
stage              = 1
budget_alert_email = "you@example.com"
db_password        = "a long random password"
jwt_secret         = "a long random string"
github_repository  = "owner/repo"
```

Generate the two secrets rather than inventing them:

```bash
openssl rand -base64 36
```

## Stage 1, single server

```bash
cd infra
terraform apply -var stage=1
```

Note the outputs:

```bash
terraform output server_public_ip
terraform output portal_host
```

`portal_host` is the `nip.io` hostname derived from the Elastic IP, for example
`13-234-56-78.nip.io`. It resolves to that IP without registering a domain, which is what lets
Let's Encrypt issue a real certificate.

### Put the application on the instance

The instance has no SSH port open, so commands go through SSM. Wait a minute after `apply` for the
SSM agent to register, then confirm it is online:

```bash
INSTANCE=$(cd infra && terraform output -raw instance_id 2>/dev/null || aws ec2 describe-instances \
  --region ap-south-1 --filters "Name=tag:Name,Values=erp-portal-server" \
  "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].InstanceId" --output text)

aws ssm describe-instance-information --region ap-south-1 \
  --filters "Key=InstanceIds,Values=$INSTANCE" \
  --query "InstanceInformationList[0].PingStatus" --output text
```

Clone the repository and start the stack:

```bash
aws ssm send-command --region ap-south-1 --instance-ids "$INSTANCE" \
  --document-name AWS-RunShellScript \
  --comment "deploy portal" \
  --parameters 'commands=[
    "set -euo pipefail",
    "cd /opt/portal",
    "git clone https://github.com/OWNER/REPO.git app || (cd app && git pull)",
    "cd app",
    "cp .env.example .env"
  ]'
```

Write the real secrets into `.env` from SSM Parameter Store rather than typing them onto the box:

```bash
aws ssm send-command --region ap-south-1 --instance-ids "$INSTANCE" \
  --document-name AWS-RunShellScript \
  --parameters 'commands=[
    "set -euo pipefail",
    "cd /opt/portal/app",
    "JWT=$(aws ssm get-parameter --with-decryption --region ap-south-1 --name /erp-portal/JWT_SECRET --query Parameter.Value --output text)",
    "BUCKET=$(aws ssm get-parameter --region ap-south-1 --name /erp-portal/S3_IMAGE_BUCKET --query Parameter.Value --output text)",
    "sed -i \"s|^JWT_SECRET=.*|JWT_SECRET=$JWT|\" .env",
    "sed -i \"s|^S3_IMAGE_BUCKET=.*|S3_IMAGE_BUCKET=$BUCKET|\" .env",
    "docker compose up -d --build",
    "docker compose exec -T api node dist/seed.js"
  ]'
```

Migrations run automatically from the container entrypoint, so only the seed is explicit. Check the
result of any command with:

```bash
aws ssm list-command-invocations --region ap-south-1 --command-id <id> --details \
  --query "CommandInvocations[0].CommandPlugins[0].Output" --output text
```

The portal is now on `http://<elastic-ip>/`.

### Issue the TLS certificate

Certbot runs from a container, so nothing is installed on the host. Replace `PORTAL_HOST` with the
`portal_host` output.

```bash
aws ssm send-command --region ap-south-1 --instance-ids "$INSTANCE" \
  --document-name AWS-RunShellScript \
  --parameters 'commands=[
    "set -euo pipefail",
    "cd /opt/portal/app",
    "HOST=PORTAL_HOST",
    "docker run --rm -v /etc/letsencrypt:/etc/letsencrypt -v portal_certbot-webroot:/var/www/certbot certbot/certbot certonly --webroot -w /var/www/certbot -d $HOST --agree-tos --register-unsafely-without-email --non-interactive",
    "sed -i \"s/PORTAL_HOST/$HOST/g\" deploy/nginx-tls.conf",
    "docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d"
  ]'
```

The portal is now on `https://PORTAL_HOST` with a valid certificate. Renewal is a cron entry running
the same certbot container with `renew`.

## Stage 2, managed database

```bash
cd infra
terraform apply -var stage=2
```

This creates RDS PostgreSQL Multi-AZ across both private subnets and writes the connection string to
`/erp-portal/DATABASE_URL`. Point the application at it and drop the local database container:

```bash
aws ssm send-command --region ap-south-1 --instance-ids "$INSTANCE" \
  --document-name AWS-RunShellScript \
  --parameters 'commands=[
    "set -euo pipefail",
    "cd /opt/portal/app",
    "URL=$(aws ssm get-parameter --with-decryption --region ap-south-1 --name /erp-portal/DATABASE_URL --query Parameter.Value --output text)",
    "sed -i \"s|^DATABASE_URL=.*|DATABASE_URL=$URL|\" .env",
    "docker compose up -d --no-deps api",
    "docker compose stop db",
    "docker compose exec -T api node dist/seed.js"
  ]'
```

To demonstrate failover:

```bash
aws rds reboot-db-instance --region ap-south-1 \
  --db-instance-identifier erp-portal-db --force-failover
```

The API reconnects on its own. Watch the standby become the primary in the RDS console.

## Stage 3, load balanced and auto scaled

```bash
cd infra
terraform apply -var stage=3
```

This adds the NAT gateway, the load balancer, the Auto Scaling group in the private subnets, and the
S3 and CloudFront pair serving the frontend. The single server is replaced by instances that pull
their image from ECR, so push an image and the frontend build before or immediately after applying.

Push the first image by hand:

```bash
cd infra
REPO=$(terraform output -raw ecr_repository_url)
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin "${REPO%%/*}"
cd ../backend
docker build -t "$REPO:latest" .
docker push "$REPO:latest"
```

Publish the frontend:

```bash
cd infra
BUCKET=$(terraform output -raw site_bucket)
DIST=$(terraform output -raw cloudfront_distribution_id)
cd ../frontend
npm ci && npx vite build
aws s3 sync dist "s3://$BUCKET" --delete
aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/*"
```

Seed the database once, through any instance in the group:

```bash
INSTANCE=$(aws autoscaling describe-auto-scaling-groups --region ap-south-1 \
  --auto-scaling-group-names erp-portal-app \
  --query "AutoScalingGroups[0].Instances[0].InstanceId" --output text)

aws ssm send-command --region ap-south-1 --instance-ids "$INSTANCE" \
  --document-name AWS-RunShellScript \
  --parameters 'commands=["docker exec portal-api node dist/seed.js"]'
```

The public address is `terraform output cloudfront_domain`. The frontend is that URL and the API is
that URL plus `/api`.

### Continuous deployment

`.github/workflows/deploy.yml` builds the image, pushes it to ECR, publishes the frontend, then
calls `start-instance-refresh` so the Auto Scaling group replaces instances with the new image. It
authenticates through OIDC, so no AWS keys are stored in GitHub.

Set these in the repository, under Settings then Secrets and variables then Actions.

Secret:

| Name | Value |
| --- | --- |
| `AWS_DEPLOY_ROLE_ARN` | `terraform output github_deploy_role_arn` |

Variables:

| Name | Value |
| --- | --- |
| `DEPLOY_ENABLED` | `true` |
| `AWS_REGION` | `ap-south-1` |
| `ECR_REPOSITORY_URL` | `terraform output ecr_repository_url` |
| `SITE_BUCKET` | `terraform output site_bucket` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `terraform output cloudfront_distribution_id` |
| `AUTOSCALING_GROUP` | `terraform output autoscaling_group_name` |

The deploy job is skipped until `DEPLOY_ENABLED` is `true`, so the workflow does not fail on a
repository that has no infrastructure yet. `github_repository` must be set in `terraform.tfvars`
for the role to exist at all, since its trust policy is scoped to that one repository.

## Teardown

The NAT gateway, load balancer and Multi-AZ RDS are the costly resources. Destroy everything when
the demo is over:

```bash
cd infra
terraform destroy
```

Then confirm nothing survived, because an orphaned NAT gateway or an unattached Elastic IP keeps
billing silently:

```bash
aws ec2 describe-nat-gateways --region ap-south-1 \
  --filter "Name=state,Values=available" --query "NatGateways[].NatGatewayId"

aws elbv2 describe-load-balancers --region ap-south-1 \
  --query "LoadBalancers[].LoadBalancerName"

aws rds describe-db-instances --region ap-south-1 \
  --query "DBInstances[].DBInstanceIdentifier"

aws ec2 describe-addresses --region ap-south-1 \
  --query "Addresses[?AssociationId==null].PublicIp"

aws cloudfront list-distributions --query "DistributionList.Items[].DomainName"
```

All five should come back empty. The budget alarm Terraform creates sends mail at 60 percent of a
20 USD month as a second line of defence, and the AWS Cost Explorer figure for the day after
teardown should return to zero.

If state was ever lost and `destroy` cannot see the resources, delete them by hand in this order:
CloudFront distribution, Auto Scaling group, load balancer, RDS instance, NAT gateway, Elastic IPs,
subnets, then the VPC.
