#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/apps/az-agent-call}"
DATA_DIR="${DATA_DIR:-/var/lib/az-agent-call/data}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.local}"
NGINX_SITE="/etc/nginx/sites-available/agent-call.alazab.com"
NGINX_ENABLED="/etc/nginx/sites-enabled/agent-call.alazab.com"
SERVICE_NAME="az-agent-call.service"
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME"

fail() { echo "ERROR: $*" >&2; exit 1; }
env_value() { sed -n "s/^$1=//p" "$ENV_FILE" | tail -n1 | sed 's/^"//;s/"$//'; }

[[ $EUID -eq 0 ]] || fail "Run as root"
for cmd in node npm nginx curl python3 install sed systemctl; do command -v "$cmd" >/dev/null || fail "$cmd is required"; done
[[ -d "$APP_DIR" ]] || fail "Application directory is missing: $APP_DIR"
[[ -f "$ENV_FILE" ]] || fail "Missing $ENV_FILE"
chmod 0600 "$ENV_FILE"

service_role="$(env_value SUPABASE_SERVICE_ROLE_KEY)"
admin_password="$(env_value ADMIN_PASSWORD)"
[[ -n "$service_role" && "$service_role" != "YOUR_SERVICE_ROLE_KEY" && "$service_role" != "CHANGE_ME" ]] || fail "Set a real SUPABASE_SERVICE_ROLE_KEY in $ENV_FILE"
[[ -n "$admin_password" && "$admin_password" != "CHANGE_ME" ]] || fail "Set a real ADMIN_PASSWORD in $ENV_FILE"

for id in BACKEND AZABOT AUTH PROD MAINT CORE BIM FINANCE PAYMENTS COPILOT PROJECT VISION; do
  value="$(env_value "MAILBOX_PASSWORD_${id}")"
  [[ -n "$value" ]] || fail "MAILBOX_PASSWORD_${id} is required for this production bundle"
done

[[ -f /etc/letsencrypt/live/agent-call.alazab.com/fullchain.pem ]] || fail "TLS certificate fullchain for agent-call.alazab.com is missing"
[[ -f /etc/letsencrypt/live/agent-call.alazab.com/privkey.pem ]] || fail "TLS private key for agent-call.alazab.com is missing"

install -d -m 0750 -o root -g root "$DATA_DIR"
cd "$APP_DIR"

echo "[1/7] Installing dependencies..."
if command -v pnpm >/dev/null; then
  pnpm install --prod=false
else
  npm install
fi

echo "[2/7] Building project..."
if command -v pnpm >/dev/null; then
  pnpm run build
else
  npm run build
fi

echo "[3/7] Setting up Systemd service..."
install -m 0644 "$APP_DIR/deploy/az-agent-call.service" "$SERVICE_FILE"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

echo "[4/7] Waiting for local health check..."
for _ in $(seq 1 30); do
  curl -fsS http://127.0.0.1:3300/healthz >/dev/null && break
  sleep 2
done
curl -fsS http://127.0.0.1:3300/healthz | python3 -m json.tool || {
  journalctl -u "$SERVICE_NAME" --no-pager -n 50 >&2 || true
  fail "Service failed health check"
}

echo "[5/7] Waiting for production readiness..."
for _ in $(seq 1 45); do
  curl -fsS http://127.0.0.1:3300/readyz >/dev/null && break
  sleep 2
done
if ! curl -fsS http://127.0.0.1:3300/readyz | python3 -m json.tool; then
  journalctl -u "$SERVICE_NAME" --no-pager -n 50 >&2 || true
  fail "Service failed readiness checks"
fi

echo "[6/7] Verifying all 12 Migadu SMTP credentials..."
export $(grep -v '^#' "$ENV_FILE" | xargs)
if ! node dist-server/scripts/verify-smtp.js; then
  fail "One or more Migadu SMTP credentials failed verification"
fi

echo "[7/7] Installing Nginx safely..."
backup=""
if [[ -f "$NGINX_SITE" ]]; then
  backup="${NGINX_SITE}.bak.$(date +%Y%m%d-%H%M%S)"
  cp -a "$NGINX_SITE" "$backup"
fi
install -m 0644 "$APP_DIR/deploy/agent-call.alazab.com" "$NGINX_SITE"
ln -sfn "$NGINX_SITE" "$NGINX_ENABLED"
if ! nginx -t; then
  echo "Nginx validation failed; rolling back site configuration." >&2
  if [[ -n "$backup" && -f "$backup" ]]; then
    cp -a "$backup" "$NGINX_SITE"
  else
    rm -f "$NGINX_SITE" "$NGINX_ENABLED"
  fi
  nginx -t || true
  fail "Nginx configuration rejected"
fi
systemctl reload nginx

# Validate the actual TLS reverse-proxy path locally without depending on public DNS propagation.
curl -fsS --resolve agent-call.alazab.com:443:127.0.0.1 https://agent-call.alazab.com/healthz | python3 -m json.tool >/dev/null
admin_code="$(curl -sS -o /dev/null -w '%{http_code}' --resolve agent-call.alazab.com:443:127.0.0.1 https://agent-call.alazab.com/admin/)"
[[ "$admin_code" == "401" ]] || fail "Expected unauthenticated /admin/ to return 401, got $admin_code"
ready_code="$(curl -sS -o /dev/null -w '%{http_code}' --resolve agent-call.alazab.com:443:127.0.0.1 https://agent-call.alazab.com/readyz)"
[[ "$ready_code" == "403" ]] || fail "Expected public /readyz to be blocked with 403, got $ready_code"

echo "[DONE] Deployment complete."
echo "Admin: https://agent-call.alazab.com/admin/"
echo "App:   https://agent-call.alazab.com/"
echo "Health: https://agent-call.alazab.com/healthz"
echo "Local readiness: http://127.0.0.1:3300/readyz"
