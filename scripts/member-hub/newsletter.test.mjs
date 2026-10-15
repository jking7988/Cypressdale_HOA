import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNewsletter,centralDate } from '../../lib/newsletter/template.ts';
import { newsletterTables } from '../../lib/newsletter/tables.ts';
test('production campaign tables do not collide with legacy history; local and isolated staging retain their schema', () => {
  assert.deepEqual(newsletterTables({ MEMBER_HUB_ENVIRONMENT: 'production' }), {
    runs: 'hoa_newsletter_runs', deliveries: 'hoa_newsletter_deliveries',
  });
  for (const mode of ['local', 'staging']) assert.deepEqual(newsletterTables({ MEMBER_HUB_ENVIRONMENT: mode }), {
    runs: 'newsletter_runs', deliveries: 'newsletter_deliveries',
  });
});
test('newsletter templates escape editor text and link to existing ID-based routes',()=>{
  const result=renderNewsletter([{id:'source:id',kind:'post',title:'<img src=x onerror=alert(1)> & "News"',updated_at:'2026-01-01',date:'2026-01-01T12:00:00Z'}],
    'http://localhost:3001','http://localhost:3001/api/newsletter/unsubscribe?token=example');
  assert.ok(result.html.includes('&lt;img')); assert.ok(!result.html.includes('<img'));
  assert.ok(result.html.includes('/news/source%3Aid')); assert.ok(result.text.includes('/news/source%3Aid'));
});
test('newsletter day keys follow Central time across UTC midnight',()=>{
  assert.equal(centralDate(new Date('2026-10-17T01:00:00Z')),'2026-10-16');
});
