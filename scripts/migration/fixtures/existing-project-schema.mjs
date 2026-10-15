export const legacySchema = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create schema storage;
  create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $$;
  grant usage on schema public, auth, storage to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  create table storage.buckets(id text primary key, name text, public boolean);
  create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant all on storage.objects to anon, authenticated, service_role;
  insert into storage.buckets values ('chat-uploads', 'chat-uploads', true);
  insert into storage.objects(bucket_id,name) values ('chat-uploads','keep-this-file');
  create policy legacy_chat_storage on storage.objects for all to public
    using (bucket_id = 'chat-uploads') with check (bucket_id = 'chat-uploads');

  create table public.messages(id uuid primary key default gen_random_uuid(), room_id text not null,
    author_name text not null, text text not null, created_at timestamptz not null default now(),
    file_url text, file_name text, file_type text, edited_at timestamptz, deleted boolean default false, deleted_at timestamptz);
  alter table public.messages enable row level security;
  create policy legacy_chat on public.messages for all to public using (true) with check (true);
  insert into public.messages(room_id,author_name,text) values ('old-room','Archived person','Keep this old message');
  create table public.resident_map_entries(id uuid primary key default gen_random_uuid(), address text not null,
    hours text not null, details text, lat double precision not null, lng double precision not null,
    created_at timestamptz not null default now());
  insert into public.resident_map_entries(address,hours,lat,lng) values ('Map fixture','Saturday',30,-95);

  create table public.newsletter_subscribers(id uuid primary key default gen_random_uuid(), email text not null unique,
    name text, street text, active boolean not null default true, created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(), verified boolean not null default false,
    verification_token text, verification_sent_at timestamptz);
  create index newsletter_subscribers_verification_token_idx on public.newsletter_subscribers(verification_token);
  create table public.newsletter_runs(id bigserial primary key, sent_at timestamptz not null default now());
  insert into public.newsletter_subscribers(email,name,street,active,verified,verification_token) values
    ('active@example.test','Keep Name','Keep Street',true,true,null),
    ('unsubscribed@example.test','Keep Inactive',null,false,true,'inactive-old-token'),
    ('pending@example.test','Keep Pending',null,true,false,'pending-old-token');
  insert into public.newsletter_runs(sent_at) values ('2026-01-02T12:00:00Z'),('2026-01-09T12:00:00Z');
`;
