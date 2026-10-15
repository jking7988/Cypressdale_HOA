-- Apply once in the EXISTING project's SQL editor. No messages or files are deleted.
begin;
select pg_advisory_xact_lock(7140261016);

alter table public.messages enable row level security;
revoke all on public.messages from public, anon, authenticated;

-- A private bucket alone does not override the old permissive storage policies.
-- This restrictive policy blocks only retired chat objects, leaving hub files alone.
update storage.buckets set public = false where id = 'chat-uploads';
create policy hoa_retired_chat_deny on storage.objects as restrictive
for all to public
using (bucket_id is distinct from 'chat-uploads')
with check (bucket_id is distinct from 'chat-uploads');

commit;
select 'Retired chat access disabled. No messages or files were deleted.' as status;
