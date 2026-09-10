#!/usr/bin/env bash
# DEPRECATED: this script targets daftra.alazab.com:3400, a different app/port
# than the current production target of this project (mcp.alazab.com:3300).
# ./az.sh deploy no longer calls this file; use deploy/install-production.sh
# (or ./az.sh deploy) instead. Kept only for reference/legacy use.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/apps/az-agent-call}"
DOMAIN="daftra.alazab.com"
PORT="3400"

echo "[AZ-AGENT-CALL] Deploying to $APP_DIR on $DOMAIN (Port: $PORT)..."

if [ -f "$APP_DIR/docker-compose.yml" ]; then
    cd "$APP_DIR"
    docker compose down --remove-orphans || true
    docker compose build --no-cache
    docker compose up -d
    echo "[AZ-AGENT-CALL] ✅ Docker container deployed on port $PORT."
else
    echo "[AZ-AGENT-CALL] Directory $APP_DIR or docker-compose.yml not found. Building locally..."
    pnpm run build
fi
