# Az Agent Call Center v3.1.0 — Production Audit

Date: 2026-09-06

## Project identity

The production service is **Az Agent Call Center** (`az-agent-call`): the operational contact center for Alazab agents. Daftra, WhatsApp, MagicPlan, UberFix, SMTP and telephony are integrations of the call center; none of them defines the project by itself.

Historical Supabase `mail_*` tables, the `agent-mail` SSO slug, and the `agent-mail-status` Edge Function are retained as compatibility identifiers. They are not renamed destructively.

## Source preservation

- Original ZIP file entries: **704**.
- Original files missing from the production working tree: **0**.
- No original project file was deleted.
- Production-only files/migrations were added where required.

## MCP / Azure Foundry

- Primary remote MCP URL: `https://mcp.alazab.com/call`.
- Conventional alias: `https://mcp.alazab.com/mcp`.
- Legacy compatibility alias: `https://mcp.alazab.com/mail`.
- Runtime uses the MCP TypeScript SDK Streamable HTTP transport in stateless mode.
- Bearer authentication resolves each request to one of the 12 agent identities.
- Production verification runs a real MCP `initialize` followed by `tools/list` using the backend-agent token and requires `whoami`, `daftra_search_entities`, and `daftra_create_smart_purchase_invoice`.

## Daftra

- Base URL joining was corrected to prevent duplicate `/api2/api2/...` paths.
- Sales invoice, purchase order, purchase invoice, payment and expense payloads were aligned to the bundled Daftra OpenAPI.
- Purchase invoice MCP tools were added, including smart supplier/project/product entity resolution.
- Entity resolution is used before write operations instead of guessing Daftra integer IDs.

## Telephony / integrations

- Telephony is implemented through real Twilio Programmable Voice REST when `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` and `TWILIO_VOICE_URL` are configured.
- Missing telephony configuration returns an explicit error rather than a synthetic queued call.
- UberFix and MagicPlan connectors no longer return mock-success responses when credentials are absent.
- Docker Compose now passes Daftra, WhatsApp/Meta, UberFix, MagicPlan and Twilio variables into the runtime container.

## Deployment

- Host path: `/var/www/apps/az-agent-call`.
- Persistent runtime data: `/var/lib/az-agent-call/data`.
- Container/image identity: `az-agent-call:3.1.0`.
- Port `3300` binds to localhost only; Nginx owns public TLS ingress.
- Container root filesystem is read-only, `/tmp` is tmpfs, Linux capabilities are dropped and `no-new-privileges` is enabled.
- Installer builds first and does not install/reload Nginx until health, readiness and MCP verification succeed.
- SMTP verification is optional for core MCP/Call Center readiness.

## Static verification performed in construction environment

- TypeScript/TSX syntax parse: **179 files, 0 syntax errors** (legacy tests excluded by production tsconfig).
- Relative imports: **236 checked, 0 missing**.
- Docker Compose YAML parse: **OK**.
- Docker Compose environment references: **all represented in `.env.production`**.
- Bash deployment scripts: **all pass `bash -n`**.
- Daftra routes/methods used by the runtime were checked against `openapi/daftra/daftra_module_openapi.json`.

## Build limitation in construction environment

A full dependency-resolved PNPM/Vite build could not be executed here because this runtime cannot resolve `registry.npmjs.org` (`EAI_AGAIN`). This is not treated as a successful build. The production installer makes `docker compose build --pull` the first target-server gate; any install, TypeScript, template or Vite build failure stops deployment before Nginx is changed.
