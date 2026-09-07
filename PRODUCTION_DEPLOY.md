# Az Agent Call Center — Production Deploy v3.1.0

## Canonical identity

- Service: `az-agent-call`
- Host path: `/var/www/apps/az-agent-call`
- Persistent data: `/var/lib/az-agent-call/data`
- Public host: `https://mcp.alazab.com`
- Primary MCP endpoint: `https://mcp.alazab.com/call`
- Conventional alias: `https://mcp.alazab.com/mcp`
- Legacy compatibility alias only: `https://mcp.alazab.com/mail`
- Admin: `https://mcp.alazab.com/admin/`

The project is the Alazab **Agent Call Center**. Existing Supabase `mail_*` table names and the `agent-mail-status` Edge Function are retained as database compatibility identifiers and are not the service identity.

## Production start

```bash
cd /var/www/apps/az-agent-call
chmod 600 .env.production
chmod +x deploy/*.sh
sudo ./deploy/install-production.sh
```

The installer builds the container, starts it, verifies `/healthz`, verifies `/readyz`, executes a real MCP `initialize` + `tools/list` using the backend-agent token, installs Nginx, validates TLS routing, and confirms that unauthenticated MCP requests are rejected.

## Verification

```bash
cd /var/www/apps/az-agent-call
sudo ./deploy/verify-production.sh
```

## Get the backend agent bearer token

```bash
sudo python3 - <<'PY'
import json
p='/var/lib/az-agent-call/data/agent-tokens.json'
print(json.load(open(p))['backend'])
PY
```

Use it in Microsoft Foundry as a Custom Keys project connection:

- Target: `https://mcp.alazab.com/call`
- Header name: `Authorization`
- Header value: `Bearer <backend-token>`

For the first successful Foundry connection, connect directly to `mcp.alazab.com/call`. Put APIM in front only after direct `initialize`/`tools/list` succeeds; this isolates APIM/upstream 502 problems from MCP application problems.

## Connect to Microsoft Foundry from a shell with `azd ai`

The project includes `deploy/connect-foundry.sh`. It reads the generated backend-agent bearer token from the persistent token store and creates a direct remote-tool connection to `https://mcp.alazab.com/call`, then creates the `az-agent-call` toolbox. Its default Foundry project endpoint is `https://az-ai-resource.services.ai.azure.com/api/projects/az-ai-gateway`.

```bash
./deploy/connect-foundry.sh
```

Use the direct MCP target first. The previous APIM route can be reintroduced only after the direct Foundry connection is proven healthy.
