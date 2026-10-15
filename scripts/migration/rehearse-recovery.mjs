import { spawnSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { readFile, writeFile, mkdir, realpath, lstat, readdir } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { docker } from './backup-local.mjs';
import { getLocalStatus, projectRoot } from '../member-hub/local.mjs';

const container = 'supabase_db_cypressdale-member-hub';
const appTables = ['public.hoa_content', 'public.hoa_assets', 'public.hoa_content_assets', 'public.hoa_profiles',
  'public.hoa_comments', 'public.hoa_rsvps', 'public.newsletter_subscribers',
  'hoa_private.content_retirements', 'hoa_private.asset_retirements', 'hoa_private.newsletter_retirements',
  'hoa_private.legacy_contacts'];

export function validateArchiveEntries(listing) {
  const entries = listing.split(/\r?\n/).filter(Boolean);
  if (!entries.length || entries.some(entry => entry.startsWith('/') || entry.includes('\\')
    || entry.includes(':') || entry.split('/').some(part => part === '..'))) {
    throw new Error('Unsafe or empty storage archive listing.');
  }
  return entries;
}

export function validateRecoveryDatabase(name) {
  if (!/^hoa_restore_[a-f0-9]{32}$/.test(name)) throw new Error('Refusing to address a non-rehearsal database.');
  return name;
}

async function digest(file) {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(file)) { hash.update(chunk); bytes += chunk.length; }
  return { sha256: hash.digest('hex'), bytes };
}

async function query(database, sql) {
  const result = await docker(['exec', container, 'psql', '-U', 'supabase_admin', '-d', validateRecoveryDatabase(database),
    '-X', '-A', '-t', '-q', '-v', 'ON_ERROR_STOP=1', '-c', sql]);
  return JSON.parse(result.trim());
}

async function listFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const candidate = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Storage archive contains a symbolic link.');
    if (entry.isDirectory()) files.push(...await listFiles(candidate));
    else if (entry.isFile()) files.push(candidate);
    else throw new Error('Unexpected storage archive entry.');
  }
  return files;
}

export async function rehearseRecovery(backupDirectory) {
  const backupRoot = await realpath(path.join(projectRoot, 'backups'));
  const source = await realpath(path.resolve(projectRoot, backupDirectory));
  if (path.dirname(source) !== backupRoot || !path.basename(source).startsWith('local-preproduction-')) {
    throw new Error('Expected a private local preproduction backup directory.');
  }
  const manifest = JSON.parse(await readFile(path.join(source, 'manifest.json'), 'utf8'));
  if (manifest.version !== 1 || !manifest.complete || manifest.source !== 'local-member-hub-only') throw new Error('Incomplete or unsupported backup.');
  for (const file of ['database.dump', 'storage.tar.gz']) {
    const actual = await digest(path.join(source, file));
    if (actual.sha256 !== manifest.files?.[file]?.sha256 || actual.bytes !== manifest.files?.[file]?.bytes) throw new Error('Backup checksum mismatch.');
  }
  getLocalStatus();
  const database = validateRecoveryDatabase(`hoa_restore_${randomUUID().replaceAll('-', '')}`);
  const directory = path.join(backupRoot, `recovery-rehearsal-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  const storage = path.join(directory, 'storage');
  await mkdir(storage, { recursive: true, mode: 0o700 });
  let created = false, stage = 'create disposable local database';
  const receipt = { version: 1, complete: false, sourceBackup: path.relative(projectRoot, source),
    hostedChanged: false, workingDatabaseChanged: false, disposableDatabaseRemoved: false };
  try {
    await docker(['exec', container, 'createdb', '-U', 'supabase_admin', '--template=template0', database]);
    created = true;
    stage = 'restore PostgreSQL archive';
    await docker(['exec', '-i', container, 'pg_restore', '-U', 'supabase_admin', '--no-owner', '--no-acl',
      '--exit-on-error', '--single-transaction', '--dbname', database], { input: path.join(source, 'database.dump') });
    stage = 'recover storage archive';
    const listing = spawnSync('tar', ['-tzf', path.join(source, 'storage.tar.gz')], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    if (listing.status !== 0) throw new Error('Unable to read storage archive.');
    validateArchiveEntries(listing.stdout);
    const extracted = spawnSync('tar', ['-xzf', path.join(source, 'storage.tar.gz'), '-C', storage, '--no-same-owner', '--no-same-permissions'], { encoding: 'utf8' });
    if (extracted.status !== 0) throw new Error('Unable to extract storage archive.');
    await listFiles(storage);
    stage = 'read restored content snapshot';
    const snapshot = {};
    for (const table of appTables) snapshot[table] = await query(database,
      `select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from ${table} t`);
    snapshot['auth.users'] = await query(database, `select coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'email',email,'email_confirmed_at',email_confirmed_at,'user_metadata',raw_user_meta_data)), '[]'::jsonb) from auth.users`);
    snapshot['storage.objects'] = await query(database,
      "select coalesce(jsonb_agg(jsonb_build_object('bucket_id',bucket_id,'name',name,'version',version)), '[]'::jsonb) from storage.objects");
    stage = 'verify recovered file bytes';
    const objects = snapshot['storage.objects'];
    let verifiedAssets = 0;
    for (const asset of snapshot['public.hoa_assets']) {
      const object = objects.find(row => row.bucket_id === asset.bucket_id && row.name === asset.object_path);
      if (!object?.version || !/^[a-f0-9-]+$/i.test(object.version)) throw new Error('Missing or unsupported restored storage version.');
      const filename = path.resolve(storage, 'stub', 'stub', asset.bucket_id, asset.object_path, object.version);
      const resolved = await realpath(filename);
      if (!resolved.startsWith(`${await realpath(storage)}${path.sep}`) || !(await lstat(resolved)).isFile()) throw new Error('Invalid restored storage path.');
      const actual = await digest(resolved);
      if (actual.sha256 !== asset.sha256 || actual.bytes !== Number(asset.size_bytes)) throw new Error('Recovered file checksum mismatch.');
      verifiedAssets++;
    }
    const snapshotJson = JSON.stringify(snapshot);
    await writeFile(path.join(directory, 'snapshot.json'), snapshotJson, { flag: 'wx', mode: 0o600 });
    receipt.snapshotSha256 = createHash('sha256').update(snapshotJson).digest('hex');
    receipt.counts = Object.fromEntries(Object.entries(snapshot).map(([table, rows]) => [table, rows.length]));
    receipt.verifiedAssets = verifiedAssets;
    receipt.complete = true;
    receipt.restoreScope = 'Local database schema/data and recovered physical file bytes. ACL/ownership restoration and running restored Auth/Storage services were not rehearsed.';
  } catch (error) {
    receipt.failedAt = stage;
    if (error.privateDiagnostic) await writeFile(path.join(directory, 'private-error.log'), error.privateDiagnostic, { mode: 0o600 });
    throw new Error(`Recovery rehearsal failed at ${stage}. Private receipt: ${path.relative(projectRoot, directory)}`);
  } finally {
    if (created) {
      try {
        await docker(['exec', container, 'dropdb', '-U', 'supabase_admin', validateRecoveryDatabase(database)]);
        receipt.disposableDatabaseRemoved = true;
      } catch { receipt.cleanupRequired = database; receipt.complete = false; }
    }
    await writeFile(path.join(directory, 'receipt.json'), JSON.stringify(receipt, null, 2), { mode: 0o600 });
  }
  if (!receipt.complete) throw new Error('Recovery cleanup needs review; see private receipt.');
  return { directory: path.relative(projectRoot, directory), ...receipt };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const index = process.argv.indexOf('--backup');
  if (index === -1 || !process.argv[index + 1]) {
    console.error('Provide --backup backups/local-preproduction-<timestamp>.'); process.exitCode = 1;
  } else rehearseRecovery(process.argv[index + 1]).then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
