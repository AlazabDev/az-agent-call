begin;

alter schema if exists call_private rename to call_private;

alter function if exists public.set_call_updated_at() rename to set_call_updated_at;

alter table if exists public.call_admins rename to call_admins;
alter table if exists public.call_agents rename to call_agents;
alter table if exists public.call_templates rename to call_templates;
alter table if exists public.call_logs rename to call_logs;
alter table if exists public.call_settings rename to call_settings;
alter table if exists public.call_gateway_instances rename to call_gateway_instances;
alter table if exists public.call_agent_connections rename to call_agent_connections;

drop view if exists public.call_agent_stats;
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
grant select on public.call_agent_stats to service_role;

alter trigger call_admins_updated_at on public.call_admins rename to call_admins_updated_at;
alter trigger call_agents_updated_at on public.call_agents rename to call_agents_updated_at;
alter trigger call_templates_updated_at on public.call_templates rename to call_templates_updated_at;
alter trigger call_settings_updated_at on public.call_settings rename to call_settings_updated_at;

update public.sso_apps 
set slug = 'agent-call',
    name_ar = 'مركز اتصال العزب',
    name_en = 'Az Agent Call Center',
    description_ar = 'لوحة التحكم والبنية التشغيلية لمركز اتصال وكلاء الذكاء الاصطناعي.',
    description_en = 'Control plane and MCP call center gateway for Alazab AI agents.',
    base_url = 'https://agent-call.alazab.com/admin/',
    redirect_url = 'https://agent-call.alazab.com/admin/'
where slug = 'agent-call';

commit;
