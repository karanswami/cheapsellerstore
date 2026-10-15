#!/usr/bin/env bash
# Fresh VPS / one-shot ops setup for Drip Client Official:
#   nginx reverse proxy (primary + legacy) · Let's Encrypt SSL · GitHub SSH remote
# Usage: sudo bash setup.sh
set -euo pipefail

SITE="dripclientofficial.dev"
WWW="www.dripclientofficial.dev"
LEGACY_SITE="drip-client.gurugaminghub.store"
APP_PORT="3102"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_SSH_REMOTE="git@github.com:karanswami/dripclientofficial.dev.git"
APP_USER="${SUDO_USER:-kscoder}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run: sudo bash $0"
  exit 1
fi

if ! id "$APP_USER" >/dev/null 2>&1; then
  echo "Error: app user '$APP_USER' does not exist"
  exit 1
fi

APP_HOME="$(getent passwd "$APP_USER" | cut -d: -f6)"

write_proxy_site() {
  local name="$1"
  local server_names="$2"
  local dest="/etc/nginx/sites-available/${name}"
  local enabled="/etc/nginx/sites-enabled/${name}"

  cat >"${dest}" <<EOF
server {
    listen 80;
    server_name ${server_names};

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
EOF

  ln -sfn "${dest}" "${enabled}"
}

echo "==> Installing nginx + certbot + openssh-client (if needed)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx openssh-client

echo "==> Writing nginx sites (${SITE} + ${LEGACY_SITE}) → :${APP_PORT}..."
write_proxy_site "$SITE" "${SITE} ${WWW} *.${SITE}"
write_proxy_site "$LEGACY_SITE" "${LEGACY_SITE}"

echo "==> Testing & reloading nginx..."
nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo "==> Issuing / renewing SSL via Certbot..."
certbot --nginx -d "${SITE}" -d "${WWW}" \
  --non-interactive --agree-tos --redirect \
  --register-unsafely-without-email || true

certbot --nginx -d "${LEGACY_SITE}" \
  --non-interactive --agree-tos --redirect \
  --register-unsafely-without-email || true

nginx -t
systemctl reload nginx

echo "==> Ensuring GitHub SSH for user ${APP_USER}..."
install -d -m 700 -o "$APP_USER" -g "$APP_USER" "${APP_HOME}/.ssh"

if [[ ! -f "${APP_HOME}/.ssh/id_ed25519" ]]; then
  echo "==> Generating ed25519 key for ${APP_USER}..."
  sudo -u "$APP_USER" ssh-keygen -t ed25519 -N "" -C "${APP_USER}@${SITE}" \
    -f "${APP_HOME}/.ssh/id_ed25519"
fi

# Pin GitHub host keys (idempotent)
TMP_KH="$(mktemp)"
ssh-keyscan -t ed25519,rsa github.com 2>/dev/null >"$TMP_KH" || true
if [[ -s "$TMP_KH" ]]; then
  touch "${APP_HOME}/.ssh/known_hosts"
  chown "$APP_USER:$APP_USER" "${APP_HOME}/.ssh/known_hosts"
  chmod 600 "${APP_HOME}/.ssh/known_hosts"
  while IFS= read -r line; do
    host_key="$(echo "$line" | awk '{print $1" "$2" "$3}')"
    if ! grep -qF "$host_key" "${APP_HOME}/.ssh/known_hosts" 2>/dev/null; then
      echo "$line" >>"${APP_HOME}/.ssh/known_hosts"
    fi
  done <"$TMP_KH"
fi
rm -f "$TMP_KH"
chown -R "$APP_USER:$APP_USER" "${APP_HOME}/.ssh"
chmod 700 "${APP_HOME}/.ssh"
chmod 600 "${APP_HOME}/.ssh/id_ed25519" "${APP_HOME}/.ssh/known_hosts" 2>/dev/null || true
chmod 644 "${APP_HOME}/.ssh/id_ed25519.pub" 2>/dev/null || true

if [[ -d "${APP_DIR}/.git" ]]; then
  echo "==> Pointing git origin at SSH remote..."
  if sudo -u "$APP_USER" git -C "$APP_DIR" remote get-url origin >/dev/null 2>&1; then
    sudo -u "$APP_USER" git -C "$APP_DIR" remote set-url origin "$GIT_SSH_REMOTE"
  else
    sudo -u "$APP_USER" git -C "$APP_DIR" remote add origin "$GIT_SSH_REMOTE"
  fi
  sudo -u "$APP_USER" git -C "$APP_DIR" branch -M main 2>/dev/null || true
fi

echo ""
echo "OK: https://${SITE} (+ ${WWW}) → 127.0.0.1:${APP_PORT}"
echo "OK: https://${LEGACY_SITE} → 127.0.0.1:${APP_PORT}"
echo "OK: git origin → ${GIT_SSH_REMOTE}"
echo ""
echo "Add this deploy key to GitHub (Settings → Deploy keys / SSH keys) if not already:"
echo "-----"
cat "${APP_HOME}/.ssh/id_ed25519.pub"
echo "-----"
echo "Next: copy .env, then run ./deploy.sh as ${APP_USER}."
curl -skI --resolve "${SITE}:443:127.0.0.1" "https://${SITE}/" | head -15 || true
