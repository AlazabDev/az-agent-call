#!/usr/bin/env bash
# ==============================================================================
# Alazab Agent Call Center (az-agent-call) — Central Control CLI
# Domain: daftra.alazab.com | Port: 3400 | Manager: pnpm
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
        bash scripts/ops/deploy.sh "${@:2}"
        ;;
    fix)
        bash scripts/ops/fix.sh "${@:2}"
        ;;
    healthcheck|health|status)
        bash scripts/ops/healthcheck.sh "${@:2}"
        ;;
    nginx|ssl)
        bash scripts/ops/nginx-setup.sh "${@:2}"
        ;;
    logs)
        docker compose logs -f --tail=100 || true
        ;;
    verify|check|validate)
        bash scripts/ops/verify-environment.sh "${@:2}"
       ;;
    agent|codex)
        echo "🤖 Codex Agent Commands:"
        echo "  ./az.sh agent status   - Check agent status"
        echo "  ./az.sh agent test     - Test agent connection"
        echo "  ./az.sh agent chat     - Open chat interface"
        ;;
    help|*)
        echo "================================================================="
        echo "  Az Agent Call — Alazab Agent Contact Center (az.sh Controller) "
        echo "================================================================="
        echo "Usage: ./az.sh [command]"
        echo ""
        echo "Commands:"
        echo "  install      Install all project dependencies using pnpm"
        echo "  build        Validate 144 voice templates & compile production bundle"
        echo "  deploy       Deploy container and services to production (daftra.alazab.com)"
        echo "  fix          Run diagnostic checks, fix types, and re-verify project"
        echo "  healthcheck  Check system readiness, /healthz, and /readyz endpoints"
        echo "  nginx        Install Nginx site config for daftra.alazab.com on port 3400"
        echo "  logs         Tail live container logs"
        echo "  agent        Codex Agent management commands"
        echo "  help         Display this help message"
        echo "================================================================="
        ;;
esac