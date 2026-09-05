#!/usr/bin/env bash
set -euo pipefail

export PYTHONIOENCODING=utf-8

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

LIVE="$(terraform -chdir="$ROOT/infra" output -raw stage 2>/dev/null || echo none)"

if [ "$LIVE" != "4" ] && [ "${FORCE:-0}" != "1" ]; then
  echo "state says stage $LIVE is applied, not stage 4." >&2
  echo "run scripts/down${LIVE}.sh instead, or FORCE=1 scripts/down4.sh to destroy anyway." >&2
  exit 1
fi

exec "$ROOT/scripts/down.sh"
