create table if not exists public.call_gateway_instances (
  instance_id text primary key,
  hostname text not null,
  version text not null,
  status text not null default 'starting' check (status in ('starting','ready','degraded','offline')),
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  smtp_host text not null,
  smtp_port integer not null,
  template_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.call_agent_connections (
  agent_id text primary key references public.call_agents(id) on delete cascade,
  connection_status text not null default 'offline' check (connection_status in ('offline','online','degraded')),
  gateway_instance_id text references public.call_gateway_instances(instance_id) on delete set null,
  last_seen_at timestamptz,
  last_whoami_at timestamptz,
  last_tool text,
  request_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists call_gateway_instances_last_seen_idx on public.call_gateway_instances(last_seen_at desc);
create index if not exists call_agent_connections_last_seen_idx on public.call_agent_connections(last_seen_at desc);
alter table public.call_gateway_instances enable row level security;
alter table public.call_agent_connections enable row level security;

drop policy if exists call_gateway_instances_authorized_select on public.call_gateway_instances;
create policy call_gateway_instances_authorized_select on public.call_gateway_instances for select to authenticated using (call_private.is_authorized());
drop policy if exists call_agent_connections_authorized_select on public.call_agent_connections;
create policy call_agent_connections_authorized_select on public.call_agent_connections for select to authenticated using (call_private.is_authorized());

grant select on public.call_gateway_instances, public.call_agent_connections to authenticated;
grant all on public.call_gateway_instances, public.call_agent_connections to service_role;

insert into public.call_agent_connections(agent_id)
select id from public.call_agents
on conflict (agent_id) do nothing;

insert into public.call_settings(key, value)
values
  ('auth', jsonb_build_object('mode','supabase_password','audience','administrators','project_ref','bxuhcbfdoaflsgbxiqei')),
  ('template_access', jsonb_build_object('scope','global','catalog_size',144,'ownership','recommended_only'))
on conflict (key) do update set value = excluded.value, updated_at = now();

update public.sso_apps
set base_url='https://mcp.alazab.com/admin/', redirect_url='https://mcp.alazab.com/admin/', updated_at=now()
where slug='agent-call';
