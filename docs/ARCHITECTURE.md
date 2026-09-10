# Architecture — Az Agent Call v3.0.1 (Alazab Agent Contact Center)

## Surfaces

### Administration

`/admin/` serves the React/Vite application under a dedicated base path. Express protects this path using Basic Auth. The React app then signs into Supabase with email/password and the Admin API validates the Supabase JWT and central Alazab roles.

### Admin API

`/api/*` is intentionally outside the Basic Auth path. It requires `Authorization: Bearer <Supabase access token>` and resolves roles server-side using `adp_user_roles` plus optional `call_admins` delegation.

### Central MCP Gateway

`POST /call` (and alias `POST /mail`) requires an agent bearer token. Tokens map server-side to fixed agent identity; tool arguments cannot override or forge identity parameters.

For full protocol specification, refer to [`docs/MCP_SPECIFICATION.md`](file:///f:/Dev/az-acc/az-agent-call/docs/MCP_SPECIFICATION.md).

## Identity Invariant

```text
agent token -> agent id -> foundry id -> extension / line identity
```

No user or tool input can override this mapping.

## Modular MCP Domains & Connectors

The MCP gateway assembles tools dynamically from modular connectors under `server/mcp/connectors/`:

1. **Telephony Connector (`telephony.ts`)**: `whoami`, `make_call`, `get_call_transcript`.
2. **Voice Script Templates Connector (`templates.ts`)**: `list_templates`, `get_template_schema`, `render_template`, `send_template_email`, `send_email`.
3. **Daftra Accounting Connector (`daftra.ts`)**: `daftra_get_client`, `daftra_create_invoice`, `daftra_list_invoices`, `daftra_record_payment`, `daftra_check_inventory`.

## Runtime Telemetry

- `call_gateway_instances` receives a 30-second heartbeat from each active gateway instance.
- `call_agent_connections` logs authenticated MCP traffic and tracks `last_whoami_at` execution.
- `call_logs` records every call dispatch, SMS, and template audit entry.
