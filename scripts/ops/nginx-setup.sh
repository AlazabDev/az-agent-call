#!/usr/bin/env bash
set -euo pipefail

DOMAIN="daftra.alazab.com"
CONF_SRC="deploy/daftra.alazab.com"
CONF_DEST="/etc/nginx/sites-available/$DOMAIN"
LINK_DEST="/etc/nginx/sites-enabled/$DOMAIN"

echo "[AZ-AGENT-CALL] Installing Nginx configuration for $DOMAIN..."

if [ ! -f "$CONF_SRC" ]; then
    echo "[AZ-AGENT-CALL] ❌ Configuration file $CONF_SRC not found!"
    exit 1
fi

sudo cp "$CONF_SRC" "$CONF_DEST"
sudo ln -sf "$CONF_DEST" "$LINK_DEST"

echo "[AZ-AGENT-CALL] Testing Nginx syntax..."
sudo nginx -t

echo "[AZ-AGENT-CALL] Reloading Nginx..."
sudo systemctl reload nginx

echo "[AZ-AGENT-CALL] ✅ Nginx configured for $DOMAIN."
echo "[AZ-AGENT-CALL] 🔐 To issue and automatically install SSL certificate via Certbot, run:"
echo "                sudo certbot --nginx -d $DOMAIN"
