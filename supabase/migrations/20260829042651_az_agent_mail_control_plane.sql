begin;

create extension if not exists pgcrypto;

create table if not exists public.mail_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('operator','viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mail_agents (
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
  constraint mail_agents_id_check check (id in (
    'backend','azabot','auth','prod','maint','core','bim','finance','payments','copilot','project','vision'
  )),
  constraint mail_agents_token_hash_check check (token_hash is null or token_hash ~ '^[0-9a-f]{64}$')
);

create table if not exists public.mail_templates (
  id text primary key,
  system text not null,
  agent_id text not null references public.mail_agents(id) on update cascade on delete restrict,
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
  constraint mail_templates_agent_system_check check (agent_id = system),
  constraint mail_templates_required_array_check check (jsonb_typeof(required) = 'array'),
  constraint mail_templates_optional_array_check check (jsonb_typeof(optional) = 'array'),
  constraint mail_templates_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.mail_send_log (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null references public.mail_agents(id) on update cascade on delete restrict,
  sender_mailbox text not null,
  recipient text not null,
  subject text not null,
  status text not null check (status in ('success','failed')),
  source text not null check (source in ('raw','template','admin-test')),
  template_id text references public.mail_templates(id) on update cascade on delete set null,
  message_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.mail_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists mail_templates_agent_idx on public.mail_templates(agent_id, enabled);
create index if not exists mail_send_log_agent_created_idx on public.mail_send_log(agent_id, created_at desc);
create index if not exists mail_send_log_status_created_idx on public.mail_send_log(status, created_at desc);
create index if not exists mail_send_log_template_created_idx on public.mail_send_log(template_id, created_at desc) where template_id is not null;

create or replace view public.mail_agent_stats
with (security_invoker = true)
as
select
  agent_id,
  count(*) filter (where status = 'success')::bigint as sent_count,
  max(created_at) filter (where status = 'success') as last_sent_at,
  count(*) filter (where status = 'failed')::bigint as failed_count
from public.mail_send_log
group by agent_id;

create or replace function public.set_mail_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mail_admins_updated_at on public.mail_admins;
create trigger mail_admins_updated_at before update on public.mail_admins
for each row execute function public.set_mail_updated_at();

drop trigger if exists mail_agents_updated_at on public.mail_agents;
create trigger mail_agents_updated_at before update on public.mail_agents
for each row execute function public.set_mail_updated_at();

drop trigger if exists mail_templates_updated_at on public.mail_templates;
create trigger mail_templates_updated_at before update on public.mail_templates
for each row execute function public.set_mail_updated_at();

drop trigger if exists mail_settings_updated_at on public.mail_settings;
create trigger mail_settings_updated_at before update on public.mail_settings
for each row execute function public.set_mail_updated_at();

insert into public.mail_agents (id, foundry_id, mailbox, smtp_password_env)
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

insert into public.mail_settings (key, value)
values
  ('brand', '{"company_name":"شركة العزب","website":"https://alazab.com"}'::jsonb),
  ('runtime', '{"expected_agents":12,"expected_templates":144,"supabase_project_ref":"bxuhcbfdoaflsgbxiqei"}'::jsonb),
  ('integration', '{"app_slug":"agent-mail","public_app_url":"https://mcp.alazab.com","mcp_path":"/mail"}'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

insert into public.sso_apps (
  slug, name_ar, name_en, description_ar, description_en,
  base_url, redirect_url, color, allowed_roles, is_active, is_default, sort_order
)
values (
  'agent-mail', 'بريد وكلاء العزب', 'Az Agent Mail',
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

alter table public.mail_admins enable row level security;
alter table public.mail_agents enable row level security;
alter table public.mail_templates enable row level security;
alter table public.mail_send_log enable row level security;
alter table public.mail_settings enable row level security;

revoke all on public.mail_admins, public.mail_agents, public.mail_templates, public.mail_send_log, public.mail_settings from anon;
revoke insert, update, delete, truncate, references, trigger on public.mail_admins, public.mail_agents, public.mail_templates, public.mail_send_log, public.mail_settings from authenticated;
grant select on public.mail_admins, public.mail_agents, public.mail_templates, public.mail_send_log, public.mail_settings to authenticated;

revoke all on public.mail_agent_stats from anon, authenticated;
grant select on public.mail_agent_stats to service_role;

commit;
