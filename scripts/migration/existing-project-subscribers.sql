-- Add hub fields without replacing identities, consent or outstanding legacy tokens.
alter table public.newsletter_subscribers
  add column pending_name text,
  add column pending_street text,
  add column verification_hash text unique,
  add column verification_expires_at timestamptz,
  add column unsubscribe_token uuid not null unique default gen_random_uuid(),
  add constraint hoa_newsletter_email_normalized check (email = lower(trim(email)));
alter table public.newsletter_subscribers alter column active set default false;

-- The old site's server-side service-role sender can still append history.
-- No anonymous access to contacts or historical runs is needed by either website.
alter table public.newsletter_runs enable row level security;
revoke all on public.newsletter_runs from public, anon, authenticated;
grant all on public.newsletter_runs to service_role;
do $$
declare sequence_name text := pg_get_serial_sequence('public.newsletter_runs', 'id');
begin
  if sequence_name is not null then
    execute format('grant usage, select on sequence %s to service_role', sequence_name);
  end if;
end;
$$;
