begin;
create table hoa_private.newsletter_retirements (
  email_hash text primary key, removed_at timestamptz not null default now()
);
revoke all on hoa_private.newsletter_retirements from public, anon, authenticated;

create function hoa_private.retire_newsletter_subscriber() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into hoa_private.newsletter_retirements(email_hash)
    values (encode(sha256(convert_to(old.email, 'UTF8')), 'hex'))
    on conflict (email_hash) do update set removed_at = now();
  return old;
end;
$$;
create trigger hoa_newsletter_retire after delete on public.newsletter_subscribers
  for each row execute function hoa_private.retire_newsletter_subscriber();
revoke all on function hoa_private.retire_newsletter_subscriber() from public, anon, authenticated;

create function public.hoa_import_newsletter_subscriber(document jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare subscriber_email text := lower(trim(document->>'email'));
begin
  if exists (select 1 from hoa_private.newsletter_retirements
    where email_hash = encode(sha256(convert_to(subscriber_email, 'UTF8')), 'hex')) then return false; end if;
  insert into public.newsletter_subscribers(email, name, street, active, verified)
    values (subscriber_email, document->>'name', document->>'street',
      coalesce((document->>'active')::boolean, false), coalesce((document->>'verified')::boolean, false))
    on conflict (email) do nothing;
  return found;
end;
$$;
revoke all on function public.hoa_import_newsletter_subscriber(jsonb) from public, anon, authenticated;
grant execute on function public.hoa_import_newsletter_subscriber(jsonb) to service_role;
commit;
