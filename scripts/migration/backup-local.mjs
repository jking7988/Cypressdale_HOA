import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getLocalStatus, projectRoot } from '../member-hub/local.mjs';

const database = 'supabase_db_cypressdale-member-hub';
const storage = 'supabase_storage_cypressdale-member-hub';

export async function docker(args, { input, output } = {}) {
  const child = spawn('docker', args, { stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'] });
  const diagnostics = [];
  child.stderr.on('data', chunk => diagnostics.push(chunk));
  const exited = new Promise((resolve, reject) => {
    child.once('error', () => reject(new Error('Unable to run local Docker backup command.')));
    child.once('close', code => code === 0 ? resolve() : reject(Object.assign(new Error('Local Docker backup command failed.'),
      { privateDiagnostic: Buffer.concat(diagnostics).toString('utf8') })));
  });
  const chunks = [];
  if (!output) child.stdout.on('data', chunk => chunks.push(chunk));
  await Promise.all([
    exited,
    input ? pipeline(createReadStream(input), child.stdin) : Promise.resolve(),
    output ? pipeline(child.stdout, createWriteStream(output, { flags: 'wx', mode: 0o600 })) : Promise.resolve(),
  ]);
  return Buffer.concat(chunks).toString('utf8');
}

export function verifyArchiveContents(toc, storageListing) {
  for (const [schema, table] of [['public', 'hoa_content'], ['public', 'hoa_assets'], ['public', 'hoa_content_assets'],
    ['public', 'hoa_profiles'], ['public', 'hoa_comments'], ['public', 'hoa_rsvps'], ['public', 'newsletter_subscribers'],
    ['public', 'newsletter_runs'], ['public', 'newsletter_deliveries'], ['auth', 'users'], ['storage', 'objects'],
    ['hoa_private', 'content_retirements'], ['hoa_private', 'asset_retirements'], ['hoa_private', 'newsletter_retirements']]) {
    if (!new RegExp(`TABLE DATA ${schema} ${table} `).test(toc)) throw new Error(`Backup is missing ${schema}.${table}.`);
  }
  const files = storageListing.split(/\r?\n/).filter(line => line && !line.endsWith('/'));
  if (!files.length) throw new Error('Storage archive has no files.');
  return files.length;
}

async function checksum(file) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return { bytes: (await stat(file)).size, sha256: digest.digest('hex') };
}

async function main() {
  getLocalStatus();
  const capturedAt = new Date().toISOString();
  const directory = path.join(projectRoot, 'backups', `local-preproduction-${capturedAt.replace(/[:.]/g, '-')}`);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const manifestPath = path.join(directory, 'manifest.json');
  const manifest = { version: 1, capturedAt, source: 'local-member-hub-only', complete: false,
    containsSensitiveData: true, coordinatedSnapshot: false,
    verification: 'Archive readability, expected database table-data entries, nonempty storage and SHA-256 checksums; restore rehearsal still required.',
    limitations: ['Do not edit/upload while taking the final cutover backup; database and storage snapshots are sequential.',
      'This backup contains local Auth users, including the test identity. It is recovery material, NOT a production import.',
      'PostgreSQL cluster roles and environment secrets are not exported. Restore requires compatible Supabase roles/extensions.',
      'No hosted database or hosted storage backup is included.'], files: {} };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
  const dump = path.join(directory, 'database.dump');
  const uploads = path.join(directory, 'storage.tar.gz');
  await docker(['exec', '-e', 'PGOPTIONS=-c default_transaction_read_only=on', database,
    'pg_dump', '-U', 'postgres', '-d', 'postgres', '--format=custom', '--serializable-deferrable'], { output: dump });
  await docker(['exec', storage, 'tar', '-czf', '-', '-C', '/mnt', '.'], { output: uploads });
  const toc = await docker(['exec', '-i', database, 'pg_restore', '--list'], { input: dump });
  const listing = await docker(['exec', '-i', storage, 'tar', '-tzf', '-'], { input: uploads });
  manifest.storageArchiveFiles = verifyArchiveContents(toc, listing);
  for (const file of ['database.dump', 'storage.tar.gz']) manifest.files[file] = await checksum(path.join(directory, file));
  manifest.complete = true;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ directory: path.relative(projectRoot, directory), complete: true,
    storageArchiveFiles: manifest.storageArchiveFiles, files: manifest.files,
    restoreRehearsed: false, hostedChanged: false }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(() => {
    console.error('Local backup did not complete. Keep incomplete output for diagnosis; do not use it for recovery. No hosted writes were attempted.');
    process.exitCode = 1;
  });
}
