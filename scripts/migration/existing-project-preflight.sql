do $$
begin
  if to_regnamespace('hoa_private') is not null
    or to_regclass('public.hoa_content') is not null
    or to_regclass('public.hoa_newsletter_runs') is not null
    or to_regclass('public.hoa_newsletter_deliveries') is not null then
    raise exception 'Hub objects already exist. Stop and review; this baseline is not a repeatable import.';
  end if;
  if exists (
    select 1 from (values
      ('newsletter_runs', 'id', 'bigint'),
      ('newsletter_runs', 'sent_at', 'timestamp with time zone'),
      ('newsletter_subscribers', 'id', 'uuid'),
      ('newsletter_subscribers', 'email', 'text'),
      ('newsletter_subscribers', 'name', 'text'),
      ('newsletter_subscribers', 'street', 'text'),
      ('newsletter_subscribers', 'active', 'boolean'),
      ('newsletter_subscribers', 'verified', 'boolean'),
      ('newsletter_subscribers', 'verification_token', 'text'),
      ('newsletter_subscribers', 'verification_sent_at', 'timestamp with time zone'),
      ('newsletter_subscribers', 'created_at', 'timestamp with time zone'),
      ('newsletter_subscribers', 'updated_at', 'timestamp with time zone')
    ) as expected(table_name, column_name, data_type)
    where not exists (select 1 from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = expected.table_name
        and c.column_name = expected.column_name and c.data_type = expected.data_type)
  ) then
    raise exception 'Existing newsletter schema differs from the reviewed catalog. Stop before installing.';
  end if;
  if exists (select 1 from public.newsletter_subscribers where email <> lower(trim(email)) or email is null) then
    raise exception 'Subscriber emails need explicit reconciliation. No automatic normalization is permitted.';
  end if;
  if not exists (
    select 1 from pg_constraint c join pg_attribute a
      on a.attrelid = c.conrelid and a.attname = 'email'
    where c.conrelid = 'public.newsletter_subscribers'::regclass
      and c.contype = 'u' and c.conkey = array[a.attnum]
  ) then
    raise exception 'Expected subscriber email uniqueness is missing.';
  end if;
end;
$$;
