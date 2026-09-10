# Migration from az-agent-call v1 to v3

## Token persistence

v3 preserves the clear Foundry bearer tokens in the gateway data volume instead of putting them in Supabase.

- Runtime path: `AGENT_TOKENS_PATH=/app/data/agent-tokens.json`.
- Production host mount: `/var/lib/az-agent-call/data:/app/data`.
- The clear token file is written atomically with mode `0600`.
- Supabase receives only `SHA-256` in `call_agents.token_hash` plus a short `token_hint`.
- Missing agent tokens are generated at first successful gateway startup.
- Token rotation updates the persistent file and the Supabase hash/hint together.

To preserve an existing v1 token file, copy it into the production data directory before the first v3 startup:

```bash
install -d -m 700 /var/lib/az-agent-call/data
install -m 600 /path/to/agent-tokens.json /var/lib/az-agent-call/data/agent-tokens.json
```

The legacy import helper remains available for environments that only need to synchronize hashes:

```bash
npm run import:legacy-tokens -- /path/to/agent-tokens.json
```

## Send logs

Legacy local send logs are replaced by `public.call_logs` in `alazab-db`.

## Admin application

The static v1 admin page is replaced with the full React/Vite architecture restored from the supplied `src-temp` application shell. `/admin/` has two distinct gates:

1. HTTP Basic Auth at the gateway/Nginx-facing application path.
2. Supabase email/password session with Alazab central roles (`platform_owner` / `platform_admin`) or optional delegated Mail roles.

## Templates

Template files remain version-controlled and are mirrored into `public.call_templates` at startup. All 144 templates are globally available to every authenticated Foundry agent. The original per-agent relationship is recommendation metadata only.
