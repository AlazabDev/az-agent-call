begin;

create schema if not exists call_private;
revoke all on schema call_private from public, anon;
grant usage on schema call_private to authenticated, service_role;

create or replace function call_private.effective_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when exists (
      select 1 from public.adp_user_roles
      where user_id = auth.uid() and role = 'platform_owner'::public.app_role
    ) then 'owner'
    when exists (
      select 1 from public.adp_user_roles
      where user_id = auth.uid() and role = 'platform_admin'::public.app_role
    ) then 'admin'
    else (
      select ma.role from public.call_admins ma
      where ma.user_id = auth.uid()
      limit 1
    )
  end;
$$;

create or replace function call_private.is_authorized()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select call_private.effective_role() is not null;
$$;

revoke all on function call_private.effective_role() from public, anon;
revoke all on function call_private.is_authorized() from public, anon;
grant execute on function call_private.effective_role() to authenticated, service_role;
grant execute on function call_private.is_authorized() to authenticated, service_role;

create policy call_admins_authorized_select on public.call_admins
for select to authenticated using (call_private.is_authorized());
create policy call_agents_authorized_select on public.call_agents
for select to authenticated using (call_private.is_authorized());
create policy call_templates_authorized_select on public.call_templates
for select to authenticated using (call_private.is_authorized());
create policy call_logs_authorized_select on public.call_logs
for select to authenticated using (call_private.is_authorized());
create policy call_settings_authorized_select on public.call_settings
for select to authenticated using (call_private.is_authorized());

commit;
