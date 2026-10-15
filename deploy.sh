#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="drip-client-reseller"
HEALTH_URL="http://127.0.0.1:3102"

cd "$PROJECT_DIR"

echo "==> Deploy started for $APP_NAME (v1)"

if [[ ! -f package.json ]]; then
  echo "Error: package.json not found in $PROJECT_DIR"
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Error: .env missing. Copy .env.example and fill production secrets."
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "Error: pm2 is not installed. Install PM2 first."
  exit 1
fi

echo "==> Installing dependencies"
npm install

echo "==> Prisma client generate"
npm run db:generate

echo "==> Prisma schema push"
npm run db:push

echo "==> Building project"
npm run build

echo "==> Restarting PM2 app"
pm2 startOrRestart ecosystem.config.cjs --only "$APP_NAME" --update-env
pm2 save

echo "==> Health check"
sleep 2
if curl -sf -o /dev/null -w "%{http_code}" "$HEALTH_URL" | grep -qE '^(200|30[12])$'; then
  echo "OK: $HEALTH_URL responding"
else
  echo "WARN: $HEALTH_URL did not return 200/301/302 — check: pm2 logs $APP_NAME"
fi

echo "==> PM2 status"
pm2 status "$APP_NAME"

echo "==> Deploy completed successfully"
echo "    Public: https://dripclientofficial.dev"
echo "    APK:    https://dripclientofficial.dev/downloads/DRIP-CLIENT-OFFICIAL.apk"
