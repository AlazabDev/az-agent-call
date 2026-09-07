#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ENDPOINT="${FOUNDRY_PROJECT_ENDPOINT:-https://az-ai-resource.services.ai.azure.com/api/projects/az-ai-gateway}"
CONNECTION_NAME="${FOUNDRY_CONNECTION_NAME:-az-agent-call-backend}"
TOOLBOX_NAME="${FOUNDRY_TOOLBOX_NAME:-az-agent-call}"
MCP_URL="${FOUNDRY_MCP_URL:-https://mcp.alazab.com/call}"
TOKEN_FILE="${AGENT_TOKENS_PATH_HOST:-/var/lib/az-agent-call/data/agent-tokens.json}"
AGENT_ID="${FOUNDRY_AGENT_ID:-backend}"

command -v azd >/dev/null 2>&1 || { echo "ERROR: Azure Developer CLI (azd) is required." >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "ERROR: python3 is required." >&2; exit 1; }
[[ -f "$TOKEN_FILE" ]] || { echo "ERROR: Token store not found: $TOKEN_FILE" >&2; exit 1; }

TOKEN="$(python3 - "$TOKEN_FILE" "$AGENT_ID" <<'PY'
import json,sys
path,agent=sys.argv[1:3]
with open(path, encoding='utf-8') as f:
    value=json.load(f).get(agent)
if not value:
    raise SystemExit(f"Agent token not found: {agent}")
print(value)
PY
)"

azd ai project set "$PROJECT_ENDPOINT" --no-prompt
azd ai connection create "$CONNECTION_NAME" \
  --kind remote-tool \
  --target "$MCP_URL" \
  --auth-type custom-keys \
  --custom-key "Authorization=Bearer $TOKEN" \
  --force \
  --no-prompt

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
cat > "$TMP" <<YAML
description: Alazab Agent Call Center MCP tools for the ${AGENT_ID} agent identity.
connections:
  - name: ${CONNECTION_NAME}
YAML

# Creating the toolbox may create a new version if the name already exists,
# depending on the installed Foundry CLI version.
azd ai toolbox create "$TOOLBOX_NAME" --from-file "$TMP" --no-prompt

echo
echo "Foundry project:    $PROJECT_ENDPOINT"
echo "MCP target:         $MCP_URL"
echo "Connection:         $CONNECTION_NAME"
echo "Toolbox:            $TOOLBOX_NAME"
echo "Agent identity:     $AGENT_ID"
echo "Authentication:     Authorization: Bearer <token from persistent agent store>"
