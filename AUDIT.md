# Az Agent Call Center v3.0.1 — Final Production Gate

Date: 2026-08-29

## Artifact/source verification

- Production source file count: **567**.
- Executable TypeScript/TSX files checked: **101**.
- TypeScript 5.8.3 syntax transpilation errors: **0**.
- Local imports checked: **374**; missing local imports: **0**.
- External packages statically used: **52**; used-but-undeclared packages: **0**.
- Runtime `Daftra`/`daftra` references in `src`, `server`, `shared`: **0**.
- Supplied `src-temp` UI set restored under `src/components/ui`: **49/49 files, 49/49 byte-identical**.
- Page files: **18**; the previously abbreviated operational pages were rebuilt for Agent Call Center rather than Daftra.

## Template/MCP verification

- Template metadata: **144**.
- Template HTML: **144**.
- Template TXT: **144**.
- Missing triplets: **0**.
- Native/recommended-agent render test: **144/144 successful**.
- Cross-agent render through Agent `core`: **144/144 successful**.
- Effective template authorization policy: **global**; original ownership is recommendation metadata only.
- MCP tools verified present: `whoami`, `list_templates`, `get_template_schema`, `render_template`, `send_template_email`, `send_email`.
- `send_email` exposes `to`, optional `cc`/`bcc`, `subject`, `text`/`html`; it does **not** expose `from` or `replyTo`.
- Mailer forces `From` and `Reply-To` to the bearer-token Agent Call Centerbox server-side.
- Admin test-send now validates `to`/`cc`/`bcc` as email addresses and sanitizes the free-form Subject before SMTP.

## Authentication/security verification

- `/admin/`: Node HTTP Basic challenge using server-side `ADMIN_PASSWORD`, then Supabase email/password session and Alazab RBAC.
- `/api/*`: requires a valid Supabase bearer JWT and an effective `platform_owner`, `platform_admin`, delegated `operator`, or delegated `viewer` role according to route capability.
- Agent MCP identity: clear bearer token from the persistent token store; Supabase stores only SHA-256 hash/hint.
- Token store file mode: `0600`.
- Normal Gateway restart no longer changes `token_rotated_at`; only generated/explicitly rotated credentials update the rotation timestamp.
- Production mailbox/admin credential literals are isolated to `.env.production`; exact-value scan found **0 copies** elsewhere in source/docs.
- `.dockerignore` excludes `.env`/`.env.*`; production secrets are not copied into the Docker image.
- Public `/healthz` is minimal. Nginx blocks public `/readyz` with 403; detailed readiness remains local at `127.0.0.1:3300`.
- Nginx adds HSTS, X-Frame-Options DENY, no-referrer, and nosniff headers.

## Docker/Nginx/deployment verification

- `docker-compose.yml`: YAML parse successful.
- Container bind: `127.0.0.1:3300:3300` only.
- Container root filesystem: read-only; `/tmp` uses tmpfs; Linux capabilities dropped; no-new-privileges enabled.
- Persistent token data: `/var/lib/az-agent-call/data:/app/data`.
- Docker build resolves dependencies once in the build stage, runs the real project build, prunes dev dependencies, then copies the same production `node_modules` into runtime.
- Bash syntax: `install-production.sh`, `update-production.sh`, `verify-production.sh` all pass `bash -n`.
- Nginx config: real `nginx -t` passed in the construction environment. The `listen ... http2` syntax is deliberately retained for Ubuntu 24.04 stock Nginx 1.24 compatibility; newer Nginx versions may emit a deprecation warning but accept it.
- Production installer rejects empty/placeholder critical secrets, requires all 12 mailbox overrides, validates TLS files, waits for health/readiness, performs **one-shot real Migadu SMTP AUTH verification for all 12 Agents**, then installs Nginx with backup/validation and verifies the local TLS reverse-proxy path.
- Production archive layout is root-flat so it can be extracted directly into `/var/www/apps/az-agent-call` without an extra nested directory.

## Supabase production verification

Direct checks against `alazab-db` (`bxuhcbfdoaflsgbxiqei`) confirmed:

- Agent Call Center migrations present:
  1. `20260829042651_az_agent_call_control_plane`
  2. `20260829042848_harden_az_agent_call_rls`
  3. `20260829065236_extend_agent_call_runtime_status`
- Canonical Agents: **12**, enabled: **12**.
- `call_agent_connections`: **12** rows.
- `sso_apps.agent-call`: active and points to `https://mcp.alazab.com/admin/`.
- `call_settings.runtime.supabase_project_ref`: correct production ref.
- `call_settings.template_access`: `scope=global`, `catalog_size=144`, `ownership=recommended_only`.
- Edge Function `agent-call-status`: **ACTIVE**, **version 3**, `verify_jwt=true`.
- Central access currently includes one `platform_owner`.
- RLS SELECT policies exist for all Agent Call Center public tables using `call_private.is_authorized()`.
- Supabase Security Advisor reports no Agent-Mail-specific warning. Remaining advisor notices are pre-existing unrelated project objects and were not modified by this deployment.

### Expected pre-start database state

Before the first Gateway starts, live production currently has:

- enabled `call_templates`: **0** — expected; startup syncs the Git catalog to 144.
- enabled Agents missing token hashes: **12** — expected; first persistent token-store initialization creates/loads tokens and synchronizes hashes.
- `call_gateway_instances`: **0** — expected; first Gateway heartbeat creates the runtime row.

The installer will not expose Nginx until local `/readyz` reports the required 12 Agents, 144 templates, 12 loaded tokens, and SMTP configuration, and then the one-shot SMTP verifier must authenticate all 12 mailboxes.

## External blocker before target-server start

`SUPABASE_SERVICE_ROLE_KEY` is intentionally **empty** in `.env.production` because the available management connector does not expose that secret. The production installer rejects startup until a real server-side value is supplied.

The 12 mailbox passwords and `ADMIN_PASSWORD` are already populated in `.env.production` as supplied for this deployment; their values are intentionally omitted from this report.

## Full dependency build limitation here

The construction runtime cannot reach the npm registry reliably and Docker CLI is unavailable, so a complete dependency-resolved Vite/Docker build cannot honestly be claimed in this environment. This is intentionally moved into the target-server gate: `docker compose build --pull` runs `npm install`, template validation, Vite build, and server TypeScript compilation. Any dependency/type/build error stops deployment before Nginx changes.
