#!/usr/bin/env bash
set -Eeuo pipefail
APP_DIR="${APP_DIR:-/var/www/apps/az-agent-call}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.production}"
[[ $EUID -eq 0 ]] || { echo "Run as root" >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE" >&2; exit 1; }
chmod 0600 "$ENV_FILE"
cd "$APP_DIR"
docker compose --env-file "$ENV_FILE" build --pull
docker compose --env-file "$ENV_FILE" up -d --remove-orphans
for _ in $(seq 1 30); do
  curl -fsS http://127.0.0.1:3300/healthz >/dev/null && break
  sleep 2
done
curl -fsS http://127.0.0.1:3300/healthz | python3 -m json.tool || {
  docker compose --env-file "$ENV_FILE" logs --tail=200 az-agent-call >&2 || true
  exit 1
}
for _ in $(seq 1 45); do
  curl -fsS http://127.0.0.1:3300/readyz >/dev/null && break
  sleep 2
done
curl -fsS http://127.0.0.1:3300/readyz | python3 -m json.tool || {
  docker compose --env-file "$ENV_FILE" logs --tail=200 az-agent-call >&2 || true
  exit 1
}
docker compose --env-file "$ENV_FILE" exec -T az-agent-call node dist-server/scripts/verify-smtp.js
nginx -t
systemctl reload nginx
