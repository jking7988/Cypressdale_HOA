import test from 'node:test';
import assert from 'node:assert/strict';
import { hostedDevelopmentEnvironment, verifyHostedConnection } from './hosted-dev.mjs';
import { newsletterDelivery } from '../../lib/newsletter/delivery-config.ts';
import globalSetup from '../../tests/member-hub/global-setup.mjs';

const values = { NEXT_PUBLIC_SUPABASE_URL: 'https://existing.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_existing', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_existing' };
test('hosted launcher pins existing credentials, sets loopback callbacks and strips mailing credentials', () => {
  const environment = hostedDevelopmentEnvironment({ ...values,
    MEMBER_HUB_ENVIRONMENT: 'production', MEMBER_HUB_SUPABASE_URL: 'http://127.0.0.1:55421',
    MEMBER_HUB_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_stale', MEMBER_HUB_PRODUCTION_READY: 'true',
    RESEND_API_KEY: 'private-test-key', CRON_SECRET: 'secret', NEWSLETTER_CRON_SECRET: 'secret',
    NEWSLETTER_DELIVERY_ENABLED: 'true', NEWSLETTER_PRODUCTION_DELIVERY_READY: 'true' });
  assert.equal(environment.MEMBER_HUB_SUPABASE_URL, values.NEXT_PUBLIC_SUPABASE_URL);
  assert.equal(environment.MEMBER_HUB_SUPABASE_PUBLISHABLE_KEY, values.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  assert.equal(environment.MEMBER_HUB_SITE_URL, 'http://localhost:3001');
  assert.equal(environment.RESEND_API_KEY, undefined);
  assert.equal(environment.CRON_SECRET, undefined);
  assert.equal(environment.NEWSLETTER_CRON_SECRET, undefined);
  assert.equal(newsletterDelivery(environment).transport, 'disabled');
  assert.throws(() => hostedDevelopmentEnvironment({ ...values, NEXT_PUBLIC_SUPABASE_ANON_KEY: '' }), /existing .env.local/);
  assert.throws(() => hostedDevelopmentEnvironment({ ...values, VERCEL: '1' }), /loopback-only/);
});
test('hosted startup checks are read-only and refuse invalid credentials without exposing response bodies', async () => {
  const environment = hostedDevelopmentEnvironment(values), calls = [];
  await verifyHostedConnection(environment, async (url, options) => {
    calls.push({ url, options }); return new Response('[]');
  });
  assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call.options.method === 'GET' && call.options.redirect === 'error'
    && call.url.origin === values.NEXT_PUBLIC_SUPABASE_URL));
  await assert.rejects(verifyHostedConnection(environment, async () => new Response('DO NOT EXPOSE', { status: 401 })),
    error => error.message.includes('401') && !error.message.includes('DO NOT EXPOSE'));
});

test('explicit local test opt-in permits only its allowlist and strips scheduling credentials', () => {
  const environment = hostedDevelopmentEnvironment({ ...values, RESEND_API_KEY: 'private-test-key', NEWSLETTER_FROM: 'HOA <newsletter@example.test>',
    MEMBER_HUB_NEWSLETTER_TEST_RECIPIENTS: 'tester@example.test', NEWSLETTER_TEST_RECIPIENTS: 'other@example.test',
    NEWSLETTER_DELIVERY_MODE: 'live', NEWSLETTER_PRODUCTION_DELIVERY_READY: 'true', CRON_SECRET: 'secret' });
  const delivery = newsletterDelivery(environment);
  assert.equal(delivery.transport, 'resend'); assert.equal(delivery.live, false);
  assert.deepEqual(delivery.recipients, ['tester@example.test']);
  assert.equal(environment.NEWSLETTER_DELIVERY_MODE, 'test');
  assert.equal(environment.NEWSLETTER_PRODUCTION_DELIVERY_READY, 'false');
  assert.equal(environment.CRON_SECRET, undefined);
  assert.equal(environment.RESEND_API_KEY, 'private-test-key');
  for (const change of [{ RESEND_API_KEY: '' }, { NEWSLETTER_FROM: '' }, { MEMBER_HUB_NEWSLETTER_TEST_RECIPIENTS: 'not-email' }]) {
    assert.throws(() => hostedDevelopmentEnvironment({ ...values, RESEND_API_KEY: 'private-test-key', NEWSLETTER_FROM: 'HOA <newsletter@example.test>',
      MEMBER_HUB_NEWSLETTER_TEST_RECIPIENTS: 'tester@example.test', ...change }), /Local test email requires/);
  }
});
test('browser fixture setup refuses shared or unavailable servers before any tests execute', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error('Must reject the hosted port before making a request.'); };
    await assert.rejects(globalSetup({ projects: [{ use: { baseURL: 'http://localhost:3001' } }] }), /isolated Docker server/);
    for (const response of [new Response(null, { status: 404 }), new Response('{}'), new Response('{"isolatedTesting":false}')]) {
      globalThis.fetch = async () => response;
      await assert.rejects(globalSetup(), /isolated Docker server/);
    }
    globalThis.fetch = async url => {
      assert.equal(url, 'http://localhost:3002/api/member-hub/test-environment');
      return new Response('{"isolatedTesting":true}');
    };
    await globalSetup();
  } finally { globalThis.fetch = original; }
});
