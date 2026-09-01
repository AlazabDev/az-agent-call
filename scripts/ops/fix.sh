#!/usr/bin/env bash
set -euo pipefail

echo "[AZ-AGENT-CALL] Running automated diagnostics & fix routine..."
echo "[1/3] Checking TypeScript types..."
pnpm run typecheck

echo "[2/3] Validating 144 voice templates..."
pnpm run validate:templates

echo "[3/3] Testing build pipeline..."
pnpm run build

echo "[AZ-AGENT-CALL] ✅ All diagnostic checks and fixes passed cleanly."
