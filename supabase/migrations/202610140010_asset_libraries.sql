begin;
alter table public.hoa_assets add column library text not null default 'files' check (library in ('files', 'documents'));
update public.hoa_assets a set library = 'documents' where exists (
  select 1 from public.hoa_content c where c.kind in ('documentFile', 'documentFolder') and (
    exists (select 1 from public.hoa_content_assets ca where ca.content_id = c.id and ca.asset_id = a.id)
    or exists (select 1 from jsonb_path_query(to_jsonb(c), '$.**._ref') ref where ref #>> '{}' = a.id)
  )
);

create table hoa_private.asset_retirements (
  id text primary key, bucket_id text not null, object_path text not null,
  removed_at timestamptz not null default now(), cleaned_at timestamptz
);
alter table hoa_private.asset_retirements enable row level security;
revoke all on hoa_private.asset_retirements from public, anon, authenticated;
grant all on hoa_private.asset_retirements to service_role;

create function hoa_private.asset_library_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from hoa_private.asset_retirements where id = new.id) then return null; end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if auth.uid() is not null and new.library <> old.library then raise exception 'File library cannot be changed.'; end if;
    return new;
  end if;
  if auth.uid() is not null then
    if not hoa_private.is_admin() then raise exception 'Admin access required.'; end if;
    if old.library <> 'files' then raise exception 'Document files belong in Documents.'; end if;
    if exists (select 1 from public.hoa_content_assets where asset_id = old.id) or exists (
      select 1 from public.hoa_content c, lateral jsonb_path_query(to_jsonb(c), '$.**._ref') ref where ref #>> '{}' = old.id
    ) then raise exception 'File is in use. Remove it from its content before deleting it.'; end if;
    insert into hoa_private.asset_retirements(id, bucket_id, object_path) values (old.id, old.bucket_id, old.object_path);
  end if;
  return old;
end;
$$;
create trigger hoa_asset_library_guard before insert or update or delete on public.hoa_assets
for each row execute function hoa_private.asset_library_guard();

create function hoa_private.content_library_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null then return new; end if;
  if new.kind in ('documentFile', 'documentFolder') then
    if exists (select 1 from jsonb_path_query(to_jsonb(new), '$.**._ref') ref join public.hoa_assets a on a.id = ref #>> '{}' where a.library <> 'documents') then
      raise exception 'Use a document upload from the Documents library.';
    end if;
  elsif exists (
    select 1 from jsonb_path_query(to_jsonb(new), '$.**._ref') ref join public.hoa_assets a on a.id = ref #>> '{}'
    where a.library = 'documents' and not exists (
      select 1 from public.hoa_content existing, lateral jsonb_path_query(to_jsonb(existing), '$.**._ref') previous
      where existing.id = new.id and existing.kind not in ('documentFile', 'documentFolder') and previous #>> '{}' = a.id
    )
  ) then raise exception 'Document files are not available for new content.';
  end if;
  return new;
end;
$$;
create trigger hoa_content_library_guard before insert or update on public.hoa_content
for each row execute function hoa_private.content_library_guard();

create function public.hoa_remove_file(target_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare asset public.hoa_assets;
begin
  if not hoa_private.is_admin() then raise exception 'Admin access required.'; end if;
  select * into asset from public.hoa_assets where id = target_id for update;
  if not found then raise exception 'File not found.'; end if;
  delete from public.hoa_assets where id = target_id;
  return jsonb_build_object('id', asset.id, 'bucket_id', asset.bucket_id, 'object_path', asset.object_path);
end;
$$;
create function public.hoa_retired_asset_ids() returns jsonb
language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(id), '[]'::jsonb) from hoa_private.asset_retirements;
$$;
create function public.hoa_pending_file_cleanup() returns jsonb
language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(item), '[]'::jsonb) from (
    select id, bucket_id, object_path from hoa_private.asset_retirements where cleaned_at is null order by removed_at limit 25
  ) item;
$$;
create function public.hoa_mark_file_cleaned(target_id text) returns void
language sql security definer set search_path = '' as $$
  update hoa_private.asset_retirements set cleaned_at = now() where id = target_id;
$$;
revoke all on function hoa_private.asset_library_guard(), hoa_private.content_library_guard() from public, anon, authenticated;
revoke all on function public.hoa_remove_file(text), public.hoa_retired_asset_ids(), public.hoa_pending_file_cleanup(), public.hoa_mark_file_cleaned(text) from public, anon, authenticated;
grant execute on function public.hoa_remove_file(text) to authenticated;
grant execute on function public.hoa_retired_asset_ids(), public.hoa_pending_file_cleanup(), public.hoa_mark_file_cleaned(text) to service_role;
commit;
