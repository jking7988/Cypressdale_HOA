import test from 'node:test';
import assert from 'node:assert/strict';
import { newsletterCampaignKey, newsletterSendRequestSchema } from '../../lib/newsletter/campaign.ts';

const id = 'a049e734-bab2-49d9-a5b3-710d1257f435';
test('ordinary campaigns retain the daily guard and resends use a separate replay-safe key', () => {
  assert.equal(newsletterCampaignKey('resend:live', '2026-10-16'), 'resend:live:2026-10-16');
  const key = newsletterCampaignKey('resend:live', '2026-10-16', id);
  assert.notEqual(key, newsletterCampaignKey('resend:live', '2026-10-16'));
  assert.equal(key, newsletterCampaignKey('resend:live', '2026-10-17', id));
  assert.notEqual(key, newsletterCampaignKey('resend:test:tester', '2026-10-16', id));
});
test('an override requires both explicit confirmation and a valid request identifier', () => {
  assert.equal(newsletterSendRequestSchema.parse({}).overrideDailyLimit, false);
  assert.equal(newsletterSendRequestSchema.safeParse({ settingsVersion: 1, overrideDailyLimit: true, resendRequestId: id }).success, true);
  for (const input of [{ overrideDailyLimit: true }, { resendRequestId: id }, { overrideDailyLimit: 'true', resendRequestId: id },
    { overrideDailyLimit: true, resendRequestId: 'bad' }, { settingsVersion: -1 }, { force: true }]) {
    assert.equal(newsletterSendRequestSchema.safeParse(input).success, false);
  }
});
