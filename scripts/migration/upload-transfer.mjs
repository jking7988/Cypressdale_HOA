import { readFile, writeFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { projectRoot } from '../member-hub/local.mjs';
import { destinationEnvironment, sha256, validateAsset } from './prepare-transfer.mjs';

export async function transferObjects(assets, load, remote, apply = false) {
  const report = { verified: 0, uploaded: 0, missing: 0 };
  const check = (bytes, asset) => {
    if (sha256(bytes) !== asset.sha256 || bytes.length !== Number(asset.size_bytes)) throw new Error('File checksum mismatch; no overwrite is allowed.');
  };
  // Verify every local byte before any upload, including on resumed transfers.
  for (const asset of assets) { validateAsset(asset); check(await load(asset), asset); }
  for (const asset of assets) {
    const existing = await remote.download(asset);
    if (existing !== null) { check(existing, asset); report.verified++; continue; }
    report.missing++;
    if (!apply) continue;
    const bytes = await load(asset); check(bytes, asset);
    await remote.upload(asset, bytes);
    const stored = await remote.download(asset);
    if (stored === null) throw new Error('Uploaded file could not be verified.');
    check(stored, asset); report.uploaded++; report.verified++;
  }
  return report;
}

async function main() {
  const option = name => { const i = process.argv.indexOf(name); if (i < 0 || !process.argv[i + 1]) throw new Error(`Provide ${name}.`); return process.argv[i + 1]; };
  const root = await realpath(path.join(projectRoot, '.deployment'));
  const directory = await realpath(path.resolve(projectRoot, option('--bundle')));
  if (path.dirname(directory) !== root || !/^transfer-[0-9TZ-]+$/.test(path.basename(directory))) throw new Error('Expected a private transfer package.');
  const raw = await readFile(path.join(directory, 'manifest.json'));
  const manifest = JSON.parse(raw);
  if (!manifest.complete || manifest.version !== 1 || !Array.isArray(manifest.assets)) throw new Error('Incomplete transfer package.');
  const source = await readFile(path.join(directory, 'source.json'));
  if (sha256(source) !== manifest.sourceSha256) throw new Error('Transfer source changed.');
  const sourceAssets = JSON.parse(source)['public.hoa_assets'];
  if (manifest.assets.length !== sourceAssets.length || new Set(manifest.assets.map(asset => asset.object_path)).size !== sourceAssets.length
    || manifest.assets.some(asset => !sourceAssets.some(row => row.id === asset.id && row.object_path === asset.object_path
      && row.sha256 === asset.sha256 && Number(row.size_bytes) === Number(asset.size_bytes) && row.mime_type === asset.mime_type))) throw new Error('Asset manifest differs from source.');
  const destination = await destinationEnvironment(option('--source-env'));
  if (destination.fingerprint !== manifest.projectFingerprint) throw new Error('Destination differs from prepared project.');
  const apply = process.argv.includes('--apply');
  if (apply) {
    if (option('--confirm-project') !== manifest.projectFingerprint || option('--confirm-manifest') !== sha256(raw)) throw new Error('Explicit project and manifest confirmation required.');
    if (manifest.missingAccounts.length || manifest.subscriberConflicts.length || !manifest.sqlSha256
      || sha256(await readFile(path.join(directory, 'transfer.sql'))) !== manifest.sqlSha256) throw new Error('Resolve transfer preparation gates before uploading.');
  }
  const headers = { apikey: destination.key, Authorization: `Bearer ${destination.key}` };
  const request = (endpoint, init = {}) => fetch(new URL(endpoint, destination.origin),
    { ...init, redirect: 'error', signal: AbortSignal.timeout(60000), headers: { ...headers, ...init.headers } });
  const bucketResponse = await request('/storage/v1/bucket');
  if (!bucketResponse.ok) throw new Error('Unable to inspect destination buckets.');
  const buckets = await bucketResponse.json();
  const bucket = buckets.find(item => item.id === 'hoa-content');
  if (bucket?.public) throw new Error('Destination content bucket must be private.');
  if (apply && !bucket) throw new Error('Apply the reviewed schema candidate before uploading.');
  const objectUrl = asset => `/storage/v1/object/${asset.bucket_id}/${asset.object_path.split('/').map(encodeURIComponent).join('/')}`;
  const remote = {
    async download(asset) {
      if (!bucket) return null;
      const response = await request(objectUrl(asset));
      if (response.ok) return Buffer.from(await response.arrayBuffer());
      const error = await response.json().catch(() => null);
      if ([400, 404].includes(response.status) && String(error?.statusCode) === '404' && error?.error === 'not_found') return null;
      throw new Error('Unable to verify destination file; refusing to assume it is missing.');
    },
    async upload(asset, bytes) {
      const response = await request(objectUrl(asset), { method: 'POST', headers: { 'Content-Type': asset.mime_type, 'x-upsert': 'false' }, body: bytes });
      if (!response.ok) throw new Error('Upload stopped; existing objects were not overwritten. Recheck and resume.');
    },
  };
  const load = async asset => {
    if (!/^objects\/[0-9]{5}\.bin$/.test(asset.file)) throw new Error('Invalid package file path.');
    const resolved = await realpath(path.join(directory, asset.file));
    if (!resolved.startsWith(directory + path.sep)) throw new Error('Package file escaped its directory.');
    return readFile(resolved);
  };
  const report = await transferObjects(manifest.assets, load, remote, apply);
  if (apply) await writeFile(path.join(directory, `upload-receipt-${Date.now()}.json`), JSON.stringify({ ...report,
    manifestSha256: sha256(raw), projectFingerprint: destination.fingerprint, verifiedAt: new Date().toISOString() }, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ ...report, dryRun: !apply, bucketReady: Boolean(bucket), manifestSha256: sha256(raw),
    projectFingerprint: destination.fingerprint, databaseChanged: false }, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); console.error('No files were deleted. If applying, earlier verified uploads remain and can be resumed.'); process.exitCode = 1; });
}
