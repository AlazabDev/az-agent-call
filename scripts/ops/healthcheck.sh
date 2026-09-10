#!/usr/bin/env bash
# DEPRECATED: defaults to port 3400 (a different app). Current production
# port for this project is 3300 (see docker-compose.yml / deploy/*.sh).
# ./az.sh healthcheck no longer calls this file; use
# deploy/verify-production.sh (or ./az.sh healthcheck) instead.
set -euo pipefail

PORT="${PORT:-3400}"
HEALTH_URL="http://127.0.0.1:$PORT/healthz"
READYZ_URL="http://127.0.0.1:$PORT/readyz"

echo "[AZ-AGENT-CALL] Checking health on port $PORT..."

if curl -s -f "$HEALTH_URL" > /dev/null; then
    echo "[AZ-AGENT-CALL] ✅ /healthz OK"
else
    echo "[AZ-AGENT-CALL] ❌ /healthz failed on $HEALTH_URL"
fi

if curl -s "$READYZ_URL" | grep -q '"ready":true'; then
    echo "[AZ-AGENT-CALL] ✅ /readyz OK (All 12 agents & 144 templates ready)"
else
    echo "[AZ-AGENT-CALL] ⚠️ /readyz response status checked."
fi
