import test from 'node:test';
import assert from 'node:assert/strict';
import { readOnlyClient, summarizeContent } from './production-audit.mjs';

test('production audit transport permits only same-origin GET requests without redirects', async () => {
  const calls = [];
  const read = readOnlyClient('https://example.supabase.co', 'private-test-key', async (url, options) => {
    calls.push({ url, options });
    return new Response('{}');
  });
  await read('/rest/v1/hoa_content?select=id&limit=0');
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.redirect, 'error');
  await assert.rejects(read('https://another.supabase.co/rest/v1/'), /configured origin/);
  assert.equal(calls.length, 1);
});

test('production audit never includes private response bodies in HTTP errors', async () => {
  const read = readOnlyClient('https://example.supabase.co', 'private-test-key', async () => new Response('secret response', { status: 403 }));
  await assert.rejects(read('/rest/v1/'), { message: 'Read-only audit request failed (HTTP 403).' });
});

test('inventory retains drafts and locally edited winners without printing content or inferring deletion', () => {
  const summary = summarizeContent([
    { id: 'a', kind: 'yardWinner', status: 'published', locally_edited: true, title: 'Private name', settings: { year: 2026 } },
    { id: 'b', kind: 'holidayWinner', status: 'published', settings: { holiday: 'halloween', year: 2026 } },
    { id: 'drafts.a', kind: 'event', status: 'draft' },
  ]);
  assert.equal(summary.total, 3);
  assert.equal(summary.locallyEdited, 1);
  assert.equal(summary.byKind['event:draft'], 1);
  assert.deepEqual(summary.winners, { 'yard:2026': 1, 'halloween:2026': 1 });
  assert.equal(JSON.stringify(summary).includes('Private name'), false);
});
