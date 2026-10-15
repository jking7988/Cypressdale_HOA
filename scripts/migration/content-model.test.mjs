import test from 'node:test';
import assert from 'node:assert/strict';
import { buildImport } from './content-model.mjs';

test('import preserves sections and separates private contact data from public content', () => {
  const base = { _createdAt: '2026-01-01T00:00:00Z', _updatedAt: '2026-01-01T00:00:00Z', _rev: 'rev' };
  const section = { _key: 'section', _type: 'textSection', titleSize: 32, body: [{ _type: 'block', children: [{ _type: 'span', text: 'Preserved', marks: ['strong'] }] }] };
  const event = { ...base, _id: 'event', _type: 'event', title: 'Event', sections: [section], rsvps: [{ _key: 'same', status: 'yes', name: 'Legacy Resident', email: 'private@example.test' }] };
  const plan = buildImport([event, { ...event, _id: 'drafts.event' }, { ...base, _id: 'comment', _type: 'eventComment', event: { _ref: 'event' }, name: 'Legacy Author', email: 'another@example.test', message: 'Question' }]);
  assert.deepEqual(plan.content[0].sections, [section]);
  assert.equal(plan.content[1].status, 'draft');
  assert.equal(plan.rsvps.length, 1);
  assert.equal(plan.contacts.length, 2);
  assert.ok(!JSON.stringify(plan.content).includes('private@example.test'));
  assert.ok(!JSON.stringify(plan.comments).includes('another@example.test'));
  assert.equal(buildImport([event]).rsvps[0].id, plan.rsvps[0].id);
});
