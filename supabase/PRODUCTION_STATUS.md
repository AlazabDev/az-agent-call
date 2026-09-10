# Production status — 2026-08-29

Supabase project: `alazab-db` (`bxuhcbfdoaflsgbxiqei`)

Verified during the v3 integration:

- Project binding: `bxuhcbfdoaflsgbxiqei`
- Canonical mail agents: 12
- Enabled agents: 12
- `call_agent_connections` rows: 12
- `call_gateway_instances`: runtime-populated by deployed Gateway heartbeat
- Template access policy: `global`, catalog size 144, ownership is recommendation metadata only
- `sso_apps.agent-call`: active and points to `https://mcp.alazab.com/admin/`
- `call_settings.runtime.supabase_project_ref`: `bxuhcbfdoaflsgbxiqei`
- Production migrations applied for Agent Call Center: 3
- Edge Function `agent-call-status`: ACTIVE, JWT verification enabled, version 3 at audit time

## Runtime-populated state

Before the first production Gateway start, `call_templates` can remain empty. Startup performs the authoritative Git-template synchronization and must produce 144 enabled rows before `/readyz` returns 200.

Clear Agent tokens are never stored in Supabase. The Gateway persists them in `AGENT_TOKENS_PATH` (`/app/data/agent-tokens.json`) and synchronizes only SHA-256 hashes/hints to `call_agents`.

The supplied `.env.production` contains all 12 per-agent Migadu password overrides provided for deployment. Those values are intentionally not duplicated in source code or documentation.

The production deployment is intentionally blocked by `/readyz` until all required runtime conditions are satisfied: 12 agents, 144 templates, 12 tokens, and SMTP configuration for all enabled agents.

## Re-verified production control-plane state before server deployment

At the final production gate, direct checks against `alazab-db` returned:

- `call_agents`: 12 / enabled 12
- `call_agent_connections`: 12
- `call_gateway_instances`: 0 before Gateway deployment (expected)
- enabled `call_templates`: 0 before first Gateway synchronization (expected)
- enabled Agents missing token hashes: 12 before first persistent token-store initialization (expected)
- `sso_apps.agent-call`: active, base/redirect `https://mcp.alazab.com/admin/`
- central roles: one `platform_owner` currently grants administrative access
- the three Agent Call Center migrations are present in `supabase_migrations.schema_migrations`
- `agent-call-status`: ACTIVE, version 3, JWT verification enabled
- Supabase Security Advisor reports no Agent-Mail-specific finding; remaining notices belong to pre-existing unrelated project objects.
