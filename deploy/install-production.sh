#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/apps/az-agent-mail}"
DATA_DIR="${DATA_DIR:-/var/lib/az-agent-mail/data}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.production}"
NGINX_SITE="/etc/nginx/sites-available/mcp.alazab.com"
NGINX_ENABLED="/etc/nginx/sites-enabled/mcp.alazab.com"

fail() { echo "ERROR: $*" >&2; exit 1; }
env_value() { sed -n "s/^$1=//p" "$ENV_FILE" | tail -n1 | sed 's/^"//;s/"$//'; }

[[ $EUID -eq 0 ]] || fail "Run as root"
for cmd in docker nginx curl python3 install sed; do command -v "$cmd" >/dev/null || fail "$cmd is required"; done
docker compose version >/dev/null || fail "Docker Compose v2 is required"
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

[[ -f /etc/letsencrypt/live/mcp.alazab.com/fullchain.pem ]] || fail "TLS certificate fullchain for mcp.alazab.com is missing"
[[ -f /etc/letsencrypt/live/mcp.alazab.com/privkey.pem ]] || fail "TLS private key for mcp.alazab.com is missing"

install -d -m 0750 -o 1000 -g 1000 "$DATA_DIR"
cd "$APP_DIR"

echo "[1/6] Building production image..."
docker compose --env-file "$ENV_FILE" build --pull

echo "[2/6] Starting gateway..."
docker compose --env-file "$ENV_FILE" up -d --remove-orphans

for _ in $(seq 1 30); do
  curl -fsS http://127.0.0.1:3300/healthz >/dev/null && break
  sleep 2
done
curl -fsS http://127.0.0.1:3300/healthz | python3 -m json.tool || {
  docker compose --env-file "$ENV_FILE" logs --tail=200 az-agent-mail >&2 || true
  fail "Gateway failed health check"
}

echo "[3/6] Waiting for production readiness..."
for _ in $(seq 1 45); do
  curl -fsS http://127.0.0.1:3300/readyz >/dev/null && break
  sleep 2
done
if ! curl -fsS http://127.0.0.1:3300/readyz | python3 -m json.tool; then
  docker compose --env-file "$ENV_FILE" logs --tail=200 az-agent-mail >&2 || true
  fail "Gateway failed readiness checks"
fi

echo "[4/6] Verifying all 12 Migadu SMTP credentials..."
if ! docker compose --env-file "$ENV_FILE" exec -T az-agent-mail node dist-server/scripts/verify-smtp.js; then
  docker compose --env-file "$ENV_FILE" logs --tail=120 az-agent-mail >&2 || true
  fail "One or more Migadu SMTP credentials failed verification"
fi

echo "[5/6] Installing Nginx safely..."
backup=""
if [[ -f "$NGINX_SITE" ]]; then
  backup="${NGINX_SITE}.bak.$(date +%Y%m%d-%H%M%S)"
  cp -a "$NGINX_SITE" "$backup"
fi
install -m 0644 "$APP_DIR/deploy/mcp.alazab.com" "$NGINX_SITE"
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
curl -fsS --resolve mcp.alazab.com:443:127.0.0.1 https://mcp.alazab.com/healthz | python3 -m json.tool >/dev/null
admin_code="$(curl -sS -o /dev/null -w '%{http_code}' --resolve mcp.alazab.com:443:127.0.0.1 https://mcp.alazab.com/admin/)"
[[ "$admin_code" == "401" ]] || fail "Expected unauthenticated /admin/ to return 401, got $admin_code"
ready_code="$(curl -sS -o /dev/null -w '%{http_code}' --resolve mcp.alazab.com:443:127.0.0.1 https://mcp.alazab.com/readyz)"
[[ "$ready_code" == "403" ]] || fail "Expected public /readyz to be blocked with 403, got $ready_code"

echo "[6/6] Deployment complete."
echo "Admin: https://mcp.alazab.com/admin/"
echo "MCP:   https://mcp.alazab.com/mail"
echo "Health: https://mcp.alazab.com/healthz"
echo "Local readiness: http://127.0.0.1:3300/readyz"
