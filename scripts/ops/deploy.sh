#!/usr/bin/env bash
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
