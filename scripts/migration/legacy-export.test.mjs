import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeDocuments, parseExport } from './legacy-export.mjs';

test('export parsing retains drafts and raw nested content and rejects partial exports', () => {
  const documents = [{ _id: 'drafts.news', _type: 'post', sections: [{ _type: 'imageWithText', image: { asset: { _ref: 'image-1' } } }] }];
  assert.deepEqual(parseExport(`${JSON.stringify(documents[0])}\r\n`), documents);
  assert.throws(() => parseExport('{"_id":"truncated"'));
  assert.throws(() => parseExport('{"error":"permission denied"}'));
  assert.throws(() => parseExport(documents.map(() => JSON.stringify(documents[0])).concat(JSON.stringify(documents[0])).join('\n')));
});

test('inventory detects nested missing assets and preserves both RSVP formats', () => {
  const inventory = analyzeDocuments([
    { _id: 'drafts.post', _type: 'post', sections: [{ _type: 'imageWithText', image: { asset: { _ref: 'missing' } } }] },
    { _id: 'event', _type: 'event', rsvps: [{ name: 'Private Name' }, { name: 'Another Name' }] },
    { _id: 'rsvp', _type: 'rsvpResponse', event: { _ref: 'event' } },
    { _id: 'comment', _type: 'eventComment', post: { _ref: 'post' }, parentComment: { _ref: 'removed', _weak: true } },
  ]);
  assert.equal(inventory.embeddedRsvps, 2);
  assert.equal(inventory.counts.rsvpResponse, 1);
  assert.equal(inventory.drafts, 1);
  assert.equal(inventory.sectionTypes.imageWithText, 1);
  assert.deepEqual(inventory.unresolvedReferences.map((ref) => ref.reference), ['missing', 'removed']);
  assert.ok(!JSON.stringify(inventory).includes('Private Name'));
});

