import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { legacySchema } from './fixtures/existing-project-schema.mjs';
import { buildExistingProjectBaseline } from './prepare-existing-project.mjs';
import { buildTransferPlan, transferTables } from './transfer-model.mjs';
import { buildTransferSql, subscriberColumns } from './transfer-sql.mjs';
import { sha256, validateAsset } from './prepare-transfer.mjs';
import { transferObjects } from './upload-transfer.mjs';

const id = '10000000-0000-0000-0000-000000000001';
const users = [{ id, email: 'owner@example.test', email_confirmed_at: '2026-10-14T12:00:00Z' }];
const bytes = Buffer.from('photo');
const asset = { id: 'upload-kept', bucket_id: 'hoa-content', object_path: 'uploads/kept.jpg',
  original_filename: 'kept.jpg', mime_type: 'image/jpeg', size_bytes: bytes.length, sha256: sha256(bytes), file: 'objects/00000.bin' };
async function setup() {
  const db = new PGlite();
  await db.exec(legacySchema);
  const subscribers = (await db.query('select * from public.newsletter_subscribers')).rows;
  await db.exec((await buildExistingProjectBaseline()).sql);
  await db.query('insert into storage.objects(bucket_id,name) values ($1,$2)', [asset.bucket_id, asset.object_path]);
  await db.query('insert into auth.users(id,email,email_confirmed_at) values ($1,$2,$3)', [id, users[0].email, users[0].email_confirmed_at]);
  const snapshot = Object.fromEntries(transferTables.map(table => [table, []]));
  snapshot['auth.users'] = users;
  snapshot['public.newsletter_subscribers'] = [];
  snapshot['public.hoa_profiles'] = [{ id, full_name: 'Owner', role: 'admin', membership_status: 'approved' }];
  snapshot['public.hoa_content'] = [{ id: 'kept-winner', kind: 'yardWinner', title: "Owner's yard", version: 7,
    locally_edited: true, settings: { description: 'Keep\n\n  whitespace' } }];
  const { file, ...metadata } = asset;
  snapshot['public.hoa_assets'] = [metadata];
  return { db, subscribers, plan: buildTransferPlan(snapshot, subscribers, users) };
}

test('generated SQL preserves real content and legacy newsletter rows, then rejects repeat import', async () => {
  const { db, subscribers, plan } = await setup();
  try {
    const history = (await db.query('select * from public.newsletter_runs order by id')).rows;
    const sql = buildTransferSql(plan, subscribers, users);
    await db.exec(sql);
    const row = (await db.query("select * from public.hoa_content where id='kept-winner'")).rows[0];
    assert.equal(row.title, "Owner's yard"); assert.equal(row.version, 7);
    assert.equal(row.settings.description, 'Keep\n\n  whitespace');
    assert.deepEqual((await db.query('select * from public.newsletter_runs order by id')).rows, history);
    assert.deepEqual((await db.query(`select ${subscriberColumns.join(',')} from public.newsletter_subscribers`)).rows, subscribers);
    assert.equal((await db.query('select role from public.hoa_profiles where id=$1', [id])).rows[0].role, 'admin');
    await assert.rejects(db.exec(sql), /not pristine/); await db.exec('rollback');
  } finally { await db.close(); }
});
test('SQL blocks changed consent and unverified identities, and rolls back later failures', async () => {
  for (const scenario of ['consent', 'identity', 'storage', 'failure']) {
    const { db, subscribers, plan } = await setup();
    try {
      if (scenario === 'consent') await db.exec('update public.newsletter_subscribers set active=false');
      if (scenario === 'identity') await db.exec('update auth.users set email_confirmed_at=null');
      if (scenario === 'storage') await db.exec("delete from storage.objects where bucket_id='hoa-content'");
      if (scenario === 'failure') plan.tables['public.hoa_content'][0].title = null;
      await assert.rejects(db.exec(buildTransferSql(plan, subscribers, users)),
        scenario === 'consent' ? /subscribers changed/ : scenario === 'identity' ? /mapping changed/ : scenario === 'storage' ? /files are missing/ : /not-null/);
      await db.exec('rollback');
      assert.equal((await db.query('select count(*)::int as n from public.hoa_assets')).rows[0].n, 0);
      assert.equal((await db.query("select count(*)::int as n from pg_trigger where tgname in ('hoa_content_version','hoa_profile_guard') and tgenabled='O'")).rows[0].n, 2);
    } finally { await db.close(); }
  }
});
test('SQL generation requires a resolved plan and rejects unexpected columns', async () => {
  const { db, subscribers, plan } = await setup();
  try {
    assert.throws(() => buildTransferSql({ ...plan, ready: false }, subscribers, users), /Resolve/);
    assert.throws(() => buildTransferSql({ ...plan, tables: { ...plan.tables, 'public.hoa_profiles': [] } }, subscribers, users), /administrator/);
    plan.tables['public.hoa_content'][0]['unsafe-column'] = 'no';
    assert.throws(() => buildTransferSql(plan, subscribers, users), /columns/);
  } finally { await db.close(); }
});
test('asset transfer defaults to dry run, verifies uploads and resumes without overwriting', async () => {
  const objects = new Map(); let uploads = 0;
  const remote = { download: async item => objects.get(item.id) ?? null,
    upload: async (item, data) => { uploads++; objects.set(item.id, data); } };
  assert.deepEqual(await transferObjects([asset], async () => bytes, remote), { verified: 0, uploaded: 0, missing: 1 });
  assert.equal(uploads, 0);
  assert.deepEqual(await transferObjects([asset], async () => bytes, remote, true), { verified: 1, uploaded: 1, missing: 1 });
  assert.deepEqual(await transferObjects([asset], async () => bytes, remote, true), { verified: 1, uploaded: 0, missing: 0 });
  assert.equal(uploads, 1);
  objects.set(asset.id, Buffer.from('different'));
  await assert.rejects(transferObjects([asset], async () => bytes, remote, true), /checksum/);
  assert.equal(uploads, 1);
});
test('corrupt package bytes fail before uploads; unsafe object paths and buckets fail closed', async () => {
  let uploads = 0;
  await assert.rejects(transferObjects([asset, { ...asset, id: 'second' }], async item => item.id === 'second' ? Buffer.from('bad') : bytes,
    { download: async () => null, upload: async () => { uploads++; } }, true), /checksum/);
  assert.equal(uploads, 0);
  for (const object_path of ['../escape', '/absolute', 'folder/../escape', 'folder\\escape', 'folder?query', 'folder//empty'])
    assert.throws(() => validateAsset({ ...asset, object_path }), /metadata/);
  assert.throws(() => validateAsset({ ...asset, bucket_id: 'chat-uploads' }), /metadata/);
});
