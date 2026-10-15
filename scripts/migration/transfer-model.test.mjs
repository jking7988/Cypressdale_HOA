import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { buildExistingProjectBaseline } from './prepare-existing-project.mjs';
import { buildTransferPlan, applyRehearsalPlan } from './transfer-model.mjs';
import { legacySchema } from './fixtures/existing-project-schema.mjs';

const user = '10000000-0000-0000-0000-000000000001';
const testUser = '10000000-0000-0000-0000-000000000002';
const mappedUser = '20000000-0000-0000-0000-000000000001';
const now = '2026-10-14T12:00:00+00:00';
const hostedUsers = [{ id: mappedUser, email: 'owner@example.test', email_confirmed_at: now }];
const hash = value => createHash('sha256').update(value).digest('hex');
function content(id, kind = 'page', settings = {}) {
  return { id, kind, title: id, slug: null, status: 'published', visibility: 'public', body: [], sections: [], settings,
    source_revision: null, version: 7, locally_edited: true, created_at: now, updated_at: now, published_at: now };
}
function profile(id) { return { id, full_name: 'Preserved admin', address: 'Preserved address', role: 'admin', membership_status: 'approved', approved_at: now, created_at: now, updated_at: now }; }
export function sourceFixture() {
  return {
    'auth.users': [
      { id: user, email: 'owner@example.test', email_confirmed_at: now, encrypted_password: 'DO_NOT_TRANSFER_PASSWORD' },
      { id: testUser, email: 'admin@cypressdale.test', email_confirmed_at: now },
    ],
    'public.hoa_profiles': [profile(user), profile(testUser)],
    'public.hoa_content': [content('program-yard-of-the-month'), content('program-holiday-decorating'), content('program-halloween-decorating'),
      content('folder', 'documentFolder'), content('document', 'documentFile', { folder: { _ref: 'folder' }, file: { asset: { _ref: 'file-original' } } }),
      content('yard-original', 'yardWinner', { year: 2026, month: 8, description: 'Keep\n\n  spaces', photos: [{ asset: { _ref: 'upload-original' } }] })],
    'public.hoa_assets': [
      { id: 'upload-original', object_path: 'photo.jpg', original_filename: 'original.jpg', mime_type: 'image/jpeg', size_bytes: 5, sha256: 'a'.repeat(64), bucket_id: 'hoa-content', metadata: {}, library: 'files', created_at: now },
      { id: 'file-original', object_path: 'document.pdf', original_filename: 'document.pdf', mime_type: 'application/pdf', size_bytes: 5, sha256: 'b'.repeat(64), bucket_id: 'hoa-content', metadata: {}, library: 'documents', created_at: now },
    ],
    'public.hoa_content_assets': [{ content_id: 'yard-original', asset_id: 'upload-original' }, { content_id: 'document', asset_id: 'file-original' }],
    'public.hoa_comments': [
      { id: '30000000-0000-0000-0000-000000000001', source_id: null, content_id: 'yard-original', parent_id: null, author_id: user, display_name: 'Preserved name', message: 'Keep this', created_at: now },
      { id: '30000000-0000-0000-0000-000000000002', source_id: null, content_id: 'yard-original', parent_id: '30000000-0000-0000-0000-000000000001', author_id: testUser, display_name: 'Old test name', message: 'Keep reply', created_at: now },
    ],
    'public.hoa_rsvps': [{ id: '40000000-0000-0000-0000-000000000001', source_id: null, content_id: 'yard-original', author_id: testUser, display_name: 'Old test name', status: 'yes', created_at: now }],
    'public.newsletter_subscribers': [{ id: '50000000-0000-0000-0000-000000000001', email: 'active@example.test', name: 'Keep Name', street: 'Keep Street', active: true, verified: true }],
    'hoa_private.content_retirements': [{ source_id: 'removed-source' }],
    'hoa_private.asset_retirements': [{ id: 'removed-asset', bucket_id: 'hoa-content', object_path: 'removed.jpg', removed_at: now, cleaned_at: now }],
    'hoa_private.newsletter_retirements': [{ email_hash: hash('unsubscribed@example.test'), removed_at: now }],
    'hoa_private.legacy_contacts': [{ source_id: 'legacy-comment', verified_owner_id: user, email: 'owner@example.test' }],
  };
}

test('transfer plan blocks unresolved accounts and differing consent instead of guessing', () => {
  const snapshot = sourceFixture();
  const before = JSON.stringify(snapshot);
  const missing = buildTransferPlan(snapshot, [], []);
  assert.equal(missing.ready, false);
  assert.equal(missing.missingAccounts.length, 1);
  assert.equal(missing.excludedTestAccounts, 1);
  const conflicts = buildTransferPlan(snapshot, [{ ...snapshot['public.newsletter_subscribers'][0], active: false }], hostedUsers);
  assert.equal(conflicts.ready, false);
  assert.deepEqual(conflicts.subscriberConflicts[0].fields, ['active']);
  assert.equal(JSON.stringify(snapshot), before);
});

test('account mapping retains content while clearing only test authors; passwords never enter transfer plans', () => {
  const plan = buildTransferPlan(sourceFixture(), [], hostedUsers);
  assert.equal(plan.ready, true);
  assert.equal(plan.tables['public.hoa_profiles'].length, 1);
  assert.equal(plan.tables['public.hoa_profiles'][0].id, mappedUser);
  assert.equal(plan.tables['public.hoa_comments'][0].author_id, mappedUser);
  assert.equal(plan.tables['public.hoa_comments'][1].author_id, null);
  assert.equal(plan.tables['public.hoa_comments'][1].display_name, 'User Cleared');
  assert.equal(plan.tables['public.hoa_rsvps'][0].display_name, 'User Cleared');
  assert.equal(plan.tables['public.hoa_content'].length, 6);
  assert.equal(JSON.stringify(plan).includes('DO_NOT_TRANSFER_PASSWORD'), false);
});

test('transfer validation rejects missing assets, broken folders and retired active data', () => {
  for (const change of [
    snapshot => { snapshot['public.hoa_assets'] = []; },
    snapshot => { snapshot['public.hoa_content'].find(row => row.id === 'document').settings.folder._ref = 'missing'; },
    snapshot => { snapshot['hoa_private.content_retirements'].push({ source_id: 'yard-original' }); },
    snapshot => { snapshot['public.hoa_content'].find(row => row.id === 'yard-original').settings.extra = { asset: { _ref: 'upload-missing' } }; },
  ]) {
    const snapshot = sourceFixture(); change(snapshot);
    assert.throws(() => buildTransferPlan(snapshot, [], hostedUsers), /Broken|Missing|conflicts/);
  }
});

test('unknown profiles and duplicate identity mappings are not silently discarded', () => {
  const missing = sourceFixture();
  missing['public.hoa_profiles'].pop();
  assert.throws(() => buildTransferPlan(missing, [], hostedUsers), /relationship is incomplete/);
  const duplicated = sourceFixture();
  duplicated['auth.users'].push({ id: '60000000-0000-0000-0000-000000000001', email: 'owner@example.test' });
  assert.throws(() => buildTransferPlan(duplicated, [], hostedUsers), /Duplicate source email/);
});

test('actual SQL rehearsal retains content versions, folder/file assignments and live subscriber identities', async () => {
  const db = new PGlite();
  try {
    await db.exec(legacySchema);
    const subscribersBefore = (await db.query('select * from public.newsletter_subscribers order by email')).rows;
    const historyBefore = (await db.query('select * from public.newsletter_runs order by id')).rows;
    await db.exec((await buildExistingProjectBaseline()).sql);
    await db.query('insert into auth.users(id,email,email_confirmed_at) values ($1,$2,$3)', [mappedUser, 'owner@example.test', now]);
    const snapshot = sourceFixture();
    const plan = buildTransferPlan(snapshot, subscribersBefore, hostedUsers);
    assert.equal(plan.ready, true);
    assert.equal(plan.subscribersToInsert.length, 0);
    await applyRehearsalPlan(db, plan);
    const yard = (await db.query("select * from public.hoa_content where id='yard-original'")).rows[0];
    assert.equal(yard.version, 7);
    assert.equal(yard.settings.description, 'Keep\n\n  spaces');
    assert.equal(yard.locally_edited, true);
    assert.equal((await db.query("select settings->'folder'->>'_ref' as folder from public.hoa_content where id='document'")).rows[0].folder, 'folder');
    assert.equal((await db.query('select count(*)::int as n from public.hoa_content_assets')).rows[0].n, 2);
    assert.equal((await db.query('select count(*)::int as n from public.hoa_content')).rows[0].n, 6);
    assert.equal((await db.query('select count(*)::int as n from public.hoa_newsletter_runs')).rows[0].n, 0);
    assert.deepEqual((await db.query('select * from public.newsletter_runs order by id')).rows, historyBefore);
    const live = (await db.query("select * from public.newsletter_subscribers where email='active@example.test'")).rows[0];
    assert.equal(live.id, subscribersBefore.find(row => row.email === live.email).id);
    assert.equal((await db.query("select count(*)::int as n from public.newsletter_subscribers where email='unsubscribed@example.test'")).rows[0].n, 0);
    assert.equal((await db.query('select count(*)::int as n from public.hoa_profiles')).rows[0].n, 1);
    assert.equal((await db.query("select count(*)::int as n from pg_trigger where tgname in ('hoa_content_version','hoa_profile_guard') and tgenabled='O'")).rows[0].n, 2);
    await assert.rejects(applyRehearsalPlan(db, plan), /already contains/);
  } finally { await db.close(); }
});

test('rehearsal refuses remote clients and rolls back transfer failures', async () => {
  await assert.rejects(applyRehearsalPlan({ query() { throw new Error('Must not be called'); } }, { ready: true }), /disposable PGlite/);
  const db = new PGlite();
  try {
    await db.exec(legacySchema);
    const subscribers = (await db.query('select * from public.newsletter_subscribers')).rows;
    await db.exec((await buildExistingProjectBaseline()).sql);
    await db.query('insert into auth.users(id,email,email_confirmed_at) values ($1,$2,$3)', [mappedUser, 'owner@example.test', now]);
    const plan = buildTransferPlan(sourceFixture(), subscribers, hostedUsers);
    plan.tables['public.hoa_comments'][0].message = '';
    await assert.rejects(applyRehearsalPlan(db, plan), /check constraint/);
    assert.equal((await db.query('select count(*)::int as n from public.hoa_assets')).rows[0].n, 0);
    assert.equal((await db.query('select count(*)::int as n from public.newsletter_subscribers')).rows[0].n, subscribers.length);
    assert.equal((await db.query("select count(*)::int as n from pg_trigger where tgname in ('hoa_content_version','hoa_profile_guard') and tgenabled='O'")).rows[0].n, 2);
  } finally { await db.close(); }
});
