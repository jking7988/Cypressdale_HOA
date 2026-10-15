import { transferTables } from './transfer-model.mjs';

export const subscriberColumns = ['id', 'email', 'name', 'street', 'active', 'verified',
  'created_at', 'updated_at', 'verification_token', 'verification_sent_at'];
const json = value => `convert_from(decode('${Buffer.from(JSON.stringify(value)).toString('hex')}', 'hex'), 'UTF8')::jsonb`;
const quoted = keys => keys.map(key => `"${key}"`).join(',');

function insert(table, rows, conflict = []) {
  if (!rows.length) return '';
  if (![...transferTables, 'public.newsletter_subscribers'].includes(table)) throw new Error('Unexpected transfer table.');
  const keys = Object.keys(rows[0]);
  if (!keys.length || keys.some(key => !/^[a-z_][a-z0-9_]*$/.test(key))
    || conflict.some(key => !keys.includes(key))
    || rows.some(row => JSON.stringify(Object.keys(row).sort()) !== JSON.stringify([...keys].sort()))) throw new Error('Invalid transfer columns.');
  const updates = keys.filter(key => !conflict.includes(key)).map(key => `"${key}" = excluded."${key}"`).join(',');
  return `insert into ${table} (${quoted(keys)}) select ${quoted(keys)} from jsonb_populate_recordset(null::${table}, ${json(rows)})`
    + (conflict.length ? ` on conflict (${quoted(conflict)}) do update set ${updates}` : '') + ';';
}

export function buildTransferSql(plan, subscribers, identities) {
  if (!plan.ready || plan.missingAccounts.length || plan.subscriberConflicts.length) throw new Error('Resolve verified accounts and subscriber conflicts first.');
  if (!Array.isArray(subscribers) || !Array.isArray(identities)) throw new Error('Destination expectations are required.');
  const profiles = plan.tables['public.hoa_profiles'];
  if (!profiles.some(profile => profile.role === 'admin' && profile.membership_status === 'approved')) throw new Error('At least one retained verified administrator is required.');
  const mapped = identities.filter(user => profiles.some(profile => profile.id === user.id))
    .map(user => ({ id: user.id, email: user.email }));
  if (mapped.length !== profiles.length) throw new Error('Incomplete verified account expectations.');
  const empty = transferTables.filter(table => !['public.hoa_profiles', 'public.hoa_content'].includes(table));
  const compareSubscribers = `select ${quoted(subscriberColumns)} from public.newsletter_subscribers`;
  const expectedSubscribers = `select ${quoted(subscriberColumns)} from jsonb_populate_recordset(null::public.newsletter_subscribers, ${json(subscribers)})`;
  const statements = [
    '-- PRIVATE CUTOVER DATA. Apply only in the reviewed existing project after file verification and explicit approval.',
    'begin;', "set local lock_timeout = '10s';", "set local statement_timeout = '120s';",
    'select pg_advisory_xact_lock(7140261016);',
    `lock table ${[...transferTables, 'public.newsletter_subscribers'].join(', ')} in access exclusive mode;`,
    'lock table auth.users in share mode;',
    `do $guard$ begin
      if auth.uid() is not null then raise exception 'Use the database SQL editor, not an authenticated application session.'; end if;
      if exists (select 1 from public.hoa_content where id not in ('program-yard-of-the-month', 'program-holiday-decorating', 'program-halloween-decorating') or version <> 1 or locally_edited)
        or ${empty.map(table => `exists (select 1 from ${table})`).join(' or ')}
        then raise exception 'Destination is not pristine. Refusing to overwrite hub data.'; end if;
      if exists ((${compareSubscribers} except ${expectedSubscribers}) union all (${expectedSubscribers} except ${compareSubscribers}))
        then raise exception 'Live subscribers changed. Rebuild and review the transfer package.'; end if;
      if exists (select 1 from jsonb_to_recordset(${json(mapped)}) as expected(id uuid, email text)
        where not exists (select 1 from auth.users actual where actual.id = expected.id and lower(actual.email) = lower(expected.email) and actual.email_confirmed_at is not null))
        then raise exception 'Verified account mapping changed.'; end if;
      if exists (select 1 from public.hoa_profiles where id not in (select id from jsonb_to_recordset(${json(mapped)}) as expected(id uuid)) or role <> 'resident' or membership_status <> 'pending')
        then raise exception 'Destination profiles already have activity or privileges. Review before transfer.'; end if;
      if not exists (select 1 from storage.buckets where id = 'hoa-content' and public = false)
        or exists (select 1 from jsonb_to_recordset(${json(plan.tables['public.hoa_assets'].map(asset => ({ bucket_id: asset.bucket_id, object_path: asset.object_path })))}) as expected(bucket_id text, object_path text)
          where not exists (select 1 from storage.objects actual where actual.bucket_id = expected.bucket_id and actual.name = expected.object_path))
        then raise exception 'Private storage bucket or uploaded files are missing. Verify file transfer first.'; end if;
    end $guard$;`,
    'alter table public.hoa_content disable trigger hoa_content_version;',
    'alter table public.hoa_profiles disable trigger hoa_profile_guard;',
    insert('public.hoa_assets', plan.tables['public.hoa_assets']),
    insert('public.hoa_content', plan.tables['public.hoa_content'], ['id']),
    insert('public.hoa_content_assets', plan.tables['public.hoa_content_assets']),
    insert('public.hoa_profiles', profiles, ['id']),
    ...['public.hoa_comments', 'public.hoa_rsvps', 'hoa_private.content_retirements', 'hoa_private.asset_retirements', 'hoa_private.legacy_contacts'].map(table => insert(table, plan.tables[table])),
    `delete from public.newsletter_subscribers where id in (select value::uuid from jsonb_array_elements_text(${json(plan.subscriberIdsToRemove)}));`,
    insert('hoa_private.newsletter_retirements', plan.tables['hoa_private.newsletter_retirements'], ['email_hash']),
    insert('public.newsletter_subscribers', plan.subscribersToInsert),
    'alter table public.hoa_content enable trigger hoa_content_version;',
    'alter table public.hoa_profiles enable trigger hoa_profile_guard;',
    'commit;',
  ];
  return statements.filter(Boolean).join('\n') + '\n';
}
