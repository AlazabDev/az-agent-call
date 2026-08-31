# Az Agent Mail v3.0.1

Production control plane and MCP mail gateway for Alazab AI agents.

## Architecture

- **Admin UI:** React + Vite + TypeScript, restored on the full UI architecture supplied in `src-temp.zip` (49 shadcn/Radix components, sidebar layout, dialogs, tabs, tables, toasts, responsive hooks).
- **Human authentication:** `/admin/` is protected by HTTP Basic at the Node gateway, then Supabase Password Auth and Alazab central RBAC (`adp_user_roles`).
- **Agent authentication:** fixed bearer token per Foundry agent. Clear tokens are persisted in `/app/data/agent-tokens.json`; Supabase stores SHA-256 hashes/hints only.
- **MCP:** `POST https://mcp.alazab.com/mail`.
- **SMTP:** Migadu STARTTLS on `smtp.migadu.com:587`.
- **Data:** Supabase production project `alazab-db` (`bxuhcbfdoaflsgbxiqei`).
- **Templates:** 144 shared templates. Original agent ownership is now recommendation metadata only; every authenticated agent can list, render and send every template.

## MCP tools

### `whoami`
Returns the fixed agent identity, Foundry ID, mailbox, SMTP readiness, MCP endpoint, global template access and a connection-health timestamp. It also updates `mail_agent_connections.last_whoami_at`.

### `list_templates`
Returns the full 144-template catalog to every agent. Each item includes `recommendedAgent`; `recommended=true` marks templates originally designed for the calling agent.

### `get_template_schema`
Returns required/optional metadata for any template.

### `render_template`
Renders any template without sending.

### `send_template_email`
Sends any template from the global catalog. `From` and `Reply-To` are always forced to the bearer-token agent mailbox.

### `send_email`
Free-form `subject + text/html` send to one or more recipients. No `from` parameter exists.

## Production Supabase state

Applied migrations:

1. `20260829042651_az_agent_mail_control_plane`
2. `20260829042848_harden_az_agent_mail_rls`
3. `20260829065236_extend_agent_mail_runtime_status`

Production Edge Function:

- `agent-mail-status` — ACTIVE, JWT verification enabled. Version 3 verifies the caller JWT, then performs control-plane reads with the Edge Function server-side service role so status checks do not depend on end-user RLS visibility.

Runtime tables include:

- `mail_agents`
- `mail_templates`
- `mail_send_log`
- `mail_settings`
- `mail_admins`
- `mail_gateway_instances`
- `mail_agent_connections`
- `mail_agent_stats`

## Authentication model

### Admin

```text
/admin/
  -> HTTP Basic (any username, server-side ADMIN_PASSWORD)
  -> Supabase Auth email/password
  -> platform_owner | platform_admin | delegated operator/viewer
```

The HTTP Basic layer protects only `/admin/`. `/api/*` uses Supabase bearer JWT so Browser Basic credentials do not conflict with API authorization.

### Agents

```text
Foundry Agent
  -> Authorization: Bearer <agent token>
  -> /app/data/agent-tokens.json
  -> fixed Agent ID / Foundry ID / mailbox
  -> MCP tools
```

The clear token file is on a persistent Docker volume. It is created with 0600 permissions and missing agent tokens are generated on first start. Token hashes are synchronized to `mail_agents`. Normal Gateway restarts no longer modify `token_rotated_at`; that audit timestamp changes only for newly generated or explicitly rotated credentials.

## SMTP password resolution

Priority:

1. Per-agent environment override, such as `MAILBOX_PASSWORD_FINANCE`.
2. `MAILBOX_PASSWORD_PATTERN` using placeholders `{mailbox}`, `{local}`, `{domain}`. For compatibility with the original gateway, both `{mailbox}` and `{local}` mean the mailbox local part (for example `agent-finance`), not the full email address.

The supplied production environment contains the 12 per-agent Migadu overrides provided for this deployment. Secret values are kept only in `.env.production`; source files and documentation do not duplicate them. `MAILBOX_PASSWORD_PATTERN` remains a runtime fallback only.

## Deployment

Target path:

```text
/var/www/apps/az-agent-mail
```

Persistent data:

```text
/var/lib/az-agent-mail/data
```

### 1. Extract the production archive

The production ZIP is **root-flat**: `package.json`, `.env.production`, `Dockerfile`, etc. are stored at the archive root. Extract it directly into the application directory:

```bash
install -d -m 0750 /var/www/apps/az-agent-mail
unzip az-agent-mail-v3.0.1-production.zip -d /var/www/apps/az-agent-mail
cd /var/www/apps/az-agent-mail
```

After extraction, this must exist directly (with no extra nested `az-agent-mail-v3/` directory):

```bash
test -f /var/www/apps/az-agent-mail/package.json
```

### 2. Complete the one unavailable server secret

`.env.production` already contains the supplied Gateway/Migadu values and the real browser-safe Supabase production values. Fill:

```bash
nano .env.production
```

Required field not retrievable through the available Supabase management connector:

```text
SUPABASE_SERVICE_ROLE_KEY=
```

Do not expose this key to Vite or any `VITE_*` variable.

### 3. Install

The TLS certificate for `mcp.alazab.com` must already exist under `/etc/letsencrypt/live/mcp.alazab.com/`.

```bash
chmod +x deploy/*.sh
./deploy/install-production.sh
```

The script:

- validates Docker/Nginx/environment/TLS prerequisites and rejects placeholder secrets;
- requires all 12 per-agent Migadu credentials and the server-side Supabase service role key;
- creates the persistent token volume directory;
- builds the multi-stage Node image;
- starts the container on `127.0.0.1:3300` only;
- verifies `/healthz` and blocks until local `/readyz` succeeds;
- performs a **one-shot real SMTP AUTH verification for all 12 Migadu mailboxes** before exposing the service;
- backs up the existing Nginx site, validates the replacement, and rolls it back if `nginx -t` fails;
- reloads Nginx and verifies the local TLS reverse-proxy route.

### 4. Verify

```bash
./deploy/verify-production.sh
```

Expected endpoints:

```text
Public: https://mcp.alazab.com/admin/
Public: https://mcp.alazab.com/mail
Public: https://mcp.alazab.com/healthz
Local only: http://127.0.0.1:3300/readyz
```

The Nginx edge intentionally returns **403** for public `/readyz` so token-store paths and internal readiness details are not exposed to the Internet.

### 5. Agent tokens

On first successful startup, missing tokens are securely generated and saved to:

```text
/var/lib/az-agent-mail/data/agent-tokens.json
```

To inspect them on the server:

```bash
cat /var/lib/az-agent-mail/data/agent-tokens.json
```

Use the corresponding token in each Foundry MCP connection, then call `whoami`.

## Validation

Before deployment:

```bash
npm install
npm run validate
npm run build
```

The construction environment has no usable npm-registry connectivity, so a complete dependency-resolved Vite build cannot truthfully be completed there. The production Docker build performs the real `npm install`, template validation, Vite build and server TypeScript compilation on the target server. Static and runtime-independent validation performed before packaging is documented in `AUDIT.md`.

## Important

- Do **not** run `supabase db reset` against `alazab-db`.
- Do not place `SUPABASE_SERVICE_ROLE_KEY` in frontend code.
- Do not add a `from` input to MCP tools.
- Do not change template access back to per-agent authorization unless intentionally redesigning policy.
