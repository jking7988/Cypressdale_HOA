import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getLocalStatus, projectRoot } from '../member-hub/local.mjs';
import { parseExport } from './legacy-export.mjs';
import { buildImport } from './content-model.mjs';

const root = path.join(projectRoot, 'backups');
let directory;
for (const name of (await readdir(root)).sort().reverse()) {
  const candidate = path.join(root, name);
  try { if (JSON.parse(await readFile(path.join(candidate, 'inventory.json'), 'utf8')).complete) { directory = candidate; break; } }
  catch { /* Incomplete exports are not candidates. */ }
}
if (!directory) throw new Error('No verified migration archive found.');
const raw = await readFile(path.join(directory, 'data.ndjson'), 'utf8');
const inventory = JSON.parse(await readFile(path.join(directory, 'inventory.json'), 'utf8'));
if (createHash('sha256').update(raw).digest('hex') !== inventory.exportSha256) throw new Error('Backup checksum mismatch.');
const documents = parseExport(raw);
const plan = buildImport(documents);
const documentAssets = new Set(plan.content.filter(row => row.kind === 'documentFile').map(row => row.settings.file?.asset?._ref).filter(Boolean));
const manifest = JSON.parse(await readFile(path.join(directory, 'asset-manifest.json'), 'utf8'));
const status = getLocalStatus();
const service = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const check = result => { if (result.error) throw new Error(`Local import failed (${result.error.code || 'storage'}).`); return result.data; };
const retiredAssets = new Set(check(await service.rpc('hoa_retired_asset_ids')));
console.log('Importing verified assets into isolated local Supabase...');
for (const asset of manifest) {
  if (retiredAssets.has(asset.id)) continue;
  const filePath = path.resolve(directory, asset.relativePath);
  if (!filePath.startsWith(`${directory}${path.sep}`)) throw new Error('Asset path is outside the backup.');
  const bytes = await readFile(filePath);
  if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error('Asset checksum mismatch.');
  const source = documents.find(document => document._id === asset.id);
  const existing = check(await service.from('hoa_assets').select('sha256').eq('id', asset.id).maybeSingle());
  if (existing && existing.sha256 !== asset.sha256) throw new Error('Existing local asset differs from the backup.');
  await service.storage.from('hoa-content').upload(asset.relativePath, bytes, { contentType: source.mimeType, upsert: false });
  // Verify new and pre-existing bytes; never overwrite an object on repeat import.
  const saved = check(await service.storage.from('hoa-content').download(asset.relativePath));
  if (createHash('sha256').update(Buffer.from(await saved.arrayBuffer())).digest('hex') !== asset.sha256) throw new Error('Stored asset checksum mismatch.');
  check(await service.from('hoa_assets').upsert({ id: asset.id, library: documentAssets.has(asset.id) ? 'documents' : 'files', object_path: asset.relativePath,
    original_filename: source.originalFilename || path.basename(asset.relativePath), mime_type: source.mimeType,
    size_bytes: bytes.length, sha256: asset.sha256, metadata: source.metadata?.dimensions ? { dimensions: source.metadata.dimensions } : {} }, { onConflict: 'id', ignoreDuplicates: true }));
}
let imported = 0;
for (const document of plan.content) if (check(await service.rpc('hoa_import_content', { document }))) imported++;
const existingIds = new Set(check(await service.from('hoa_content').select('id')).map(row => row.id));
const comments = plan.comments.filter(row => existingIds.has(row.content_id));
const rsvps = plan.rsvps.filter(row => existingIds.has(row.content_id));
const contactIds = new Set([...comments, ...rsvps].map(row => row.source_id));
for (const [table, rows] of [['hoa_comments', comments], ['hoa_rsvps', rsvps]]) {
  if (rows.length) check(await service.from(table).upsert(rows, { onConflict: 'source_id', ignoreDuplicates: true }));
}
for (const parent of plan.parents) {
  if (!comments.some(row => row.id === parent.id) || !comments.some(row => row.id === parent.parent_id)) continue;
  const current = check(await service.from('hoa_comments').select('parent_id').eq('id', parent.id).single());
  if (!current.parent_id) check(await service.from('hoa_comments').update({ parent_id: parent.parent_id }).eq('id', parent.id));
}
const contacts = plan.contacts.filter(row => contactIds.has(row.source_id));
if (contacts.length) check(await service.rpc('hoa_import_legacy_contacts', { entries: contacts }));
console.log(JSON.stringify({ assets: manifest.length, content: plan.content.length, importedOrUpdated: imported,
  unchangedOrLocallyEdited: plan.content.length - imported, comments: plan.comments.length, rsvps: plan.rsvps.length }, null, 2));
