import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyArchiveContents } from './backup-local.mjs';

const entries = [
  'public hoa_content', 'public hoa_assets', 'public hoa_content_assets', 'public hoa_profiles',
  'public hoa_comments', 'public hoa_rsvps', 'public newsletter_subscribers', 'public newsletter_runs',
  'public newsletter_deliveries', 'auth users', 'storage objects', 'hoa_private content_retirements',
  'hoa_private asset_retirements', 'hoa_private newsletter_retirements',
];
const toc = entries.map((entry, index) => `${index}; 0 0 TABLE DATA ${entry} postgres`).join('\n');

test('local backup verification requires content, relationships, Auth and retirement data', () => {
  assert.equal(verifyArchiveContents(toc, './\n./bucket/\n./bucket/file\n'), 1);
  assert.throws(() => verifyArchiveContents(toc.replace('TABLE DATA auth users ', 'TABLE auth users '), './file\n'), /auth.users/);
  assert.throws(() => verifyArchiveContents(toc.replace('TABLE DATA hoa_private asset_retirements ', ''), './file\n'), /asset_retirements/);
});

test('an empty storage archive cannot be marked verified', () => {
  assert.throws(() => verifyArchiveContents(toc, './\n./bucket/\n'), /no files/);
});
