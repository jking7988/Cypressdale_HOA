begin;
create or replace function public.hoa_save_content(document jsonb, expected_version bigint, published_version bigint default null)
returns public.hoa_content language plpgsql security definer set search_path = '' as $$
declare
  target_id text := document->>'id';
  draft_source_id text := target_id;
  current_row public.hoa_content;
  source_row public.hoa_content;
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
  for source_row in select * from public.hoa_content where id in (target_id, draft_source_id) loop
    if source_row.kind is distinct from document->>'kind' then
      if source_row.kind = 'event' and (
        exists (select 1 from public.hoa_rsvps where content_id = source_row.id)
        or coalesce((source_row.settings->>'rsvpYes')::integer, 0) > 0
        or coalesce((source_row.settings->>'rsvpMaybe')::integer, 0) > 0
      ) then raise exception 'Cannot change content type while this event has RSVPs.'; end if;
      if document->>'kind' not in ('post', 'event') and exists (
        select 1 from public.hoa_comments where content_id = source_row.id
      ) then raise exception 'Cannot change content type while this page has comments.'; end if;
      if source_row.kind = 'documentFolder' and exists (
        select 1 from public.hoa_content where settings->'folder'->>'_ref' = source_row.id
      ) then raise exception 'Cannot change content type while this folder contains documents.'; end if;
    end if;
  end loop;
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
  on conflict (id) do update set kind = excluded.kind, title = excluded.title, slug = excluded.slug, status = excluded.status,
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

commit;
