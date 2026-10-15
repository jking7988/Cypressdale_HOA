import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { docker } from './backup-local.mjs';
import { getLocalStatus, projectRoot } from '../member-hub/local.mjs';
import { readOnlyClient, rows } from './production-audit.mjs';
import { buildTransferPlan, transferTables } from './transfer-model.mjs';
import { buildTransferSql, subscriberColumns } from './transfer-sql.mjs';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export async function destinationEnvironment(filename) {
  const env = parseEnv(await readFile(path.resolve(projectRoot, filename), 'utf8'));
  const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL || '');
  if (url.protocol !== 'https:' || !/^[a-z0-9]+\.supabase\.co$/.test(url.hostname) || url.port || url.username || url.password
    || url.pathname !== '/' || url.search || url.hash || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Expected existing hosted Supabase configuration.');
  return { origin: url.origin, key: env.SUPABASE_SERVICE_ROLE_KEY, fingerprint: sha256(url.origin) };
}
export async function readDestination(destination) {
  const read = readOnlyClient(destination.origin, destination.key);
  const subscribers = await rows(read, 'newsletter_subscribers', subscriberColumns.join(','));
  const users = [];
  for (let page = 1; ; page++) {
    const batch = await (await read(`/auth/v1/admin/users?page=${page}&per_page=1000`)).json();
    if (!Array.isArray(batch.users)) throw new Error('Incomplete destination account read.');
    users.push(...batch.users.map(({ id, email, email_confirmed_at }) => ({ id, email, email_confirmed_at })));
    if (batch.users.length < 1000) break;
  }
  return { subscribers, users };
}
export function validateAsset(asset) {
  if (asset.bucket_id !== 'hoa-content' || typeof asset.object_path !== 'string'
    || asset.object_path.split('/').some(part => !part || part === '.' || part === '..')
    || /[\\\x00-\x1f?#]/.test(asset.object_path) || !/^[a-f0-9]{64}$/.test(asset.sha256)
    || !Number.isSafeInteger(Number(asset.size_bytes)) || Number(asset.size_bytes) < 0) throw new Error('Invalid asset transfer metadata.');
}
async function sourceSnapshot() {
  const fields = [...transferTables, 'public.newsletter_subscribers'].map(table =>
    `'${table}', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from ${table} t)`);
  fields.push(`'auth.users', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'email',email,'email_confirmed_at',email_confirmed_at)), '[]'::jsonb) from auth.users)`);
  const result = await docker(['exec', 'supabase_db_cypressdale-member-hub', 'psql', '-U', 'postgres', '-d', 'postgres',
    '-X', '-A', '-t', '-q', '-v', 'ON_ERROR_STOP=1', '-c',
    `begin transaction isolation level repeatable read read only; select jsonb_build_object(${fields.join(',')}); commit;`]);
  return JSON.parse(result.trim());
}
export async function prepareTransfer(environmentFile) {
  const local = getLocalStatus();
  const destination = await destinationEnvironment(environmentFile);
  const hosted = await readDestination(destination);
  const snapshot = await sourceSnapshot();
  const plan = buildTransferPlan(snapshot, hosted.subscribers, hosted.users);
  const directory = path.join(projectRoot, '.deployment', `transfer-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  await mkdir(path.join(directory, 'objects'), { recursive: true, mode: 0o700 });
  const save = (name, bytes) => writeFile(path.join(directory, name), bytes, { flag: 'wx', mode: 0o600 });
  const saveJson = (name, value) => save(name, JSON.stringify(value, null, 2));
  const localRead = readOnlyClient(local.API_URL, local.SERVICE_ROLE_KEY);
  const assets = [];
  for (const asset of snapshot['public.hoa_assets']) {
    validateAsset(asset);
    const objectPath = asset.object_path.split('/').map(encodeURIComponent).join('/');
    const bytes = Buffer.from(await (await localRead(`/storage/v1/object/authenticated/hoa-content/${objectPath}`)).arrayBuffer());
    if (sha256(bytes) !== asset.sha256 || bytes.length !== Number(asset.size_bytes)) throw new Error('Source asset checksum mismatch.');
    const file = `objects/${String(assets.length).padStart(5, '0')}.bin`;
    await save(file, bytes);
    assets.push({ ...asset, file });
  }
  const finalSnapshot = await sourceSnapshot();
  // JSONB serializes object keys consistently; aggregate ordering is normalized here.
  const stable = value => JSON.stringify(Object.fromEntries(Object.entries(value).map(([table, records]) =>
    [table, records.map(row => JSON.stringify(row)).sort()])));
  if (stable(snapshot) !== stable(finalSnapshot)) throw new Error('Local data changed during export. Pause editing and prepare again.');
  const source = JSON.stringify(snapshot);
  await save('source.json', source);
  await saveJson('plan.json', plan);
  let sql;
  if (plan.ready) { sql = buildTransferSql(plan, hosted.subscribers, hosted.users); await save('transfer.sql', sql); }
  const manifest = { version: 1, complete: true, productionReady: false, hostedChanged: false,
    capturedAt: new Date().toISOString(), projectFingerprint: destination.fingerprint,
    sourceSha256: sha256(source), sqlSha256: sql ? sha256(sql) : null,
    missingAccounts: plan.missingAccounts, subscriberConflicts: plan.subscriberConflicts,
    excludedTestAccounts: plan.excludedTestAccounts,
    counts: Object.fromEntries(transferTables.map(table => [table, plan.tables[table].length])), assets };
  await saveJson('manifest.json', manifest);
  console.log(JSON.stringify({ directory: path.relative(projectRoot, directory), hostedChanged: false,
    assets: assets.length, bytes: assets.reduce((total, asset) => total + Number(asset.size_bytes), 0),
    missingAccounts: plan.missingAccounts.length, subscriberConflicts: plan.subscriberConflicts.length,
    transferSqlPrepared: Boolean(sql) }, null, 2));
  return directory;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const index = process.argv.indexOf('--source-env');
  if (index < 0 || !process.argv[index + 1]) { console.error('Provide --source-env for the existing website environment file.'); process.exitCode = 1; }
  else prepareTransfer(process.argv[index + 1]).catch(() => { console.error('Transfer preparation stopped. No hosted writes were attempted; inspect local configuration and data before retrying.'); process.exitCode = 1; });
}
