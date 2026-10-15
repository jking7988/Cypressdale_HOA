begin;
insert into public.hoa_content(id, kind, title, status, visibility, published_at)
values ('program-yard-of-the-month', 'page', 'Yard of the Month', 'published', 'public', now()),
  ('program-holiday-decorating', 'page', 'Holiday Decorating', 'published', 'public', now())
on conflict(id) do nothing;

create function public.hoa_delete_winner(target_id text, expected_version bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare item public.hoa_content;
begin
  if not hoa_private.is_admin() then raise exception 'Admin access required.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(replace(target_id, 'drafts.', ''), 0));
  select * into item from public.hoa_content where id = target_id and kind in ('yardWinner', 'holidayWinner') for update;
  if not found then raise exception 'Winner not found.'; end if;
  if item.version is distinct from expected_version then raise exception 'Content changed. Reload before removing.'; end if;
  delete from public.hoa_content where id = target_id;
end;
$$;
revoke all on function public.hoa_delete_winner(text, bigint) from public, anon, authenticated;
grant execute on function public.hoa_delete_winner(text, bigint) to authenticated;
commit;
