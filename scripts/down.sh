#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-ap-south-1}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT/infra"

echo "==> destroying every managed resource"
terraform destroy -auto-approve -input=false

echo
echo "==> confirming nothing is left billing"

leftovers=0

check() {
  local label="$1"
  local count="$2"

  if [ "$count" = "0" ] || [ -z "$count" ] || [ "$count" = "None" ]; then
    printf '    %-22s clear\n' "$label"
  else
    printf '    %-22s %s STILL PRESENT\n' "$label" "$count"
    leftovers=1
  fi
}

check "NAT gateways" "$(aws ec2 describe-nat-gateways --region "$REGION" \
  --filter 'Name=state,Values=available,pending' --query 'length(NatGateways)' --output text 2>/dev/null)"

check "Load balancers" "$(aws elbv2 describe-load-balancers --region "$REGION" \
  --query 'length(LoadBalancers)' --output text 2>/dev/null)"

check "RDS instances" "$(aws rds describe-db-instances --region "$REGION" \
  --query 'length(DBInstances)' --output text 2>/dev/null)"

check "Auto Scaling groups" "$(aws autoscaling describe-auto-scaling-groups --region "$REGION" \
  --query 'length(AutoScalingGroups)' --output text 2>/dev/null)"

check "CloudFront" "$(aws cloudfront list-distributions \
  --query 'length(DistributionList.Items)' --output text 2>/dev/null)"

check "Project instances" "$(aws ec2 describe-instances --region "$REGION" \
  --filters 'Name=tag:Project,Values=erp-portal' 'Name=instance-state-name,Values=running,pending,stopping,stopped' \
  --query 'length(Reservations[].Instances[])' --output text 2>/dev/null)"

check "Unassociated EIPs" "$(aws ec2 describe-addresses --region "$REGION" \
  --query 'length(Addresses[?AssociationId==null])' --output text 2>/dev/null)"

echo
if [ "$leftovers" -eq 0 ]; then
  echo "==> all clear, running cost is back to zero"
else
  echo "==> something survived, remove it before it accumulates charges" >&2
  exit 1
fi
