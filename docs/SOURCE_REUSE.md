# Source reuse — corrected implementation

The supplied `src-temp.zip` is used as a real frontend architecture source, not merely as inspiration.

Reused directly:

- all 49 files under `components/ui/`;
- responsive and toast hooks;
- `lib/utils.ts`;
- `NavLink.tsx`;
- `MermaidDiagram.tsx`;
- SidebarProvider/AppSidebar/AppLayout composition pattern;
- protected-route and Supabase session pattern;
- complete page-oriented navigation architecture.

The original page slots were retained and repurposed rather than discarded:

- `Accounts` -> Migadu mailboxes/password sources;
- `Finance` -> delivery analytics;
- `Templates` -> full 144-template catalog/preview;
- `Flows` -> MCP tools/template policy;
- `FlowBuilder` -> admin free-form mail composer;
- `Projects` -> gateway/deployment runtime;
- `Clients` -> Foundry integration guide;
- `Maintenance` -> diagnostics;
- `Teams` -> authorized administrators;
- `Webhooks` -> MCP connection state/whoami indicators;
- `Inbox` -> send log;
- `Settings` -> Supabase/Gateway/Migadu/security configuration.

Daftra-specific clients/tools/business logic were not carried into the Mail runtime because they are unrelated to this application's domain. The frontend architecture around them was preserved and adapted.
