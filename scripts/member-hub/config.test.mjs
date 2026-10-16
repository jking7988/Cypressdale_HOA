import assert from 'node:assert/strict';
import test from 'node:test';
import { hubConfig, hubSiteOrigin, hubServiceRoleKey, HubAccessError } from '../../lib/member-hub/config.ts';

test('member hub stays disabled until explicitly configured', () => {
  assert.throws(() => hubConfig({}), (error) => error instanceof HubAccessError && error.status === 503);
});

test('local configuration accepts loopback only', () => {
  const config = {
    MEMBER_HUB_ENABLED: 'true', MEMBER_HUB_ENVIRONMENT: 'local',
    MEMBER_HUB_SUPABASE_URL: 'http://127.0.0.1:54321', MEMBER_HUB_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  };
  assert.equal(hubConfig(config).url, 'http://127.0.0.1:54321');
  assert.equal(hubConfig(config).secureCookies, false);
  for (const url of ['https://live.supabase.co', 'http://example.test', 'http://user:pass@localhost:54321', 'http://localhost:54321/not-a-base-url']) {
    assert.throws(() => hubConfig({ ...config, MEMBER_HUB_SUPABASE_URL: url }));
  }
});

test('staging rejects production, unknown production URLs and unsupported deployment modes', () => {
  const config = {
    MEMBER_HUB_ENABLED: 'true', MEMBER_HUB_ENVIRONMENT: 'staging',
    MEMBER_HUB_SUPABASE_URL: 'https://staging.supabase.co', MEMBER_HUB_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    MEMBER_HUB_PRODUCTION_SUPABASE_URL: 'https://live.supabase.co',
  };
  assert.equal(hubConfig(config).url, 'https://staging.supabase.co');
  assert.equal(hubConfig(config).secureCookies, true);
  assert.throws(() => hubConfig({ ...config, MEMBER_HUB_SUPABASE_URL: 'https://live.supabase.co' }));
  assert.throws(() => hubConfig({ ...config, MEMBER_HUB_SUPABASE_URL: 'https://live.supabase.co.' }));
  assert.throws(() => hubConfig({ ...config, NEXT_PUBLIC_SUPABASE_URL: 'https://staging.supabase.co' }));
  assert.throws(() => hubConfig({ ...config, MEMBER_HUB_PRODUCTION_SUPABASE_URL: undefined }));
  assert.throws(() => hubConfig({ ...config, MEMBER_HUB_ENVIRONMENT: 'production' }));
  assert.throws(() => hubConfig({ ...config, MEMBER_HUB_SUPABASE_PUBLISHABLE_KEY: '' }));
});

const production = {
  MEMBER_HUB_ENABLED: 'true', MEMBER_HUB_ENVIRONMENT: 'production', MEMBER_HUB_PRODUCTION_READY: 'true',
  NEXT_PUBLIC_SUPABASE_URL: 'https://existing.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_existing',
  SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_existing', MEMBER_HUB_SITE_URL: 'https://www.example.test', VERCEL_ENV: 'production',
};
test('production reuses existing credentials only after an explicit launch gate and uses secure cookies', () => {
  assert.equal(hubConfig(production).url, 'https://existing.supabase.co');
  assert.equal(hubConfig(production).secureCookies, true);
  assert.equal(hubServiceRoleKey(production), 'sb_secret_existing');
  assert.equal(hubSiteOrigin(production), 'https://www.example.test');
  for (const change of [
    { MEMBER_HUB_PRODUCTION_READY: undefined }, { MEMBER_HUB_PRODUCTION_READY: 'false' },
    { VERCEL_ENV: 'preview' }, { VERCEL_ENV: 'development' },
    { MEMBER_HUB_SUPABASE_URL: 'https://different.supabase.co' },
    { MEMBER_HUB_PRODUCTION_SUPABASE_URL: 'https://different.supabase.co' },
    { MEMBER_HUB_SITE_URL: 'http://www.example.test' }, { MEMBER_HUB_SITE_URL: 'https://localhost' },
    { NEXT_PUBLIC_SUPABASE_URL: 'https://existing.supabase.co.' },
    { MEMBER_HUB_SITE_URL: undefined }, { NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined },
  ]) assert.throws(() => hubConfig({ ...production, ...change }), HubAccessError);
});

test('shared hosted-data development requires explicit acknowledgement and local development only', () => {
  const shared = { ...production, NODE_ENV: 'development', VERCEL_ENV: undefined,
    MEMBER_HUB_ENVIRONMENT: 'hosted-development', MEMBER_HUB_SHARED_DATABASE: 'true',
    MEMBER_HUB_SITE_URL: 'http://localhost:3001', MEMBER_HUB_PRODUCTION_READY: 'false' };
  assert.equal(hubConfig(shared).url, production.NEXT_PUBLIC_SUPABASE_URL);
  assert.equal(hubConfig(shared).secureCookies, false);
  assert.equal(hubSiteOrigin(shared), 'http://localhost:3001');
  assert.equal(hubServiceRoleKey(shared), 'sb_secret_existing');
  for (const change of [{ NODE_ENV: 'production' }, { NODE_ENV: undefined }, { VERCEL: '1' },
    { VERCEL_ENV: 'preview' }, { VERCEL_ENV: 'production' }, { VERCEL_ENV: 'development' },
    { MEMBER_HUB_SHARED_DATABASE: undefined }, { MEMBER_HUB_SHARED_DATABASE: 'false' },
    { MEMBER_HUB_SITE_URL: 'https://public.example.test' }, { NEXT_PUBLIC_SUPABASE_URL: undefined },
    { MEMBER_HUB_SUPABASE_URL: 'https://different.supabase.co' },
    { MEMBER_HUB_PRODUCTION_SUPABASE_URL: 'https://different.supabase.co' }])
    assert.throws(() => hubConfig({ ...shared, ...change }), HubAccessError);
});

test('local/staging never borrow existing production secrets; storage rejects public credentials', () => {
  const local = { MEMBER_HUB_ENABLED: 'true', MEMBER_HUB_ENVIRONMENT: 'local',
    MEMBER_HUB_SUPABASE_URL: 'http://localhost:54321', MEMBER_HUB_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_existing' };
  assert.throws(() => hubServiceRoleKey(local), HubAccessError);
  assert.throws(() => hubServiceRoleKey({ ...local, MEMBER_HUB_SUPABASE_SERVICE_ROLE_KEY: 'sb_publishable_local' }), HubAccessError);
  assert.equal(hubServiceRoleKey({ ...local, MEMBER_HUB_SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_local' }), 'sb_secret_local');
});

test('site origins reject embedded credentials, paths, queries and fragments in every account email flow', () => {
  for (const origin of ['https://user:pass@www.example.test', 'https://www.example.test/path', 'https://www.example.test/?next=evil', 'https://www.example.test/#fragment']) {
    assert.throws(() => hubSiteOrigin({ ...production, MEMBER_HUB_SITE_URL: origin }), HubAccessError);
  }
});

test('user clients reject secret and service-role keys that would bypass RLS', () => {
  const config = {
    MEMBER_HUB_ENABLED: 'true', MEMBER_HUB_ENVIRONMENT: 'local',
    MEMBER_HUB_SUPABASE_URL: 'http://localhost:54321',
  };
  const jwt = (role) => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
  assert.equal(hubConfig({ ...config, MEMBER_HUB_SUPABASE_PUBLISHABLE_KEY: jwt('anon') }).url, 'http://localhost:54321');
  for (const key of ['sb_secret_test', jwt('service_role'), 'malformed-key']) {
    assert.throws(() => hubConfig({ ...config, MEMBER_HUB_SUPABASE_PUBLISHABLE_KEY: key }));
  }
});
