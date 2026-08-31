begin;

create schema if not exists mail_private;
revoke all on schema mail_private from public, anon;
grant usage on schema mail_private to authenticated, service_role;

create or replace function mail_private.effective_role()
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
      select ma.role from public.mail_admins ma
      where ma.user_id = auth.uid()
      limit 1
    )
  end;
$$;

create or replace function mail_private.is_authorized()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select mail_private.effective_role() is not null;
$$;

revoke all on function mail_private.effective_role() from public, anon;
revoke all on function mail_private.is_authorized() from public, anon;
grant execute on function mail_private.effective_role() to authenticated, service_role;
grant execute on function mail_private.is_authorized() to authenticated, service_role;

create policy mail_admins_authorized_select on public.mail_admins
for select to authenticated using (mail_private.is_authorized());
create policy mail_agents_authorized_select on public.mail_agents
for select to authenticated using (mail_private.is_authorized());
create policy mail_templates_authorized_select on public.mail_templates
for select to authenticated using (mail_private.is_authorized());
create policy mail_send_log_authorized_select on public.mail_send_log
for select to authenticated using (mail_private.is_authorized());
create policy mail_settings_authorized_select on public.mail_settings
for select to authenticated using (mail_private.is_authorized());

commit;
