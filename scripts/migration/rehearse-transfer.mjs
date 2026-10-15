import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { projectRoot } from '../member-hub/local.mjs';
import { readOnlyClient, rows } from './production-audit.mjs';
import { legacySchema } from './fixtures/existing-project-schema.mjs';
import { buildExistingProjectBaseline } from './prepare-existing-project.mjs';
import { buildTransferPlan, applyRehearsalPlan, transferTables } from './transfer-model.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const legacySubscriberColumns = 'id,email,name,street,active,verified,created_at,updated_at,verification_token,verification_sent_at';

async function exactRows(db, table, expected) {
  if (![...transferTables, 'public.newsletter_runs'].includes(table)) throw new Error('Unexpected comparison table.');
  const result = await db.query(`with actual as (select to_jsonb(t) as row from ${table} t),
    expected as (select to_jsonb(t) as row from jsonb_populate_recordset(null::${table}, $1::jsonb) t)
    select not exists ((select row from actual except select row from expected)
      union all (select row from expected except select row from actual)) as same`, [JSON.stringify(expected)]);
  return result.rows[0].same;
}

async function readHosted(environmentPath) {
  const environment = parseEnv(await readFile(path.resolve(projectRoot, environmentPath), 'utf8'));
  const url = new URL(environment.NEXT_PUBLIC_SUPABASE_URL || '');
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') || url.username || url.password
    || url.pathname !== '/' || url.search || url.hash || !environment.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Invalid hosted read-only configuration.');
  const read = readOnlyClient(url.origin, environment.SUPABASE_SERVICE_ROLE_KEY);
  const subscribers = await rows(read, 'newsletter_subscribers', legacySubscriberColumns);
  const history = await rows(read, 'newsletter_runs', 'id,sent_at');
  const users = [];
  for (let page = 1; ; page++) {
    const batch = await (await read(`/auth/v1/admin/users?page=${page}&per_page=1000`)).json();
    if (!Array.isArray(batch.users)) throw new Error('Incomplete hosted account read.');
    users.push(...batch.users.map(user => ({ id: user.id, email: user.email, email_confirmed_at: user.email_confirmed_at })));
    if (batch.users.length < 1000) break;
  }
  return { subscribers, history, users, projectFingerprint: hash(url.origin) };
}

async function main() {
  const option = name => { const index = process.argv.indexOf(name); if (index < 0 || !process.argv[index + 1]) throw new Error('Provide --recovery and --source-env.'); return process.argv[index + 1]; };
  const backupRoot = await realpath(path.join(projectRoot, 'backups'));
  const recovery = await realpath(path.resolve(projectRoot, option('--recovery')));
  if (path.dirname(recovery) !== backupRoot || !path.basename(recovery).startsWith('recovery-rehearsal-')) throw new Error('Expected a verified private recovery directory.');
  const receipt = JSON.parse(await readFile(path.join(recovery, 'receipt.json'), 'utf8'));
  const raw = await readFile(path.join(recovery, 'snapshot.json'), 'utf8');
  if (!receipt.complete || !receipt.disposableDatabaseRemoved || receipt.snapshotSha256 !== hash(raw)) throw new Error('Recovery receipt or snapshot checksum is invalid.');
  const snapshot = JSON.parse(raw);
  const hosted = await readHosted(option('--source-env'));
  const productionPlan = buildTransferPlan(snapshot, hosted.subscribers, hosted.users);
  const directory = path.join(backupRoot, `transfer-rehearsal-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const save = (name, value) => writeFile(path.join(directory, name), JSON.stringify(value, null, 2), { flag: 'wx', mode: 0o600 });
  await save('hosted-newsletter-snapshot.json', hosted);
  await save('production-plan.json', productionPlan);
  const report = { version: 1, complete: false, productionReady: false, hostedChanged: false, workingDatabaseChanged: false,
    sourceRecovery: path.relative(projectRoot, recovery), missingProductionAccounts: productionPlan.missingAccounts.length,
    subscriberConflicts: productionPlan.subscriberConflicts.length, excludedTestAccounts: productionPlan.excludedTestAccounts,
    scope: 'Recovered real local content and current hosted newsletter snapshots in disposable PGlite; Auth verification is simulated locally, unrelated hosted services are represented by fixtures.' };
  const db = new PGlite();
  try {
    if (productionPlan.subscriberConflicts.length) throw new Error('Subscriber conflicts require review before transfer rehearsal.');
    await db.exec(legacySchema);
    await db.exec('delete from public.newsletter_subscribers; delete from public.newsletter_runs;');
    await db.query(`insert into public.newsletter_subscribers (${legacySubscriberColumns})
      select ${legacySubscriberColumns} from jsonb_populate_recordset(null::public.newsletter_subscribers, $1::jsonb)`, [JSON.stringify(hosted.subscribers)]);
    await db.query(`insert into public.newsletter_runs(id,sent_at)
      select id,sent_at from jsonb_populate_recordset(null::public.newsletter_runs, $1::jsonb)`, [JSON.stringify(hosted.history)]);
    const { sql, sources } = await buildExistingProjectBaseline();
    report.baselineSha256 = hash(sql);
    await save('baseline-sources.json', sources);
    await db.exec(sql);
    const rehearsalUsers = [...hosted.users, ...productionPlan.missingAccounts.map(account => ({
      id: randomUUID(), email: account.email, email_confirmed_at: new Date().toISOString(),
    }))];
    for (const user of rehearsalUsers) await db.query('insert into auth.users(id,email,email_confirmed_at) values ($1,$2,$3)', [user.id, user.email, user.email_confirmed_at || null]);
    const plan = buildTransferPlan(snapshot, hosted.subscribers, rehearsalUsers);
    await applyRehearsalPlan(db, plan);
    for (const table of transferTables) if (!await exactRows(db, table, plan.tables[table])) throw new Error('Transferred content, relationships or private records differ.');
    if (!await exactRows(db, 'public.newsletter_runs', hosted.history)) throw new Error('Legacy newsletter history changed.');
    const removed = new Set(plan.subscriberIdsToRemove);
    const surviving = hosted.subscribers.filter(row => !removed.has(row.id));
    const result = await db.query(`select ${legacySubscriberColumns} from public.newsletter_subscribers where id = any($1::uuid[]) order by email`, [surviving.map(row => row.id)]);
    const original = [...surviving].sort((a, b) => a.email.localeCompare(b.email));
    const serialized = value => JSON.stringify(value, (_, entry) => entry instanceof Date ? entry.toISOString() : entry);
    const normalize = row => Object.fromEntries(Object.keys(row).sort().map(key => [key,
      key.endsWith('_at') && row[key] ? new Date(row[key]).toISOString() : row[key]]));
    if (serialized(result.rows.map(normalize)) !== serialized(original.map(normalize))) throw new Error('Existing subscriber data or consent changed.');
    const campaigns = (await db.query('select count(*)::int as n from public.hoa_newsletter_runs')).rows[0].n;
    const deliveries = (await db.query('select count(*)::int as n from public.hoa_newsletter_deliveries')).rows[0].n;
    if (campaigns || deliveries) throw new Error('Local delivery history must not become production campaigns.');
    const assets = snapshot['public.hoa_assets'].map(asset => {
      const object = snapshot['storage.objects'].find(row => row.bucket_id === asset.bucket_id && row.name === asset.object_path);
      if (!object?.version) throw new Error('Missing recovered file mapping.');
      return { id: asset.id, bucket: asset.bucket_id, objectPath: asset.object_path, sha256: asset.sha256, bytes: asset.size_bytes,
        sourceRelativePath: path.posix.join('storage', 'stub', 'stub', asset.bucket_id, asset.object_path, object.version) };
    });
    if (assets.length !== receipt.verifiedAssets) throw new Error('Verified recovery asset count changed.');
    await save('asset-transfer-manifest.json', assets);
    report.counts = Object.fromEntries(transferTables.map(table => [table, plan.tables[table].length]));
    report.verifiedAssets = receipt.verifiedAssets;
    report.preservedLiveSubscribers = surviving.length;
    report.subscribersAdded = plan.subscribersToInsert.length;
    report.subscriberRemovalsFromLocalTombstones = plan.subscriberIdsToRemove.length;
    report.preservedLegacyRuns = hosted.history.length;
    report.complete = true;
  } catch (error) {
    await writeFile(path.join(directory, 'private-error.log'), error.stack || 'Rehearsal failed.', { mode: 0o600 });
    throw new Error(`Transfer rehearsal needs review. Private receipt: ${path.relative(projectRoot, directory)}`);
  } finally {
    await db.close();
    await save('receipt.json', report);
  }
  console.log(JSON.stringify({ directory: path.relative(projectRoot, directory), ...report }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
