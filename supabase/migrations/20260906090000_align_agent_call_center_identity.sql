-- Align production-facing identity with Az Agent Call Center while preserving
-- legacy mail_* tables and the agent-call SSO slug for compatibility.
begin;

insert into public.call_settings (key, value)
values (
  'integration',
  jsonb_build_object(
    'app_slug', 'agent-call',
    'service_identity', 'az-agent-call',
    'display_name', 'Az Agent Call Center',
    'public_app_url', 'https://mcp.alazab.com',
    'mcp_path', '/call',
    'mcp_alias', '/mcp',
    'legacy_mcp_path', '/mail'
  )
)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

update public.sso_apps
set name_ar = 'مركز اتصال وكلاء العزب',
    name_en = 'Az Agent Call Center',
    description_ar = 'مركز الاتصال التشغيلي لوكلاء العزب وربط أدوات MCP والمكالمات والأنظمة المتكاملة.',
    description_en = 'Operational Agent Call Center for MCP tools, telephony, and integrated business systems.',
    base_url = 'https://mcp.alazab.com/admin/',
    redirect_url = 'https://mcp.alazab.com/admin/',
    updated_at = now()
where slug = 'agent-call';

commit;
