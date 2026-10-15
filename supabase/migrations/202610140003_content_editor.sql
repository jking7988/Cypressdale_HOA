begin;
alter table public.hoa_content add column version bigint not null default 1;
alter table public.hoa_content add column locally_edited boolean not null default false;

create function hoa_private.content_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.version := old.version + 1;
  new.updated_at := clock_timestamp();
  if auth.uid() is not null then new.locally_edited := true; end if;
  return new;
end;
$$;
create trigger hoa_content_version before update on public.hoa_content
for each row execute function hoa_private.content_version();

create function public.hoa_save_content(document jsonb, expected_version bigint, published_version bigint default null)
returns public.hoa_content language plpgsql security definer set search_path = '' as $$
declare
  target_id text := document->>'id';
  draft_source_id text := target_id;
  current_row public.hoa_content;
  saved public.hoa_content;
  asset_refs text[];
begin
  if not hoa_private.is_admin() then raise exception 'Admin access required.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(replace(target_id, 'drafts.', ''), 0));
  select * into current_row from public.hoa_content where id = target_id for update;
  if (found and current_row.version is distinct from expected_version) or (not found and expected_version is not null) then
    raise exception 'Content changed. Reload before saving.';
  end if;
  if target_id like 'drafts.%' and document->>'status' = 'published' then
    target_id := substring(target_id from 8);
    select * into current_row from public.hoa_content where id = target_id for update;
    if (found and current_row.version is distinct from published_version) or (not found and published_version is not null) then
      raise exception 'Published content changed. Reload before publishing.';
    end if;
  end if;
  if length(trim(document->>'title')) not between 1 and 300 then raise exception 'Title required.'; end if;
  select coalesce(array_agg(distinct ref), '{}') into asset_refs from (
    select value #>> '{}' as ref from jsonb_path_query(document, '$.**._ref') value
  ) refs where ref like 'image-%' or ref like 'file-%' or ref like 'upload-%';
  if exists (select 1 from unnest(asset_refs) ref where not exists (select 1 from public.hoa_assets where id = ref)) then
    raise exception 'An attachment is missing.';
  end if;
  if document->>'status' = 'published' and exists (
    select 1 from public.hoa_content_assets ca join public.hoa_content c on c.id = ca.content_id
    where ca.asset_id = any(asset_refs) and c.id <> target_id and c.id <> draft_source_id
      and c.status = 'published' and c.visibility <> document->>'visibility'
  ) then
    raise exception 'Attachment is used on a page with different visibility. Upload a separate copy.';
  end if;
  insert into public.hoa_content(id, kind, title, slug, status, visibility, body, sections, settings, locally_edited, published_at)
  values (target_id, document->>'kind', trim(document->>'title'), nullif(document->>'slug', ''),
    document->>'status', document->>'visibility', document->'body', document->'sections', document->'settings', true,
    case when document->>'status' = 'published' then coalesce(current_row.published_at, now()) end)
  on conflict (id) do update set title = excluded.title, slug = excluded.slug, status = excluded.status,
    visibility = excluded.visibility, body = excluded.body, sections = excluded.sections, settings = excluded.settings,
    locally_edited = true, published_at = excluded.published_at
  returning * into saved;
  delete from public.hoa_content_assets where content_id = target_id;
  insert into public.hoa_content_assets(content_id, asset_id) select target_id, unnest(asset_refs);
  if draft_source_id <> target_id then
    update public.hoa_comments set content_id = target_id where content_id = draft_source_id;
    update public.hoa_rsvps set content_id = target_id where content_id = draft_source_id;
    delete from public.hoa_content where id = draft_source_id;
  end if;
  return saved;
end;
$$;

create function public.hoa_import_content(document jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare imported_id text;
begin
  perform pg_advisory_xact_lock(hashtextextended(replace(document->>'id', 'drafts.', ''), 0));
  insert into public.hoa_content(id, kind, title, slug, status, visibility, body, sections, settings,
    source_revision, created_at, updated_at, published_at)
  values (document->>'id', document->>'kind', document->>'title', document->>'slug', document->>'status',
    'public', document->'body', document->'sections', document->'settings', document->>'source_revision',
    (document->>'created_at')::timestamptz, (document->>'updated_at')::timestamptz,
    (document->>'published_at')::timestamptz)
  on conflict(id) do update set title = excluded.title, slug = excluded.slug, body = excluded.body,
    sections = excluded.sections, settings = excluded.settings, source_revision = excluded.source_revision,
    published_at = excluded.published_at
  where not hoa_content.locally_edited and hoa_content.source_revision is distinct from excluded.source_revision
  returning id into imported_id;
  if imported_id is null then return false; end if;
  delete from public.hoa_content_assets where content_id = imported_id;
  insert into public.hoa_content_assets(content_id, asset_id)
  select distinct imported_id, refs.value #>> '{}' from jsonb_path_query(document, '$.**._ref') as refs(value)
  join public.hoa_assets a on a.id = refs.value #>> '{}';
  return true;
end;
$$;

create function public.hoa_import_legacy_contacts(entries jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into hoa_private.legacy_contacts(source_id, email)
  select item->>'source_id', item->>'email' from jsonb_array_elements(entries) item
  where not exists (select 1 from public.hoa_comments c where c.source_id = item->>'source_id' and c.display_name = 'User Cleared')
    and not exists (select 1 from public.hoa_rsvps r where r.source_id = item->>'source_id' and r.display_name = 'User Cleared')
  on conflict(source_id) do nothing;
end;
$$;
revoke all on function hoa_private.content_version() from public, anon, authenticated;
revoke all on function public.hoa_save_content(jsonb, bigint, bigint), public.hoa_import_content(jsonb),
  public.hoa_import_legacy_contacts(jsonb) from public, anon, authenticated;
grant execute on function public.hoa_save_content(jsonb, bigint, bigint) to authenticated;
grant execute on function public.hoa_import_content(jsonb), public.hoa_import_legacy_contacts(jsonb) to service_role;
commit;
