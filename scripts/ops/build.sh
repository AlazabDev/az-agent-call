#!/usr/bin/env bash
set -euo pipefail

echo "[AZ-AGENT-CALL] Validating templates and building production bundle..."
pnpm run build
echo "[AZ-AGENT-CALL] ✅ Production build completed successfully."
