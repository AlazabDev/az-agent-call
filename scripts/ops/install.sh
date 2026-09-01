#!/usr/bin/env bash
set -euo pipefail

echo "[AZ-AGENT-CALL] Installing dependencies using pnpm..."
if ! command -v pnpm &> /dev/null; then
    echo "[AZ-AGENT-CALL] pnpm not found. Installing pnpm globally..."
    npm install -g pnpm@9.15.4
fi

pnpm install --no-frozen-lockfile
echo "[AZ-AGENT-CALL] ✅ Dependencies installed successfully via pnpm."
