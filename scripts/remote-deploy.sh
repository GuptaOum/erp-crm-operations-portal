set -euo pipefail
REGION=ap-south-1
REPO_URL=__REPO_URL__
STAGE=__STAGE__

for i in $(seq 1 40); do
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then break; fi
  sleep 10
done

mkdir -p /opt/portal && cd /opt/portal

if [ -d app/.git ]; then
  cd app
  git fetch --depth 1 origin main
  git reset --hard origin/main
else
  git clone --depth 1 "$REPO_URL" app
  cd app
fi

read_parameter() {
  aws ssm get-parameter --with-decryption --region "$REGION" \
    --name "/erp-portal/$1" --query Parameter.Value --output text
}

JWT=$(read_parameter JWT_SECRET)
BUCKET=$(read_parameter S3_IMAGE_BUCKET)

if [ "$STAGE" -ge 2 ]; then
  DBURL=$(read_parameter DATABASE_URL)
  PGPW=unused_rds_backed
  COMPOSE="docker compose -f docker-compose.yml -f docker-compose.rds.yml"
else
  PGPW=$(openssl rand -hex 20)
  DBURL="postgresql://erp_admin:$PGPW@db:5432/erp_portal"
  COMPOSE="docker compose"
fi

{
  echo "POSTGRES_DB=erp_portal"
  echo "POSTGRES_USER=erp_admin"
  echo "POSTGRES_PASSWORD=$PGPW"
  echo "DATABASE_URL=$DBURL"
  echo "JWT_SECRET=$JWT"
  echo "JWT_EXPIRES_IN=8h"
  echo "NODE_ENV=production"
  echo "CORS_ORIGIN=*"
  echo "AWS_REGION=$REGION"
  echo "S3_IMAGE_BUCKET=$BUCKET"
  echo "COMPANY_NAME=Shree Distributors"
  echo "COMPANY_ADDRESS=Plot 42, MIDC Bhosari, Pune 411026"
  echo "COMPANY_GST=27AABCS1429B1ZX"
} > .env
chmod 600 .env

if [ "$STAGE" -ge 2 ]; then
  $COMPOSE up -d --build api web
else
  $COMPOSE up -d --build
fi

for i in $(seq 1 40); do
  if $COMPOSE exec -T api node -e "process.exit(0)" >/dev/null 2>&1; then break; fi
  sleep 5
done

sleep 10
$COMPOSE exec -T api node dist/seed.js
$COMPOSE ps --format "{{.Service}} {{.State}}"
