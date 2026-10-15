import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

export const transferTables = ['public.hoa_assets', 'public.hoa_content', 'public.hoa_content_assets',
  'public.hoa_profiles', 'public.hoa_comments', 'public.hoa_rsvps', 'hoa_private.content_retirements',
  'hoa_private.asset_retirements', 'hoa_private.newsletter_retirements', 'hoa_private.legacy_contacts'];
const hash = value => createHash('sha256').update(value).digest('hex');
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const programIds = new Set(['program-yard-of-the-month', 'program-holiday-decorating', 'program-halloween-decorating']);

export function buildTransferPlan(snapshot, hostedSubscribers, hostedUsers) {
  for (const table of [...transferTables, 'public.newsletter_subscribers', 'auth.users']) {
    if (!Array.isArray(snapshot[table])) throw new Error('Incomplete recovery snapshot.');
  }
  const plan = { version: 1, ready: false, tables: {}, missingAccounts: [], subscriberConflicts: [],
    subscribersToInsert: [], subscriberIdsToRemove: [], excludedTestAccounts: 0 };
  const identities = new Map(), sourceUsers = new Set(), sourceEmails = new Set(), targetIds = new Set();
  for (const user of snapshot['auth.users']) {
    if (sourceUsers.has(user.id)) throw new Error('Duplicate source identity.');
    sourceUsers.add(user.id);
    const email = normalizeEmail(user.email);
    if (!email) throw new Error('An identity has no email; explicit mapping is required.');
    if (sourceEmails.has(email)) throw new Error('Duplicate source email requires explicit identity reconciliation.');
    sourceEmails.add(email);
    if (email === 'admin@cypressdale.test') {
      identities.set(user.id, null); plan.excludedTestAccounts++; continue;
    }
    const matches = hostedUsers.filter(target => normalizeEmail(target.email) === email);
    if (matches.length > 1) throw new Error('Ambiguous destination identity.');
    const target = matches[0];
    if (!target?.email_confirmed_at) {
      plan.missingAccounts.push({ sourceId: user.id, email }); continue;
    }
    if (targetIds.has(target.id)) throw new Error('Destination identity mapping is not unique.');
    targetIds.add(target.id);
    identities.set(user.id, target.id);
  }
  const profiles = new Set(snapshot['public.hoa_profiles'].map(row => row.id));
  if (snapshot['public.hoa_profiles'].some(row => !sourceUsers.has(row.id)) || [...sourceUsers].some(id => !profiles.has(id))) {
    throw new Error('Account/profile relationship is incomplete.');
  }
  const mapIdentity = id => {
    if (id === null || id === undefined) return null;
    if (!sourceUsers.has(id)) throw new Error('Account relationship points to an unknown source identity.');
    return identities.get(id) ?? null;
  };
  for (const table of transferTables) plan.tables[table] = structuredClone(snapshot[table]);
  plan.tables['public.hoa_profiles'] = snapshot['public.hoa_profiles'].filter(row => identities.get(row.id))
    .map(row => ({ ...row, id: identities.get(row.id) }));
  for (const table of ['public.hoa_comments', 'public.hoa_rsvps']) {
    plan.tables[table] = snapshot[table].map(row => ({ ...row, author_id: mapIdentity(row.author_id),
      display_name: row.author_id && identities.get(row.author_id) === null ? 'User Cleared' : row.display_name }));
  }
  plan.tables['hoa_private.legacy_contacts'] = snapshot['hoa_private.legacy_contacts']
    .map(row => ({ ...row, verified_owner_id: mapIdentity(row.verified_owner_id) }));
  const contentIds = new Set(snapshot['public.hoa_content'].map(row => row.id));
  const contentById = new Map(snapshot['public.hoa_content'].map(row => [row.id, row]));
  const assetIds = new Set(snapshot['public.hoa_assets'].map(row => row.id));
  const assetLinks = new Set(snapshot['public.hoa_content_assets'].map(row => JSON.stringify([row.content_id, row.asset_id])));
  if (contentIds.size !== snapshot['public.hoa_content'].length || assetIds.size !== snapshot['public.hoa_assets'].length) throw new Error('Duplicate content or asset IDs.');
  for (const row of snapshot['public.hoa_content_assets']) {
    if (!contentIds.has(row.content_id) || !assetIds.has(row.asset_id)) throw new Error('Broken content/asset relationship.');
  }
  const commentIds = new Set(snapshot['public.hoa_comments'].map(row => row.id));
  for (const row of [...snapshot['public.hoa_comments'], ...snapshot['public.hoa_rsvps']]) {
    if (!contentIds.has(row.content_id) || (row.parent_id && !commentIds.has(row.parent_id))) throw new Error('Broken discussion relationship.');
  }
  for (const row of snapshot['public.hoa_content']) {
    if (row.kind === 'documentFile' && row.settings?.folder?._ref && contentById.get(row.settings.folder._ref)?.kind !== 'documentFolder') throw new Error('Missing document folder.');
    const pending = [row.body, row.sections, row.settings];
    while (pending.length) {
      const value = pending.pop();
      if (!value || typeof value !== 'object') continue;
      if (typeof value._ref === 'string' && /^(image-|file-|upload-)/.test(value._ref)) {
        if (!assetIds.has(value._ref) || !assetLinks.has(JSON.stringify([row.id, value._ref]))) throw new Error('Missing nested asset or content/asset relationship.');
      }
      pending.push(...Object.values(value));
    }
  }
  if (snapshot['hoa_private.content_retirements'].some(row => contentIds.has(row.source_id) || contentIds.has(`drafts.${row.source_id}`))
    || snapshot['hoa_private.asset_retirements'].some(row => assetIds.has(row.id))) throw new Error('Active data conflicts with retirement records.');

  const localContacts = new Map();
  for (const row of snapshot['public.newsletter_subscribers']) {
    const email = normalizeEmail(row.email);
    if (!email || email !== row.email || localContacts.has(email)) throw new Error('Source subscriber emails need reconciliation.');
    localContacts.set(email, row);
  }
  const destination = new Map();
  for (const row of hostedSubscribers) {
    const email = normalizeEmail(row.email);
    if (!email || email !== row.email || destination.has(email)) throw new Error('Destination subscriber emails need reconciliation.');
    destination.set(email, row);
  }
  const retired = new Set(snapshot['hoa_private.newsletter_retirements'].map(row => row.email_hash));
  for (const [email, row] of destination) {
    if (retired.has(hash(email)) && !localContacts.has(email)) plan.subscriberIdsToRemove.push(row.id);
  }
  for (const [email, row] of localContacts) {
    const existing = destination.get(email);
    if (!existing) { plan.subscribersToInsert.push(structuredClone(row)); continue; }
    const fields = ['active', 'verified', 'name', 'street'].filter(key => (existing[key] ?? null) !== (row[key] ?? null));
    if (fields.length) plan.subscriberConflicts.push({ email, fields, sourceId: row.id, destinationId: existing.id });
  }
  if (plan.subscribersToInsert.some(row => hostedSubscribers.some(existing => existing.id === row.id))) throw new Error('Subscriber identity collision.');
  plan.ready = plan.missingAccounts.length === 0 && plan.subscriberConflicts.length === 0;
  return plan;
}

async function insertRows(db, table, rows, conflictKeys = []) {
  if (!rows.length) return;
  const allowed = new Set([...transferTables, 'public.newsletter_subscribers']);
  if (!allowed.has(table)) throw new Error('Unexpected transfer table.');
  const keys = Object.keys(rows[0]);
  if (keys.some(key => !/^[a-z_][a-z0-9_]*$/.test(key)) || conflictKeys.some(key => !keys.includes(key))) throw new Error('Unexpected transfer columns.');
  if (rows.some(row => Object.keys(row).sort().join(',') !== [...keys].sort().join(','))) throw new Error('Inconsistent transfer row shape.');
  const columns = keys.map(key => `"${key}"`).join(',');
  const updateKeys = keys.filter(key => !conflictKeys.includes(key));
  const conflict = conflictKeys.length ? ` on conflict (${conflictKeys.join(',')}) do update set ${updateKeys.map(key => `"${key}" = excluded."${key}"`).join(',')}` : '';
  await db.query(`insert into ${table} (${columns}) select ${columns} from jsonb_populate_recordset(null::${table}, $1::jsonb)${conflict}`, [JSON.stringify(rows)]);
}

// Deliberately restricted to PGlite. This is NOT a hosted production import API.
export async function applyRehearsalPlan(db, plan) {
  if (!(db instanceof PGlite)) throw new Error('Transfer rehearsal requires a disposable PGlite database.');
  if (!plan.ready) throw new Error('Unresolved account mapping or subscriber conflicts.');
  await db.exec('begin');
  try {
    const existing = (await db.query('select id, version, locally_edited from public.hoa_content')).rows;
    if (existing.some(row => !programIds.has(row.id) || Number(row.version) !== 1 || row.locally_edited) || (await db.query('select count(*)::int as n from public.hoa_assets')).rows[0].n) {
      throw new Error('Destination already contains hub content. Refusing to overwrite it.');
    }
    await db.exec('alter table public.hoa_content disable trigger hoa_content_version; alter table public.hoa_profiles disable trigger hoa_profile_guard;');
    await insertRows(db, 'public.hoa_assets', plan.tables['public.hoa_assets']);
    await insertRows(db, 'public.hoa_content', plan.tables['public.hoa_content'], ['id']);
    await insertRows(db, 'public.hoa_content_assets', plan.tables['public.hoa_content_assets']);
    await insertRows(db, 'public.hoa_profiles', plan.tables['public.hoa_profiles'], ['id']);
    for (const table of ['public.hoa_comments', 'public.hoa_rsvps', 'hoa_private.content_retirements', 'hoa_private.asset_retirements', 'hoa_private.legacy_contacts']) {
      await insertRows(db, table, plan.tables[table]);
    }
    if (plan.subscriberIdsToRemove.length) await db.query('delete from public.newsletter_subscribers where id = any($1::uuid[])', [plan.subscriberIdsToRemove]);
    await insertRows(db, 'hoa_private.newsletter_retirements', plan.tables['hoa_private.newsletter_retirements'], ['email_hash']);
    await insertRows(db, 'public.newsletter_subscribers', plan.subscribersToInsert);
    await db.exec('alter table public.hoa_content enable trigger hoa_content_version; alter table public.hoa_profiles enable trigger hoa_profile_guard; commit;');
  } catch (error) { await db.exec('rollback'); throw error; }
}
