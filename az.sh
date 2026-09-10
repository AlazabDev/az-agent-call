#!/usr/bin/env bash
# ==============================================================================
# Alazab Agent Call Center Gateway (az-agent-call source / az-agent-call deployment)
# Domain: mcp.alazab.com | Port: 3300 | Manager: pnpm
#
# NOTE: scripts/ops/deploy.sh, scripts/ops/nginx-setup.sh and
# scripts/ops/healthcheck.sh are leftover from an earlier iteration of this
# project that targeted a different domain/port (daftra.alazab.com:3400).
# They are kept in the repository untouched, but this controller intentionally
# does NOT call them anymore so that `./az.sh deploy|nginx|healthcheck` always
# operates on the current, documented production target (mcp.alazab.com:3300),
# matching README.md, AUDIT.md and deploy/install-production.sh.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

COMMAND="${1:-help}"

case "$COMMAND" in
    install)
        bash scripts/ops/install.sh "${@:2}"
        ;;
    build)
        bash scripts/ops/build.sh "${@:2}"
        ;;
    deploy)
        # First-time production install (builds image, waits for health/readiness,
        # verifies SMTP for all agents, installs Nginx + TLS). Must run as root
        # on the target server with .env.production already filled in.
        bash deploy/install-production.sh "${@:2}"
        ;;
    update)
        # Redeploy an existing installation after a code/config change.
        bash deploy/update-production.sh "${@:2}"
        ;;
    fix)
        bash scripts/ops/fix.sh "${@:2}"
        ;;
    healthcheck|health|status|verify)
        bash deploy/verify-production.sh "${@:2}"
        ;;
    logs)
        docker compose logs -f --tail=100 || true
        ;;
    help|*)
        echo "================================================================="
        echo "  Az Agent Call Center Gateway (az.sh Controller) — mcp.alazab.com:3300 "
        echo "================================================================="
        echo "Usage: ./az.sh [command]"
        echo ""
        echo "Commands:"
        echo "  install      Install all project dependencies using pnpm"
        echo "  build        Validate 144 templates & compile production bundle"
        echo "  deploy       First-time production install (deploy/install-production.sh)"
        echo "  update       Redeploy an existing installation (deploy/update-production.sh)"
        echo "  fix          Run diagnostic checks, typecheck, and re-verify project"
        echo "  healthcheck  Verify health/readiness/nginx/TLS (deploy/verify-production.sh)"
        echo "  logs         Tail live container logs"
        echo "  help         Display this help message"
        echo "================================================================="
        ;;
esac
