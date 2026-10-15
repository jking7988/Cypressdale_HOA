begin;
create function public.hoa_member_directory()
returns table (id uuid, full_name text, address text, role text, membership_status text,
  email text, email_confirmed_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not hoa_private.is_admin() then raise exception 'Admin access required.'; end if;
  return query select p.id, p.full_name, p.address, p.role, p.membership_status,
    u.email::text, u.email_confirmed_at, p.created_at
  from public.hoa_profiles p join auth.users u on u.id = p.id order by p.created_at desc;
end;
$$;
create function public.hoa_admin_invitations()
returns table (id uuid, email text, expires_at timestamptz, accepted_at timestamptz,
  revoked_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not hoa_private.is_admin() then raise exception 'Admin access required.'; end if;
  return query select i.id, i.email, i.expires_at, i.accepted_at, i.revoked_at, i.created_at
  from hoa_private.admin_invitations i order by i.created_at desc limit 100;
end;
$$;
revoke all on function public.hoa_member_directory(), public.hoa_admin_invitations() from public, anon;
grant execute on function public.hoa_member_directory(), public.hoa_admin_invitations() to authenticated;
commit;
