import test from 'node:test';
import assert from 'node:assert/strict';
import { newsletterDelivery, newsletterRecipientAllowed, newsletterCronSecret, newsletterCampaignScope } from '../../lib/newsletter/delivery-config.ts';

const production = { MEMBER_HUB_ENVIRONMENT: 'production', MEMBER_HUB_PRODUCTION_READY: 'true', VERCEL_ENV: 'production',
  RESEND_API_KEY: 'private-test-key', NEWSLETTER_FROM: 'HOA <newsletter@example.test>', NEWSLETTER_DELIVERY_ENABLED: 'true' };

test('local always captures mail even with inherited live provider credentials and flags', () => {
  assert.equal(newsletterDelivery({ ...production, MEMBER_HUB_ENVIRONMENT: 'local', NEWSLETTER_DELIVERY_MODE: 'live', NEWSLETTER_PRODUCTION_DELIVERY_READY: 'true' }).transport, 'mailpit');
});

test('shared hosted-data development never sends newsletters even with inherited live flags', () => {
  assert.equal(newsletterDelivery({ ...production, MEMBER_HUB_ENVIRONMENT: 'hosted-development',
    NEWSLETTER_DELIVERY_MODE: 'live', NEWSLETTER_PRODUCTION_DELIVERY_READY: 'true' }).transport, 'disabled');
});

test('hosted development test recipients cannot be widened by production flags or used on Vercel', () => {
  const local = { ...production, VERCEL_ENV: undefined, NODE_ENV: 'development', MEMBER_HUB_ENVIRONMENT: 'hosted-development',
    NEWSLETTER_DELIVERY_MODE: 'test', MEMBER_HUB_NEWSLETTER_TEST_RECIPIENTS: 'tester@example.test', NEWSLETTER_TEST_RECIPIENTS: 'other@example.test' };
  const config = newsletterDelivery(local);
  assert.equal(config.transport, 'resend'); assert.equal(config.live, false);
  assert.equal(newsletterRecipientAllowed('tester@example.test', config), true);
  assert.equal(newsletterRecipientAllowed('other@example.test', config), false);
  assert.equal(newsletterCampaignScope(config), 'resend:test');
  for (const change of [{ NODE_ENV: 'production' }, { VERCEL_ENV: 'production' }, { VERCEL: '1' },
    { NEWSLETTER_DELIVERY_MODE: 'live' }, { MEMBER_HUB_NEWSLETTER_TEST_RECIPIENTS: '' }]) {
    assert.equal(newsletterDelivery({ ...local, ...change }).transport, 'disabled');
  }
});

test('hosted delivery defaults to a tester allowlist and refuses arbitrary recipients', () => {
  assert.equal(newsletterDelivery(production).transport, 'disabled');
  const config = newsletterDelivery({ ...production, NEWSLETTER_TEST_RECIPIENTS: ' Tester@Example.test, second@example.test ' });
  assert.equal(config.transport, 'resend');
  assert.equal(config.live, false);
  assert.equal(newsletterRecipientAllowed('TESTER@example.test', config), true);
  assert.equal(newsletterRecipientAllowed('resident@example.test', config), false);
});

test('unrestricted production delivery needs separate live approval and never runs in Vercel previews', () => {
  const enabled = { ...production, NEWSLETTER_DELIVERY_MODE: 'live', NEWSLETTER_PRODUCTION_DELIVERY_READY: 'true' };
  assert.equal(newsletterDelivery({ ...enabled, NEWSLETTER_PRODUCTION_DELIVERY_READY: undefined }).transport, 'disabled');
  assert.equal(newsletterDelivery({ ...enabled, MEMBER_HUB_PRODUCTION_READY: undefined }).transport, 'disabled');
  assert.equal(newsletterDelivery({ ...enabled, VERCEL_ENV: 'preview' }).transport, 'disabled');
  assert.equal(newsletterRecipientAllowed('resident@example.test', newsletterDelivery(enabled)), true);
  for (const change of [{ NEWSLETTER_DELIVERY_ENABLED: 'false' }, { NEWSLETTER_FROM: '' }, { RESEND_API_KEY: '' }, { NEWSLETTER_DELIVERY_MODE: 'typo' }]) {
    assert.equal(newsletterDelivery({ ...enabled, ...change }).transport, 'disabled');
  }
});

test('staging keeps its allowlist and cannot enable unrestricted production delivery', () => {
  const staging = { ...production, MEMBER_HUB_ENVIRONMENT: 'staging', NEWSLETTER_STAGING_RECIPIENTS: 'tester@example.test' };
  assert.equal(newsletterDelivery(staging).transport, 'resend');
  assert.equal(newsletterDelivery({ ...staging, NEWSLETTER_DELIVERY_MODE: 'live', NEWSLETTER_PRODUCTION_DELIVERY_READY: 'true' }).transport, 'disabled');
  assert.equal(newsletterDelivery({ ...staging, NEWSLETTER_STAGING_RECIPIENTS: 'not-an-email' }).transport, 'disabled');
  assert.equal(newsletterDelivery({ ...staging, NEWSLETTER_FROM: 'HOA\r\nInjected: header' }).transport, 'disabled');
});

test('Vercel scheduler secret is supported and conflicting secrets fail closed', () => {
  assert.equal(newsletterCronSecret({ CRON_SECRET: 'test-secret' }), 'test-secret');
  assert.equal(newsletterCronSecret({ NEWSLETTER_CRON_SECRET: 'test-secret' }), 'test-secret');
  assert.equal(newsletterCronSecret({ CRON_SECRET: 'test-secret', NEWSLETTER_CRON_SECRET: 'test-secret' }), 'test-secret');
  assert.equal(newsletterCronSecret({ CRON_SECRET: 'one', NEWSLETTER_CRON_SECRET: 'two' }), undefined);
  assert.equal(newsletterCronSecret({}), undefined);
});

test('test campaigns cannot share the live campaign namespace or pollute live deduplication', () => {
  const testConfig = newsletterDelivery({ ...production, NEWSLETTER_TEST_RECIPIENTS: 'tester@example.test' });
  const liveConfig = newsletterDelivery({ ...production, NEWSLETTER_DELIVERY_MODE: 'live', NEWSLETTER_PRODUCTION_DELIVERY_READY: 'true' });
  assert.equal(newsletterCampaignScope(testConfig), 'resend:test');
  assert.equal(newsletterCampaignScope(liveConfig), 'resend:live');
  assert.equal(newsletterCampaignScope(newsletterDelivery({ MEMBER_HUB_ENVIRONMENT: 'local' })), 'mailpit');
});
