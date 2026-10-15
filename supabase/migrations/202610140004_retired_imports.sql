begin;
create table hoa_private.content_retirements (source_id text primary key);
alter table hoa_private.content_retirements enable row level security;
revoke all on hoa_private.content_retirements from public, anon, authenticated;
grant all on hoa_private.content_retirements to service_role;

create function hoa_private.retire_content() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and old.source_revision is not null then
    insert into hoa_private.content_retirements(source_id) values (old.id) on conflict do nothing;
  end if;
  return old;
end;
$$;
create function hoa_private.skip_retired_import() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null and exists (select 1 from hoa_private.content_retirements where source_id = new.id) then return null; end if;
  return new;
end;
$$;
create trigger hoa_content_retired after delete on public.hoa_content for each row execute function hoa_private.retire_content();
create trigger hoa_content_import_guard before insert on public.hoa_content for each row execute function hoa_private.skip_retired_import();
revoke all on function hoa_private.retire_content(), hoa_private.skip_retired_import() from public, anon, authenticated;
commit;
