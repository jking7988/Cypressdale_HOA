begin;

create function hoa_private.validate_document_folder() returns trigger
language plpgsql set search_path = '' as $$
declare folder public.hoa_content;
begin
  if tg_op = 'DELETE' then
    if old.kind = 'documentFolder' and exists (
      select 1 from public.hoa_content where kind = 'documentFile' and settings->'folder'->>'_ref' = old.id
    ) then raise exception 'Folder contains documents. Move or remove its files first.'; end if;
    return old;
  end if;
  -- Trusted imports can retain source ordering; admin edits validate assignments.
  if auth.uid() is null then return new; end if;
  if new.kind = 'documentFile' and nullif(new.settings->'folder'->>'_ref', '') is not null then
    select * into folder from public.hoa_content where id = new.settings->'folder'->>'_ref' and kind = 'documentFolder' for share;
    if not found then raise exception 'The selected folder is missing.'; end if;
    if new.status = 'published' and (folder.status <> 'published' or (new.visibility = 'public' and folder.visibility <> 'public')) then
      raise exception 'Published document requires a published folder with compatible visibility.';
    end if;
  elsif new.kind = 'documentFolder' and exists (
    select 1 from public.hoa_content d where d.kind = 'documentFile' and d.settings->'folder'->>'_ref' = new.id
      and d.status = 'published' and (new.status <> 'published' or (d.visibility = 'public' and new.visibility <> 'public'))
  ) then raise exception 'Folder contains published documents. Update its files before changing visibility or unpublishing.';
  end if;
  return new;
end;
$$;
create trigger hoa_document_folder before insert or update or delete on public.hoa_content
for each row execute function hoa_private.validate_document_folder();

create function public.hoa_delete_document(target_id text, expected_version bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare item public.hoa_content;
begin
  if not hoa_private.is_admin() then raise exception 'Admin access required.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(replace(target_id, 'drafts.', ''), 0));
  select * into item from public.hoa_content where id = target_id and kind in ('documentFolder', 'documentFile') for update;
  if not found then raise exception 'Document not found.'; end if;
  if item.version is distinct from expected_version then raise exception 'Content changed. Reload before removing.'; end if;
  delete from public.hoa_content where id = target_id;
end;
$$;
revoke all on function hoa_private.validate_document_folder() from public, anon, authenticated;
revoke all on function public.hoa_delete_document(text, bigint) from public, anon, authenticated;
grant execute on function public.hoa_delete_document(text, bigint) to authenticated;
commit;
