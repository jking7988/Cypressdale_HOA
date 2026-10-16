import test from 'node:test';
import assert from 'node:assert/strict';
import { eventDay, eventRanges, eventsForDisplay } from '../../lib/member-hub/event-list.ts';

const now = new Date('2026-10-16T02:00:00Z');
const fixture = (id, settings = {}) => ({ _id: id, title: id, startDate: '2026-11-01T15:00:00Z', ...settings });

test('new publications come first regardless of event date or editing time', () => {
  const rows = [fixture('older', { _createdAt: '2026-09-01', _publishedAt: '2026-09-10', startDate: '2026-10-20' }),
    fixture('newest', { _createdAt: '2026-09-01', _publishedAt: '2026-10-15', startDate: '2026-12-20' }),
    fixture('fallback', { _createdAt: '2026-10-01' })];
  assert.deepEqual(eventsForDisplay(rows, 'upcoming', now).map(row => row._id), ['newest', 'fallback', 'older']);
  assert.equal(rows[0]._id, 'older');
});

test('past events are separated using Central dates, including ongoing and second ranges', () => {
  assert.equal(eventDay(now), '2026-10-15');
  const rows = [fixture('past', { startDate: '2026-10-14T15:00:00Z' }),
    fixture('today', { startDate: '2026-10-15T14:00:00Z' }),
    fixture('ongoing', { startDate: '2026-10-14', endDate: '2026-10-18' }),
    fixture('second', { startDate: '2026-09-01', isMultiDayEvent: true, secondStartDate: '2026-11-01' }),
    fixture('undated', { startDate: undefined })];
  assert.deepEqual(eventsForDisplay(rows, 'past', now).map(row => row._id), ['past']);
  assert.equal(eventsForDisplay(rows, 'upcoming', now).length, 4);
  assert.deepEqual(eventsForDisplay(rows, 'upcoming', now, '2026-10-15').map(row => row._id), ['ongoing', 'today']);
  assert.deepEqual(eventsForDisplay(rows, 'upcoming', now, '2026-10-20'), []);
  assert.deepEqual(eventsForDisplay(rows, 'upcoming', now, '2026-10-31').map(row => row._id), ['second']);
});

test('invalid dates are safe and reversed ends fall back to the start', () => {
  assert.deepEqual(eventRanges(fixture('bad', { startDate: 'invalid' })), []);
  for (const endDate of ['invalid', '2025-01-01']) {
    const [range] = eventRanges(fixture('reversed', { endDate }));
    assert.equal(range.start.getTime(), range.end.getTime());
  }
});
