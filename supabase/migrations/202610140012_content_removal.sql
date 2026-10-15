begin;
create function public.hoa_delete_content(target_id text, expected_version bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare item public.hoa_content;
begin
  if not hoa_private.is_admin() then raise exception 'Admin access required.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(replace(target_id, 'drafts.', ''), 0));
  select * into item from public.hoa_content where id = target_id for update;
  if not found then raise exception 'Content not found. Reload the list.'; end if;
  if item.version is distinct from expected_version then raise exception 'Content changed. Reload before removing.'; end if;
  if item.kind not in ('post', 'event', 'page') or item.id in ('program-yard-of-the-month', 'program-holiday-decorating') then
    raise exception 'This item must be managed in its dedicated section.';
  end if;
  if exists (select 1 from public.hoa_content where id = 'drafts.' || target_id) then
    raise exception 'A separate draft exists. Remove the draft first or unpublish this content instead.';
  end if;
  if exists (select 1 from public.hoa_comments where content_id = target_id) then
    raise exception 'Content has comments. Unpublish it instead to preserve the discussion.';
  end if;
  if exists (select 1 from public.hoa_rsvps where content_id = target_id) then
    raise exception 'Content has RSVPs. Unpublish it instead to preserve the responses.';
  end if;
  if exists (
    select 1 from public.hoa_content c,
      lateral jsonb_path_query(jsonb_build_array(c.body, c.sections, c.settings), '$.**._ref') ref
    where c.id <> target_id and ref #>> '{}' = target_id
  ) then
    raise exception 'Other content references this item. Remove those references or unpublish it instead.';
  end if;
  delete from public.hoa_content where id = target_id;
end;
$$;
revoke all on function public.hoa_delete_content(text, bigint) from public, anon, authenticated;
grant execute on function public.hoa_delete_content(text, bigint) to authenticated;
commit;
