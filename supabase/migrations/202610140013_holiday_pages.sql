begin;
insert into public.hoa_content(id, kind, title, status, visibility, published_at, settings)
values ('program-halloween-decorating', 'page', 'Halloween Decorating', 'published', 'public', now(),
  '{"programSettings":{"displayHoliday":"halloween","pageTitle":"Halloween Decorating Contest","introduction":"Celebrate the creativity of Cypressdale neighbors with Halloween decorations and community recognition.","scheduleCopy":"Contest details and judging dates will be posted here.","emptyTitle":"Halloween decorating winners will be posted here."}}')
on conflict(id) do nothing;

create function hoa_private.protect_halloween_page() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.id = 'program-halloween-decorating' and auth.uid() is not null then
    raise exception 'This item must be managed in its dedicated section.';
  end if;
  return old;
end;
$$;
create trigger hoa_halloween_page_delete_guard before delete on public.hoa_content
for each row execute function hoa_private.protect_halloween_page();
revoke all on function hoa_private.protect_halloween_page() from public, anon, authenticated;
commit;
