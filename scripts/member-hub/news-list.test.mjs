import test from 'node:test';
import assert from 'node:assert/strict';
import { newsDay, newsForDisplay } from '../../lib/member-hub/news-list.ts';

const fixture = (id, settings = {}) => ({ _id: id, title: id, ...settings });

test('news is newest published first, independently of editing or backdated calendar dates', () => {
  const posts = [fixture('older', { _publishedAt: '2026-10-01', newsDate: '2026-12-01' }),
    fixture('newest', { _publishedAt: '2026-10-15', newsDate: '2026-09-01', _createdAt: '2025-01-01' }),
    fixture('legacy', { publishedAt: '2026-10-10' }), fixture('created', { _createdAt: '2026-10-05' }),
    fixture('missing'), fixture('invalid', { _publishedAt: 'invalid', _createdAt: '2026-10-02' })];
  assert.deepEqual(newsForDisplay(posts).map(post => post._id), ['newest', 'legacy', 'created', 'invalid', 'older', 'missing']);
  assert.equal(posts[0]._id, 'older');
});

test('news calendar preserves date-only values and converts timestamps to Central time', () => {
  assert.equal(newsDay(fixture('date', { newsDate: '2026-10-15' })), '2026-10-15');
  assert.equal(newsDay(fixture('timestamp', { _publishedAt: '2026-10-16T02:00:00Z' })), '2026-10-15');
  assert.equal(newsDay(fixture('winter', { _publishedAt: '2026-12-16T05:00:00Z' })), '2026-12-15');
  assert.equal(newsDay(fixture('invalid', { newsDate: '', _publishedAt: 'bad', _createdAt: '2026-10-15T18:00:00Z' })), '2026-10-15');
  assert.equal(newsDay(fixture('missing')), null);
});

test('calendar filtering includes the newest article and handles empty days', () => {
  const posts = [fixture('older', { newsDate: '2026-10-14' }), fixture('newest', { newsDate: '2026-10-15', _publishedAt: '2026-10-15' })];
  assert.deepEqual(newsForDisplay(posts, '2026-10-15').map(post => post._id), ['newest']);
  assert.deepEqual(newsForDisplay(posts, '2026-10-16'), []);
});
