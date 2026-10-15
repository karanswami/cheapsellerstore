#!/usr/bin/env bash
# Drip-only deposit cron poll (expire + Binance/QRIS/MGCloudPay/Cashfree recheck).
# VPS production uses /home/kscoder/scripts/cron-deposits.sh (multi-app).
# Manual / single-app:
#   * * * * * /home/kscoder/dripclientofficial.dev/scripts/cron-deposits-poll.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "CRON_SECRET is empty in .env" >&2
  exit 1
fi

curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "http://127.0.0.1:3102/api/cron/deposits/poll"
echo
