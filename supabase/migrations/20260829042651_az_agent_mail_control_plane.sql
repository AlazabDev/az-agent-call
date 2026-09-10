begin;

create extension if not exists pgcrypto;

create table if not exists public.call_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('operator','viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.call_agents (
  id text primary key,
  foundry_id text not null unique,
  mailbox text not null unique,
  enabled boolean not null default true,
  token_hash text unique,
  token_hint text,
  token_rotated_at timestamptz,
  smtp_password_env text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint call_agents_id_check check (id in (
    'backend','azabot','auth','prod','maint','core','bim','finance','payments','copilot','project','vision'
  )),
  constraint call_agents_token_hash_check check (token_hash is null or token_hash ~ '^[0-9a-f]{64}$')
);

create table if not exists public.call_templates (
  id text primary key,
  system text not null,
  agent_id text not null references public.call_agents(id) on update cascade on delete restrict,
  name text not null,
  subject text not null,
  preheader text not null default '',
  locale text not null default 'ar',
  version integer not null default 1 check (version > 0),
  html text not null,
  text_body text not null,
  required jsonb not null default '[]'::jsonb,
  optional jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint call_templates_agent_system_check check (agent_id = system),
  constraint call_templates_required_array_check check (jsonb_typeof(required) = 'array'),
  constraint call_templates_optional_array_check check (jsonb_typeof(optional) = 'array'),
  constraint call_templates_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null references public.call_agents(id) on update cascade on delete restrict,
  sender_mailbox text not null,
  recipient text not null,
  subject text not null,
  status text not null check (status in ('success','failed')),
  source text not null check (source in ('raw','template','admin-test')),
  template_id text references public.call_templates(id) on update cascade on delete set null,
  message_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.call_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists call_templates_agent_idx on public.call_templates(agent_id, enabled);
create index if not exists call_logs_agent_created_idx on public.call_logs(agent_id, created_at desc);
create index if not exists call_logs_status_created_idx on public.call_logs(status, created_at desc);
create index if not exists call_logs_template_created_idx on public.call_logs(template_id, created_at desc) where template_id is not null;

create or replace view public.call_agent_stats
with (security_invoker = true)
as
select
  agent_id,
  count(*) filter (where status = 'success')::bigint as sent_count,
  max(created_at) filter (where status = 'success') as last_sent_at,
  count(*) filter (where status = 'failed')::bigint as failed_count
from public.call_logs
group by agent_id;

create or replace function public.set_call_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists call_admins_updated_at on public.call_admins;
create trigger call_admins_updated_at before update on public.call_admins
for each row execute function public.set_call_updated_at();

drop trigger if exists call_agents_updated_at on public.call_agents;
create trigger call_agents_updated_at before update on public.call_agents
for each row execute function public.set_call_updated_at();

drop trigger if exists call_templates_updated_at on public.call_templates;
create trigger call_templates_updated_at before update on public.call_templates
for each row execute function public.set_call_updated_at();

drop trigger if exists call_settings_updated_at on public.call_settings;
create trigger call_settings_updated_at before update on public.call_settings
for each row execute function public.set_call_updated_at();

insert into public.call_agents (id, foundry_id, mailbox, smtp_password_env)
values
  ('backend',  'az-agent-backend',  'agent-backend@alazab.com',  'MAILBOX_PASSWORD_BACKEND'),
  ('azabot',   'az-agent-azabot',   'agent-azabot@alazab.com',   'MAILBOX_PASSWORD_AZABOT'),
  ('auth',     'az-agent-auth',     'agent-auth@alazab.com',     'MAILBOX_PASSWORD_AUTH'),
  ('prod',     'az-agent-prod',     'agent-prod@alazab.com',     'MAILBOX_PASSWORD_PROD'),
  ('maint',    'az-agent-maint',    'agent-maint@alazab.com',    'MAILBOX_PASSWORD_MAINT'),
  ('core',     'az-agent-core',     'agent-core@alazab.com',     'MAILBOX_PASSWORD_CORE'),
  ('bim',      'az-agent-bim',      'agent-bim@alazab.com',      'MAILBOX_PASSWORD_BIM'),
  ('finance',  'az-agent-finance',  'agent-finance@alazab.com',  'MAILBOX_PASSWORD_FINANCE'),
  ('payments', 'az-agent-payments', 'agent-payments@alazab.com', 'MAILBOX_PASSWORD_PAYMENTS'),
  ('copilot',  'az-agent-copilot',  'agent-copilot@alazab.com',  'MAILBOX_PASSWORD_COPILOT'),
  ('project',  'az-agent-project',  'agent-project@alazab.com',  'MAILBOX_PASSWORD_PROJECT'),
  ('vision',   'az-agent-vision',   'agent-vision@alazab.com',   'MAILBOX_PASSWORD_VISION')
on conflict (id) do update set
  foundry_id = excluded.foundry_id,
  mailbox = excluded.mailbox,
  smtp_password_env = excluded.smtp_password_env,
  updated_at = now();

insert into public.call_settings (key, value)
values
  ('brand', '{"company_name":"شركة العزب","website":"https://alazab.com"}'::jsonb),
  ('runtime', '{"expected_agents":12,"expected_templates":144,"supabase_project_ref":"bxuhcbfdoaflsgbxiqei"}'::jsonb),
  ('integration', '{"app_slug":"agent-call","public_app_url":"https://mcp.alazab.com","mcp_path":"/mail"}'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

insert into public.sso_apps (
  slug, name_ar, name_en, description_ar, description_en,
  base_url, redirect_url, color, allowed_roles, is_active, is_default, sort_order
)
values (
  'agent-call', 'بريد وكلاء العزب', 'Az Agent Call Center',
  'لوحة التحكم والبنية التشغيلية لبريد وكلاء الذكاء الاصطناعي.',
  'Control plane and MCP mail gateway for Alazab AI agents.',
  'https://mcp.alazab.com', 'https://mcp.alazab.com', '#030957',
  array['platform_owner','platform_admin']::text[], true, false, 80
)
on conflict (slug) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  description_ar = excluded.description_ar,
  description_en = excluded.description_en,
  base_url = excluded.base_url,
  redirect_url = excluded.redirect_url,
  color = excluded.color,
  allowed_roles = excluded.allowed_roles,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

alter table public.call_admins enable row level security;
alter table public.call_agents enable row level security;
alter table public.call_templates enable row level security;
alter table public.call_logs enable row level security;
alter table public.call_settings enable row level security;

revoke all on public.call_admins, public.call_agents, public.call_templates, public.call_logs, public.call_settings from anon;
revoke insert, update, delete, truncate, references, trigger on public.call_admins, public.call_agents, public.call_templates, public.call_logs, public.call_settings from authenticated;
grant select on public.call_admins, public.call_agents, public.call_templates, public.call_logs, public.call_settings to authenticated;

revoke all on public.call_agent_stats from anon, authenticated;
grant select on public.call_agent_stats to service_role;

commit;
