#!/usr/bin/env bash
set -Eeuo pipefail
APP_DIR="${APP_DIR:-/var/www/apps/az-agent-call}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.production}"
DATA_DIR="${DATA_DIR:-/var/lib/az-agent-call/data}"
printf '\n=== container ===\n'
docker ps --filter name=az-agent-call --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
printf '\n=== health ===\n'
curl -fsS http://127.0.0.1:3300/healthz | python3 -m json.tool
printf '\n=== readiness (local only) ===\n'
curl -fsS http://127.0.0.1:3300/readyz | python3 -m json.tool
printf '\n=== MCP initialize + tools/list ===\n'
cd "$APP_DIR"
docker compose --env-file "$ENV_FILE" exec -T az-agent-call node dist-server/scripts/verify-mcp.js
printf '\n=== nginx ===\n'
nginx -t
printf '\n=== TLS reverse proxy ===\n'
curl -fsS --resolve mcp.alazab.com:443:127.0.0.1 https://mcp.alazab.com/healthz | python3 -m json.tool
printf '\n=== MCP unauthenticated challenge ===\n'
code="$(curl -sS -o /dev/null -w '%{http_code}' --resolve mcp.alazab.com:443:127.0.0.1 -H 'Accept: application/json, text/event-stream' https://mcp.alazab.com/call)"
echo "HTTP $code"
[[ "$code" == "401" ]] || { echo "Expected /call without Bearer token to be 401" >&2; exit 1; }
printf '\n=== admin challenge ===\n'
admin_code="$(curl -sS -o /dev/null -w '%{http_code}' --resolve mcp.alazab.com:443:127.0.0.1 https://mcp.alazab.com/admin/)"
echo "HTTP $admin_code"
[[ "$admin_code" == "401" ]] || { echo "Expected unauthenticated /admin/ to be 401" >&2; exit 1; }
printf '\n=== public readiness must be blocked ===\n'
code="$(curl -sS -o /dev/null -w '%{http_code}' --resolve mcp.alazab.com:443:127.0.0.1 https://mcp.alazab.com/readyz)"
echo "HTTP $code"
[[ "$code" == "403" ]] || { echo "Expected public /readyz to be 403" >&2; exit 1; }
printf '\n=== agent token store ===\n'
stat "$DATA_DIR/agent-tokens.json"
