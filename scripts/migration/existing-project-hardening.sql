-- These internal tables are accessed only through reviewed SECURITY DEFINER
-- functions or the database owner. Keep direct client access denied as well.
alter table hoa_private.account_removal_preferences enable row level security;
alter table hoa_private.newsletter_retirements enable row level security;
revoke all on hoa_private.account_removal_preferences,
  hoa_private.newsletter_retirements from public, anon, authenticated;

do $$
begin
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p') and not c.relrowsecurity
      and (n.nspname = 'hoa_private'
        or (n.nspname = 'public' and c.relname like 'hoa\_%' escape '\'))
  ) then
    raise exception 'New hub tables must all have Row Level Security enabled.';
  end if;
end;
$$;
