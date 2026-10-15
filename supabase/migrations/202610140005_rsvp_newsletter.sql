begin;

create function public.hoa_rsvp_summary(event_id text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare event_settings jsonb; result jsonb;
begin
  select settings into event_settings from public.hoa_content
    where id = event_id and kind = 'event' and status = 'published'
      and hoa_private.can_read_content(id);
  if not found then raise exception 'Event not found' using errcode = 'P0002'; end if;
  select jsonb_build_object(
    'yes', greatest(case when jsonb_typeof(event_settings->'rsvpYes') = 'number'
      then greatest(0, (event_settings->>'rsvpYes')::numeric) else 0 end,
      count(*) filter (where status = 'yes' and source_id is not null))
      + count(*) filter (where status = 'yes' and source_id is null),
    'maybe', greatest(case when jsonb_typeof(event_settings->'rsvpMaybe') = 'number'
      then greatest(0, (event_settings->>'rsvpMaybe')::numeric) else 0 end,
      count(*) filter (where status = 'maybe' and source_id is not null))
      + count(*) filter (where status = 'maybe' and source_id is null),
    'response', max(status) filter (where author_id = auth.uid()),
    'canRespond', hoa_private.is_member()
  ) into result from public.hoa_rsvps where content_id = event_id;
  return result;
end;
$$;

create function public.hoa_set_rsvp(event_id text, response text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not hoa_private.is_member() then raise exception 'Approved membership is required' using errcode = '42501'; end if;
  if response is not null and response not in ('yes', 'maybe') then raise exception 'Invalid response' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('rsvp:' || event_id, 0));
  perform public.hoa_rsvp_summary(event_id);
  if response is null then
    delete from public.hoa_rsvps where content_id = event_id and author_id = auth.uid();
  else
    insert into public.hoa_rsvps(content_id, author_id, display_name, status)
    values (event_id, auth.uid(), '', response)
    on conflict (content_id, author_id) where author_id is not null
      do update set status = excluded.status;
  end if;
  return public.hoa_rsvp_summary(event_id);
end;
$$;
revoke all on function public.hoa_rsvp_summary(text), public.hoa_set_rsvp(text, text) from public;
grant execute on function public.hoa_rsvp_summary(text) to anon, authenticated, service_role;
grant execute on function public.hoa_set_rsvp(text, text) to authenticated;

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(), email text not null unique check (email = lower(trim(email))),
  name text, street text, active boolean not null default false, verified boolean not null default false,
  pending_name text, pending_street text, verification_hash text unique, verification_sent_at timestamptz,
  verification_expires_at timestamptz, unsubscribe_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.newsletter_runs (
  id uuid primary key default gen_random_uuid(), run_key text not null unique,
  transport text not null check (transport in ('mailpit','resend')), payload jsonb not null,
  created_at timestamptz not null default now(), sent_at timestamptz
);
create table public.newsletter_deliveries (
  id uuid primary key default gen_random_uuid(), run_id uuid not null references public.newsletter_runs(id) on delete cascade,
  subscriber_id uuid not null references public.newsletter_subscribers(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','skipped')),
  lease_id uuid, lease_until timestamptz, attempts int not null default 0,
  provider_id text, last_error text, sent_at timestamptz, unique (run_id, subscriber_id)
);
alter table public.newsletter_subscribers enable row level security;
alter table public.newsletter_runs enable row level security;
alter table public.newsletter_deliveries enable row level security;
revoke all on public.newsletter_subscribers, public.newsletter_runs, public.newsletter_deliveries from public, anon, authenticated;
grant all on public.newsletter_subscribers, public.newsletter_runs, public.newsletter_deliveries to service_role;

create function public.hoa_request_newsletter(subscriber_email text, subscriber_name text, subscriber_street text, token_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('newsletter:' || subscriber_email, 0));
  if exists (select 1 from public.newsletter_subscribers where email = subscriber_email
    and verification_sent_at > now() - interval '1 minute') then return false; end if;
  insert into public.newsletter_subscribers(email, pending_name, pending_street, verification_hash, verification_sent_at, verification_expires_at)
    values (subscriber_email, subscriber_name, subscriber_street, token_hash, now(), now() + interval '24 hours')
    on conflict (email) do update set pending_name = excluded.pending_name, pending_street = excluded.pending_street,
      verification_hash = excluded.verification_hash, verification_sent_at = excluded.verification_sent_at,
      verification_expires_at = excluded.verification_expires_at;
  return true;
end;
$$;
create function public.hoa_confirm_newsletter(token_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.newsletter_subscribers set active = true, verified = true,
    name = pending_name, street = pending_street, pending_name = null, pending_street = null,
    verification_hash = null, verification_expires_at = null, updated_at = now()
    where verification_hash = token_hash and verification_expires_at > now();
  return found;
end;
$$;
create function public.hoa_start_newsletter(campaign_key text, campaign_payload jsonb, mail_transport text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare campaign_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('campaign:' || campaign_key, 0));
  select id into campaign_id from public.newsletter_runs where run_key = campaign_key;
  if found then return campaign_id; end if;
  insert into public.newsletter_runs(run_key, payload, transport) values (campaign_key, campaign_payload, mail_transport) returning id into campaign_id;
  insert into public.newsletter_deliveries(run_id, subscriber_id)
    select campaign_id, id from public.newsletter_subscribers where active and verified;
  return campaign_id;
end;
$$;
create function public.hoa_claim_newsletter(campaign_id uuid, claim_id uuid) returns setof public.newsletter_deliveries
language sql security definer set search_path = '' as $$
  update public.newsletter_deliveries set status = 'sending', lease_id = claim_id, lease_until = now() + interval '5 minutes', attempts = attempts + 1
  where id in (select id from public.newsletter_deliveries where run_id = campaign_id
    and (status in ('pending', 'failed') or (status = 'sending' and lease_until < now()))
    and attempts < 5 order by id for update skip locked limit 20)
  returning *;
$$;
revoke all on function public.hoa_request_newsletter(text, text, text, text), public.hoa_confirm_newsletter(text),
  public.hoa_start_newsletter(text, jsonb, text), public.hoa_claim_newsletter(uuid, uuid) from public, anon, authenticated;
grant execute on function public.hoa_request_newsletter(text, text, text, text), public.hoa_confirm_newsletter(text),
  public.hoa_start_newsletter(text, jsonb, text), public.hoa_claim_newsletter(uuid, uuid) to service_role;

create table hoa_private.account_removal_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade, unsubscribe boolean not null
);
revoke all on hoa_private.account_removal_preferences from public, anon, authenticated;
create function public.hoa_prepare_account_removal(target uuid, unsubscribe boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or (target <> auth.uid() and not hoa_private.is_admin()) then
    raise exception 'Account access is required' using errcode = '42501'; end if;
  insert into hoa_private.account_removal_preferences(user_id, unsubscribe) values (target, unsubscribe)
    on conflict (user_id) do update set unsubscribe = excluded.unsubscribe;
end;
$$;
create function hoa_private.clear_newsletter_account() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from hoa_private.account_removal_preferences where user_id = old.id and unsubscribe) then
    update public.newsletter_subscribers set active = false, name = null, street = null,
      pending_name = null, pending_street = null, verification_hash = null, verification_expires_at = null,
      unsubscribe_token = gen_random_uuid(), updated_at = now() where email = lower(old.email);
  end if;
  return old;
end;
$$;
create trigger hoa_newsletter_account_delete before delete on auth.users for each row execute function hoa_private.clear_newsletter_account();
revoke all on function public.hoa_prepare_account_removal(uuid, boolean), hoa_private.clear_newsletter_account() from public, anon, authenticated;
grant execute on function public.hoa_prepare_account_removal(uuid, boolean) to authenticated;
commit;
