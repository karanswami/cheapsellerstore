#!/usr/bin/env bash
# One-shot: nginx + Let's Encrypt for test.dripclientofficial.dev → :3104
# Usage: sudo bash setup-test-subdomain.sh
set -euo pipefail

SITE="test.dripclientofficial.dev"
APP_PORT="3104"
DEST="/etc/nginx/sites-available/${SITE}"
ENABLED="/etc/nginx/sites-enabled/${SITE}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run: sudo bash $0"
  exit 1
fi

cat >"${DEST}" <<NGINX
server {
    listen 80;
    server_name ${SITE};

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

ln -sfn "${DEST}" "${ENABLED}"
nginx -t
systemctl reload nginx

echo "==> Issuing SSL via Certbot for ${SITE}..."
certbot --nginx -d "${SITE}" \
  --non-interactive --agree-tos --redirect \
  --register-unsafely-without-email || true

nginx -t
systemctl reload nginx

echo "==> Done. Public: https://${SITE} → 127.0.0.1:${APP_PORT}"
