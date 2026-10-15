begin;
create or replace function public.hoa_request_newsletter(subscriber_email text, subscriber_name text, subscriber_street text, token_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(7140261015);
  if exists (select 1 from public.newsletter_subscribers where email = subscriber_email
    and verification_sent_at > now() - interval '1 minute') then return false; end if;
  if (select count(*) from public.newsletter_subscribers where verification_sent_at > now() - interval '1 minute') >= 30 then
    raise exception 'Newsletter request limit reached' using errcode = '54000'; end if;
  insert into public.newsletter_subscribers(email, pending_name, pending_street, verification_hash, verification_sent_at, verification_expires_at)
    values (subscriber_email, subscriber_name, subscriber_street, token_hash, now(), now() + interval '24 hours')
    on conflict (email) do update set pending_name = excluded.pending_name, pending_street = excluded.pending_street,
      verification_hash = excluded.verification_hash, verification_sent_at = excluded.verification_sent_at,
      verification_expires_at = excluded.verification_expires_at;
  return true;
end;
$$;
create or replace function public.hoa_claim_newsletter(campaign_id uuid, claim_id uuid) returns setof public.newsletter_deliveries
language sql security definer set search_path = '' as $$
  update public.newsletter_deliveries set status = 'sending', lease_id = claim_id, lease_until = now() + interval '5 minutes', attempts = attempts + 1
  where id in (select id from public.newsletter_deliveries where run_id = campaign_id
    and (status in ('pending', 'failed') or (status = 'sending' and lease_until < now()))
    and attempts < 5 order by id for update skip locked limit 5)
  returning *;
$$;
create function public.hoa_request_newsletter_management(subscriber_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  perform pg_advisory_xact_lock(7140261015);
  if (select count(*) from public.newsletter_subscribers where verification_sent_at > now() - interval '1 minute') >= 30 then
    raise exception 'Newsletter request limit reached' using errcode = '54000'; end if;
  update public.newsletter_subscribers set verification_sent_at = now()
    where email = subscriber_email and (verification_sent_at is null or verification_sent_at < now() - interval '1 minute')
    returning unsubscribe_token into result;
  return result;
end;
$$;
revoke all on function public.hoa_request_newsletter_management(text) from public, anon, authenticated;
grant execute on function public.hoa_request_newsletter_management(text) to service_role;
commit;
