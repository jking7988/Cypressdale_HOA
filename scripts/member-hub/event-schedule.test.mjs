import test from 'node:test';
import assert from 'node:assert/strict';
import { contentSchema, eventScheduleError } from '../../lib/member-hub/content.ts';

const event = { id: 'event-fixture', kind: 'event', title: 'Flyer-only event', slug: null,
  status: 'published', visibility: 'public', body: [], sections: [], settings: {} };
test('published events need a valid start date, not just a flyer or calendar sidebar', () => {
  for (const settings of [{}, { showCalendar: true }, { startDate: 'invalid' }, { startDate: 123 },
    { flyer: { asset: { _ref: 'upload-flyer' } } }]) {
    assert.match(eventScheduleError({ ...event, settings }), /event start date/);
    assert.equal(contentSchema.safeParse({ ...event, settings }).success, false);
  }
});
test('dated events including historical/legacy dates can publish; drafts and other content need no event date', () => {
  for (const document of [{ ...event, settings: { startDate: '2026-11-01T14:00:00Z' } },
    { ...event, settings: { start: '2025-01-01T14:00:00Z' } }, { ...event, status: 'draft' },
    { ...event, kind: 'post' }, { ...event, kind: 'page' }]) {
    assert.equal(eventScheduleError(document), null);
    assert.equal(contentSchema.safeParse(document).success, true);
  }
});
