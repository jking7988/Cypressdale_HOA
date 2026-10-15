-- Run in the EXISTING project's SQL editor. Read-only metadata, not a migration.
begin read only;

with columns_review as (
select table_schema, table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema in ('public', 'hoa_private', 'supabase_migrations')
order by table_schema, table_name, ordinal_position
), tables_review as (

select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'hoa_private') and c.relkind in ('r', 'p')
order by 1, 2
), policies_review as (

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname in ('public', 'hoa_private', 'storage')
order by schemaname, tablename, policyname
), triggers_review as (

select n.nspname as schema_name, c.relname as table_name, t.tgname as trigger_name,
  pn.nspname as function_schema, p.proname as function_name, t.tgenabled as enabled
from pg_trigger t join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid join pg_namespace pn on pn.oid = p.pronamespace
where not t.tgisinternal and n.nspname in ('public', 'hoa_private', 'auth', 'storage')
order by 1, 2, 3
), functions_review as (

select n.nspname as schema_name, p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments, p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'hoa_private')
order by 1, 2, 3
), constraints_review as (

select table_schema, table_name, constraint_name, constraint_type
from information_schema.table_constraints
where table_schema in ('public', 'hoa_private')
order by table_schema, table_name, constraint_name
), indexes_review as (
select schemaname, tablename, indexname, indexdef
from pg_indexes where schemaname in ('public', 'hoa_private')
order by schemaname, tablename, indexname
), schemas_review as (
select nspname as schema_name from pg_namespace
where nspname in ('public', 'hoa_private', 'supabase_migrations')
order by nspname
)
select jsonb_pretty(jsonb_build_object(
  'schemas', coalesce((select jsonb_agg(to_jsonb(r)) from schemas_review r), '[]'::jsonb),
  'columns', coalesce((select jsonb_agg(to_jsonb(r)) from columns_review r), '[]'::jsonb),
  'tables', coalesce((select jsonb_agg(to_jsonb(r)) from tables_review r), '[]'::jsonb),
  'policies', coalesce((select jsonb_agg(to_jsonb(r)) from policies_review r), '[]'::jsonb),
  'triggers', coalesce((select jsonb_agg(to_jsonb(r)) from triggers_review r), '[]'::jsonb),
  'functions', coalesce((select jsonb_agg(to_jsonb(r)) from functions_review r), '[]'::jsonb),
  'constraints', coalesce((select jsonb_agg(to_jsonb(r)) from constraints_review r), '[]'::jsonb),
  'indexes', coalesce((select jsonb_agg(to_jsonb(r)) from indexes_review r), '[]'::jsonb)
)) as catalog_review;

rollback;
