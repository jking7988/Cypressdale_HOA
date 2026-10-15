begin;

create schema if not exists hoa_private;
revoke all on schema hoa_private from public;
grant usage on schema hoa_private to anon, authenticated, service_role;

create table public.hoa_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (length(full_name) <= 200),
  address text not null default '' check (length(address) <= 500),
  role text not null default 'resident' check (role in ('resident', 'admin')),
  membership_status text not null default 'pending' check (membership_status in ('pending', 'approved', 'revoked')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (role <> 'admin' or membership_status = 'approved')
);

create table hoa_private.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(trim(email)) and length(email) <= 320),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  revoked_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.hoa_content (
  id text primary key,
  kind text not null check (kind in ('post', 'event', 'page', 'yardWinner', 'holidayWinner', 'documentFile', 'documentFolder')),
  title text not null,
  slug text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  visibility text not null default 'public' check (visibility in ('public', 'members')),
  body jsonb not null default '[]',
  sections jsonb not null default '[]' check (jsonb_typeof(sections) = 'array'),
  settings jsonb not null default '{}',
  source_revision text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (id not like 'drafts.%' or status = 'draft')
);
create index hoa_content_listing on public.hoa_content(kind, status, visibility, published_at desc);

create table public.hoa_assets (
  id text primary key,
  bucket_id text not null default 'hoa-content' check (bucket_id = 'hoa-content'),
  object_path text unique not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.hoa_content_assets (
  content_id text not null references public.hoa_content(id) on delete cascade,
  asset_id text not null references public.hoa_assets(id) on delete restrict,
  primary key (content_id, asset_id)
);
create index hoa_content_assets_asset on public.hoa_content_assets(asset_id);

create table public.hoa_comments (
  id uuid primary key default gen_random_uuid(),
  source_id text unique,
  content_id text not null references public.hoa_content(id) on delete cascade,
  parent_id uuid,
  author_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  message text not null check (length(trim(message)) between 1 and 10000),
  created_at timestamptz not null default now(),
  unique (id, content_id),
  foreign key (parent_id, content_id) references public.hoa_comments(id, content_id)
);
create index hoa_comments_thread on public.hoa_comments(content_id, created_at);
create index hoa_comments_author on public.hoa_comments(author_id);

create table public.hoa_rsvps (
  id uuid primary key default gen_random_uuid(),
  source_id text unique,
  content_id text not null references public.hoa_content(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  status text not null check (status in ('yes', 'maybe')),
  created_at timestamptz not null default now()
);
create unique index hoa_rsvps_account_event on public.hoa_rsvps(content_id, author_id) where author_id is not null;
create index hoa_rsvps_author on public.hoa_rsvps(author_id);

-- Legacy contact details stay outside public content rows and exposed API schemas.
create table hoa_private.legacy_contacts (
  source_id text primary key,
  verified_owner_id uuid references auth.users(id) on delete cascade,
  email text
);
create table hoa_private.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  subject_id uuid,
  action text not null,
  created_at timestamptz not null default now()
);

create function hoa_private.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.hoa_profiles p join auth.users u on u.id = p.id
    where p.id = auth.uid() and p.membership_status = 'approved'
      and u.email_confirmed_at is not null
  );
$$;
create function hoa_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.hoa_profiles p join auth.users u on u.id = p.id
    where p.id = auth.uid() and p.role = 'admin'
      and p.membership_status = 'approved' and u.email_confirmed_at is not null
  );
$$;
create function hoa_private.can_read_content(content_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.hoa_content c where c.id = content_id and (
      hoa_private.is_admin() or (c.status = 'published' and
        (c.visibility = 'public' or hoa_private.is_member()))
    )
  );
$$;

create function hoa_private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.hoa_profiles(id, full_name, address)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', ''), 200),
    left(coalesce(new.raw_user_meta_data->>'address', ''), 500));
  return new;
end;
$$;
create trigger hoa_auth_signup after insert on auth.users
for each row execute function hoa_private.create_profile();

-- Serialize admin removals and role changes across transactions.
create function hoa_private.guard_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(7140261014);
  if old.role = 'admin' and old.membership_status = 'approved' then
    if tg_op = 'DELETE' or new.role <> 'admin' or new.membership_status <> 'approved' then
      if not exists (select 1 from public.hoa_profiles p join auth.users u on u.id = p.id
        where p.role = 'admin' and p.membership_status = 'approved'
          and p.id <> old.id and u.email_confirmed_at is not null) then
        raise exception 'The last active admin cannot be removed.';
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if new.address is distinct from old.address and old.role = 'resident' then
    new.membership_status := 'pending';
    new.approved_at := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger hoa_profile_guard before update or delete on public.hoa_profiles
for each row execute function hoa_private.guard_profile();

create function public.hoa_set_membership(target_id uuid, new_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(7140261014);
  if not hoa_private.is_admin() then raise exception 'Admin access required.'; end if;
  if new_status not in ('approved', 'revoked') then raise exception 'Invalid membership status.'; end if;
  if new_status = 'approved' and not exists (
    select 1 from auth.users u join public.hoa_profiles p on p.id = u.id
    where u.id = target_id and u.email_confirmed_at is not null
      and length(trim(p.full_name)) > 0 and length(trim(p.address)) > 0
  ) then raise exception 'A verified email, name and address are required.'; end if;
  update public.hoa_profiles set membership_status = new_status,
    approved_at = case when new_status = 'approved' then now() else null end
  where id = target_id and role = 'resident';
  if not found then raise exception 'Resident account not found.'; end if;
  insert into hoa_private.audit_log(actor_id, subject_id, action)
  values (auth.uid(), target_id, 'membership_' || new_status);
end;
$$;

create function public.hoa_issue_admin_invitation(invitee_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare invitation_id uuid;
begin
  if not hoa_private.is_admin() then raise exception 'Admin access required.'; end if;
  if invitee_email is null or trim(invitee_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or length(invitee_email) > 320 then raise exception 'Valid email required.'; end if;
  insert into hoa_private.admin_invitations(email, invited_by)
  values (lower(trim(invitee_email)), auth.uid()) returning id into invitation_id;
  return invitation_id;
end;
$$;
create function public.hoa_revoke_admin_invitation(invitation_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not hoa_private.is_admin() then raise exception 'Admin access required.'; end if;
  update hoa_private.admin_invitations set revoked_at = now()
  where id = invitation_id and accepted_at is null;
end;
$$;
create function public.hoa_accept_admin_invitation(invitation_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare user_email text;
begin
  perform pg_advisory_xact_lock(7140261014);
  select lower(email) into user_email from auth.users
  where id = auth.uid() and email_confirmed_at is not null;
  if user_email is null then raise exception 'Verified email required.'; end if;
  update hoa_private.admin_invitations set accepted_at = now(), accepted_by = auth.uid()
  where id = invitation_id and email = user_email and expires_at > now()
    and revoked_at is null and accepted_at is null;
  if not found then raise exception 'Invitation is invalid, expired or already used.'; end if;
  update public.hoa_profiles set role = 'admin', membership_status = 'approved', approved_at = now()
  where id = auth.uid();
  insert into hoa_private.audit_log(actor_id, subject_id, action)
  values (auth.uid(), auth.uid(), 'admin_invitation_accepted');
end;
$$;

-- Initial admin is a one-time, server-only operation; later admins require invitations.
create function public.hoa_bootstrap_admin(target_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(7140261014);
  if exists (select 1 from public.hoa_profiles where role = 'admin') then
    raise exception 'An admin already exists. Use an invitation.';
  end if;
  if not exists (select 1 from auth.users where id = target_id and email_confirmed_at is not null) then
    raise exception 'Verified account required.';
  end if;
  update public.hoa_profiles set role = 'admin', membership_status = 'approved', approved_at = now()
  where id = target_id;
  if not found then raise exception 'Account not found.'; end if;
  insert into hoa_private.audit_log(subject_id, action) values (target_id, 'initial_admin_created');
end;
$$;

create function hoa_private.clear_deleted_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(7140261014);
  -- Profile deletion invokes the last-admin guard in this same transaction.
  delete from public.hoa_profiles where id = old.id;
  update public.hoa_comments set author_id = null, display_name = 'User Cleared'
  where author_id = old.id or source_id in (
    select source_id from hoa_private.legacy_contacts where verified_owner_id = old.id
  );
  update public.hoa_rsvps set author_id = null, display_name = 'User Cleared'
  where author_id = old.id or source_id in (
    select source_id from hoa_private.legacy_contacts where verified_owner_id = old.id
  );
  delete from hoa_private.admin_invitations where accepted_by = old.id or email = lower(old.email);
  delete from hoa_private.legacy_contacts where verified_owner_id = old.id;
  insert into hoa_private.audit_log(subject_id, action) values (old.id, 'account_removed');
  return old;
end;
$$;
create trigger hoa_auth_delete before delete on auth.users
for each row execute function hoa_private.clear_deleted_user();

create function hoa_private.set_author_name() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Import and deletion operations run without a user session and supply their own name.
  if auth.uid() is not null then
    if new.author_id is distinct from auth.uid() then raise exception 'Invalid author.'; end if;
    select full_name into new.display_name from public.hoa_profiles where id = auth.uid();
    if length(trim(coalesce(new.display_name, ''))) = 0 then raise exception 'Name required.'; end if;
    new.source_id := null;
    new.created_at := now();
  end if;
  return new;
end;
$$;
create trigger hoa_comment_author before insert on public.hoa_comments
for each row execute function hoa_private.set_author_name();
create trigger hoa_rsvp_author before insert on public.hoa_rsvps
for each row execute function hoa_private.set_author_name();

alter table public.hoa_profiles enable row level security;
alter table public.hoa_content enable row level security;
alter table public.hoa_assets enable row level security;
alter table public.hoa_content_assets enable row level security;
alter table public.hoa_comments enable row level security;
alter table public.hoa_rsvps enable row level security;
alter table hoa_private.admin_invitations enable row level security;
alter table hoa_private.legacy_contacts enable row level security;
alter table hoa_private.audit_log enable row level security;

create policy hoa_profile_read on public.hoa_profiles for select to authenticated
using (id = auth.uid() or hoa_private.is_admin());
create policy hoa_profile_edit on public.hoa_profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());
create policy hoa_content_read on public.hoa_content for select to anon, authenticated
using (hoa_private.can_read_content(id));
create policy hoa_content_admin on public.hoa_content for all to authenticated
using (hoa_private.is_admin()) with check (hoa_private.is_admin());
create policy hoa_asset_read on public.hoa_assets for select to anon, authenticated
using (hoa_private.is_admin() or exists (
  select 1 from public.hoa_content_assets ca where ca.asset_id = id
    and hoa_private.can_read_content(ca.content_id)
));
create policy hoa_asset_admin on public.hoa_assets for all to authenticated
using (hoa_private.is_admin()) with check (hoa_private.is_admin());
create policy hoa_content_asset_read on public.hoa_content_assets for select to anon, authenticated
using (hoa_private.can_read_content(content_id));
create policy hoa_content_asset_admin on public.hoa_content_assets for all to authenticated
using (hoa_private.is_admin()) with check (hoa_private.is_admin());
create policy hoa_comment_read on public.hoa_comments for select to anon, authenticated
using (hoa_private.can_read_content(content_id));
create policy hoa_comment_create on public.hoa_comments for insert to authenticated
with check (hoa_private.is_member() and author_id = auth.uid()
  and exists (select 1 from public.hoa_content c where c.id = content_id
    and c.kind in ('post', 'event') and c.status = 'published' and hoa_private.can_read_content(c.id)));
create policy hoa_comment_admin_delete on public.hoa_comments for delete to authenticated
using (hoa_private.is_admin() and not exists (
  select 1 from public.hoa_comments replies where replies.parent_id = hoa_comments.id
));
create policy hoa_rsvp_read on public.hoa_rsvps for select to authenticated
using (hoa_private.is_admin() or (author_id = auth.uid() and hoa_private.can_read_content(content_id)));
create policy hoa_rsvp_create on public.hoa_rsvps for insert to authenticated
with check (hoa_private.is_member() and author_id = auth.uid()
  and exists (select 1 from public.hoa_content c where c.id = content_id
    and c.kind = 'event' and c.status = 'published' and hoa_private.can_read_content(c.id)));
create policy hoa_rsvp_edit on public.hoa_rsvps for update to authenticated
using (hoa_private.is_member() and author_id = auth.uid() and hoa_private.can_read_content(content_id))
with check (hoa_private.is_member() and author_id = auth.uid() and hoa_private.can_read_content(content_id));
create policy hoa_rsvp_delete on public.hoa_rsvps for delete to authenticated
using (hoa_private.is_member() and author_id = auth.uid() and hoa_private.can_read_content(content_id));

-- Remove Supabase default grants before assigning narrowly scoped privileges.
revoke all on public.hoa_profiles, public.hoa_content, public.hoa_assets,
  public.hoa_content_assets, public.hoa_comments, public.hoa_rsvps from anon, authenticated;
grant select on public.hoa_profiles to authenticated;
grant update (full_name, address) on public.hoa_profiles to authenticated;
grant select on public.hoa_content, public.hoa_assets, public.hoa_content_assets, public.hoa_comments to anon, authenticated;
grant insert, update, delete on public.hoa_content, public.hoa_assets, public.hoa_content_assets to authenticated;
grant insert, delete on public.hoa_comments to authenticated;
grant select, insert, delete on public.hoa_rsvps to authenticated;
grant update (status) on public.hoa_rsvps to authenticated;
grant all on public.hoa_profiles, public.hoa_content, public.hoa_assets,
  public.hoa_content_assets, public.hoa_comments, public.hoa_rsvps to service_role;
revoke all on all tables in schema hoa_private from public, anon, authenticated;
grant all on all tables in schema hoa_private to service_role;
grant usage, select on all sequences in schema hoa_private to service_role;

revoke all on all functions in schema hoa_private from public, anon, authenticated;
grant execute on function hoa_private.is_member(), hoa_private.is_admin(),
  hoa_private.can_read_content(text) to anon, authenticated, service_role;
revoke all on function public.hoa_set_membership(uuid, text),
  public.hoa_issue_admin_invitation(text), public.hoa_revoke_admin_invitation(uuid),
  public.hoa_accept_admin_invitation(uuid), public.hoa_bootstrap_admin(uuid)
  from public, anon, authenticated;
grant execute on function public.hoa_set_membership(uuid, text),
  public.hoa_issue_admin_invitation(text), public.hoa_revoke_admin_invitation(uuid),
  public.hoa_accept_admin_invitation(uuid) to authenticated;
grant execute on function public.hoa_bootstrap_admin(uuid) to service_role;

-- File bytes are served by an authenticated, no-store application endpoint.
-- Residents have no Storage SELECT policy and cannot mint reusable signed URLs.
insert into storage.buckets(id, name, public) values ('hoa-content', 'hoa-content', false);
create policy hoa_storage_admin on storage.objects for all to authenticated
using (bucket_id = 'hoa-content' and hoa_private.is_admin())
with check (bucket_id = 'hoa-content' and hoa_private.is_admin());

commit;
