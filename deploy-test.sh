#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="drip-client-reseller-test"
HEALTH_URL="http://127.0.0.1:3105"
cd "$PROJECT_DIR"
echo "==> Deploy test → :3105 / https://test.dripclientofficial.dev"
npm install
npm run db:generate
npm run db:push
npm run build
pm2 startOrRestart ecosystem.config.cjs --only "$APP_NAME" --update-env
pm2 save
sleep 2
curl -sf -o /dev/null -w "health:%{http_code}\n" "$HEALTH_URL" || echo "WARN: health check failed"
pm2 status "$APP_NAME"
