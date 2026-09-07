#!/usr/bin/env bash
set -Eeuo pipefail
TOKEN_FILE="${AGENT_TOKENS_PATH_HOST:-/var/lib/az-agent-call/data/agent-tokens.json}"
AGENT_ID="${1:-backend}"
[[ -f "$TOKEN_FILE" ]] || { echo "Missing token file: $TOKEN_FILE" >&2; exit 1; }
TOKEN="$(python3 - "$TOKEN_FILE" "$AGENT_ID" <<'PY'
import json,sys
p,agent=sys.argv[1:3]
t=json.load(open(p)).get(agent)
if not t: raise SystemExit(f"Token not found for {agent}")
print(t)
PY
)"
echo "FOUNDRY MCP URL: https://mcp.alazab.com/call"
echo "AGENT: $AGENT_ID"
echo "Authorization: Bearer $TOKEN"
