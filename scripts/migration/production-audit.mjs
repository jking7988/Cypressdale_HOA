import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getLocalStatus, projectRoot } from '../member-hub/local.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
let stage = 'configuration';
const tables = ['hoa_profiles', 'hoa_content', 'hoa_assets', 'hoa_content_assets', 'hoa_comments', 'hoa_rsvps',
  'newsletter_subscribers', 'newsletter_runs', 'newsletter_deliveries', 'resident_map_entries'];

// The audit transport permits GET only, including counts and storage downloads.
export function readOnlyClient(origin, key, fetcher = fetch) {
  return async endpoint => {
    const url = new URL(endpoint, origin);
    if (url.origin !== new URL(origin).origin) throw new Error('Audit request must remain on its configured origin.');
    const response = await fetcher(url, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' },
    });
    if (!response.ok) throw new Error(`Read-only audit request failed (HTTP ${response.status}).`);
    return response;
  };
}

export async function rows(read, table, select = '*', order = 'id') {
  const records = [];
  for (let offset = 0; ;) {
    const response = await read(`/rest/v1/${table}?select=${encodeURIComponent(select)}&order=${order}&offset=${offset}&limit=1000`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('Unexpected audit table response.');
    records.push(...batch);
    offset += batch.length;
    const total = Number(response.headers.get('content-range')?.split('/')[1]);
    if (!batch.length || (Number.isFinite(total) && records.length >= total)) return records;
  }
}

export function summarizeContent(content) {
  const byKind = {}, winners = {};
  for (const record of content) {
    const key = `${record.kind}:${record.status}`;
    byKind[key] = (byKind[key] || 0) + 1;
    if (['yardWinner', 'holidayWinner'].includes(record.kind)) {
      const season = record.kind === 'yardWinner' ? 'yard' : record.settings?.holiday || 'christmas';
      const year = record.settings?.year || String(record.settings?.month || '').slice(0, 4) || 'unspecified';
      const group = `${season}:${year}`;
      winners[group] = (winners[group] || 0) + 1;
    }
  }
  return { total: content.length, locallyEdited: content.filter(row => row.locally_edited).length, byKind, winners };
}

async function accountSummary(read, local = false) {
  let total = 0, knownLocalTestAccount = 0;
  for (let page = 1; ; page++) {
    const result = await (await read(`/auth/v1/admin/users?page=${page}&per_page=1000`)).json();
    if (!Array.isArray(result.users)) throw new Error('Unexpected account inventory response.');
    total += result.users.length;
    if (local) knownLocalTestAccount += result.users.filter(user => user.email === 'admin@cypressdale.test').length;
    if (result.users.length < 1000) break;
  }
  return { total, ...(local ? { knownLocalTestAccount, otherAccountsToPreserve: total - knownLocalTestAccount } : {}) };
}

async function main() {
  const index = process.argv.indexOf('--source-env');
  if (index === -1 || !process.argv[index + 1]) throw new Error('Provide --source-env pointing to the existing website environment file.');
  const environment = parseEnv(await readFile(path.resolve(projectRoot, process.argv[index + 1]), 'utf8'));
  const origin = new URL(environment.NEXT_PUBLIC_SUPABASE_URL || '');
  if (origin.protocol !== 'https:' || !origin.hostname.endsWith('.supabase.co') || origin.username || origin.password
    || origin.pathname !== '/' || origin.search || origin.hash || !environment.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Expected existing hosted Supabase configuration; no credentials are printed.');
  }
  stage = 'local stack status';
  const local = getLocalStatus();
  const hostedRead = readOnlyClient(origin.origin, environment.SUPABASE_SERVICE_ROLE_KEY);
  const localRead = readOnlyClient(local.API_URL, local.SERVICE_ROLE_KEY);
  stage = 'hosted API schema';
  const schema = await (await hostedRead('/rest/v1/')).json();
  const definitions = schema.definitions || schema.components?.schemas;
  if (!definitions) throw new Error('Hosted schema discovery is unavailable; do not infer that tables are absent.');
  const hosted = {};
  for (const table of tables) {
    stage = `hosted table count: ${table}`;
    const definition = definitions[table];
    if (!definition) { hosted[table] = { exposed: false }; continue; }
    const response = await hostedRead(`/rest/v1/${table}?select=id&limit=0`);
    const total = response.headers.get('content-range')?.split('/')[1];
    hosted[table] = { exposed: true, rows: total && total !== '*' ? Number(total) : null,
      columns: Object.keys(definition.properties || {}).sort() };
  }
  stage = 'local content and asset inventory';
  const content = await rows(localRead, 'hoa_content');
  const assets = await rows(localRead, 'hoa_assets');
  const references = await rows(localRead, 'hoa_content_assets', 'content_id,asset_id', 'content_id,asset_id');
  const contentIds = new Set(content.map(row => row.id)), assetIds = new Set(assets.map(row => row.id));
  stage = 'local asset verification';
  let verified = 0, bytes = 0;
  const assetFailures = [];
  for (const asset of assets) {
    try {
      const objectPath = asset.object_path.split('/').map(encodeURIComponent).join('/');
      const stored = await (await localRead(`/storage/v1/object/authenticated/hoa-content/${objectPath}`)).arrayBuffer();
      if (hash(Buffer.from(stored)) !== asset.sha256 || stored.byteLength !== Number(asset.size_bytes)) {
        throw new Error('Asset integrity mismatch.');
      }
      verified++; bytes += stored.byteLength;
    } catch { assetFailures.push(hash(asset.id)); }
  }
  const localCounts = {};
  for (const table of tables.filter(value => value !== 'resident_map_entries')) {
    stage = `local table count: ${table}`;
    const response = await localRead(`/rest/v1/${table}?select=${table === 'hoa_content_assets' ? 'asset_id' : 'id'}&limit=0`);
    const total = response.headers.get('content-range')?.split('/')[1];
    localCounts[table] = total && total !== '*' ? Number(total) : null;
  }
  const migrations = [];
  for (const file of (await readdir(path.join(projectRoot, 'supabase/migrations'))).filter(file => file.endsWith('.sql')).sort()) {
    migrations.push({ file, sha256: hash(await readFile(path.join(projectRoot, 'supabase/migrations', file))) });
  }
  stage = 'hosted storage inventory';
  const buckets = await (await hostedRead('/storage/v1/bucket')).json();
  stage = 'account inventory';
  const hostedAccounts = await accountSummary(hostedRead);
  const localAccounts = await accountSummary(localRead, true);
  const report = {
    version: 1, capturedAt: new Date().toISOString(), readOnly: true, isBackup: false,
    projectFingerprint: hash(origin.origin), hosted, hostedExposedTables: Object.keys(definitions).sort(),
    hostedBucketNames: buckets.map(bucket => bucket.name), hostedAccounts,
    local: { counts: localCounts, accounts: localAccounts, content: summarizeContent(content),
      assets: { total: assets.length, verified, verifiedBytes: bytes, failures: assetFailures,
        files: assets.filter(asset => asset.library === 'files').length,
        documents: assets.filter(asset => asset.library === 'documents').length },
      relationships: { total: references.length,
        broken: references.filter(row => !contentIds.has(row.content_id) || !assetIds.has(row.asset_id)).length } },
    migrations,
    limitations: ['API schema is not a full database catalog or backup.',
      'Private schemas, SQL functions, triggers, RLS policies and hosted migration history require a separate catalog review.',
      'Vercel project settings and deployed environment values have not been verified.',
      'Auth identities, existing emailed tokens and subscriber consent require explicit reconciliation before transfer.'],
  };
  const directory = path.join(projectRoot, 'backups', `production-audit-${report.capturedAt.replace(/[:.]/g, '-')}`);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'report.json'), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ report: path.relative(projectRoot, path.join(directory, 'report.json')), ...report }, null, 2));
  if (assetFailures.length || report.local.relationships.broken) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    const detail = /^Read-only audit request failed \(HTTP \d+\)\.$/.test(error.message) ? ` ${error.message}` : '';
    console.error(`Production audit stopped at ${stage}.${detail} No hosted writes were attempted. Secrets and response bodies are not logged.`);
    process.exitCode = 1;
  });
}
