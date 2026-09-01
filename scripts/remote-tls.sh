set -euo pipefail
cd /opt/portal/app
HOST=__PORTAL_HOST__
STAGE=__STAGE__

docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v app_certbot-webroot:/var/www/certbot \
  certbot/certbot certonly --webroot -w /var/www/certbot -d "$HOST" \
  --agree-tos --register-unsafely-without-email --non-interactive

sed -i "s/PORTAL_HOST/$HOST/g" deploy/nginx-tls.conf

if [ "$STAGE" -ge 2 ]; then
  docker compose -f docker-compose.yml -f docker-compose.rds.yml -f docker-compose.tls.yml up -d api web
else
  docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d
fi
