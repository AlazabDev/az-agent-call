-- Az Agent Call Center uses Alazab central RBAC first.
-- platform_owner -> owner access automatically.
-- platform_admin -> admin access automatically.
-- Use this file only to delegate mail-only access to an existing Auth user.

insert into public.call_admins (user_id, role)
select id, 'operator'
from auth.users
where email = 'YOUR_OPERATOR_EMAIL'
on conflict (user_id) do update set role = excluded.role, updated_at = now();

-- Allowed delegated values are only: operator | viewer.
