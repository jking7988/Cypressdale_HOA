import { test, expect } from '@playwright/test';
import { seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getLocalStatus } from '../../scripts/member-hub/local.mjs';

test('original public routes render imported content and local images without Sanity', async ({ page }, info) => {
  test.setTimeout(120000);
  const requests = [], errors = [];
  page.on('request', request => { if (/(^|\.)sanity\.(io|studio)$/.test(new URL(request.url()).hostname)) requests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  for (const route of ['/', '/news', '/events', '/documents', '/yard-of-the-month', '/holiday-decorating']) {
    const response = await page.goto(route);
    expect(response.status(), route).toBe(200);
    await expect(page.locator('main')).toBeVisible();
  }
  const imported = page.locator('main img[src^="/api/member-hub/assets/"]');
  expect(await imported.count()).toBeGreaterThan(0);
  for (const img of await imported.all()) await expect.poll(() => img.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
  await page.screenshot({ path: info.outputPath('public-holiday-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/documents');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const file = page.locator('main a[href^="/api/member-hub/assets/"]').first();
  await page.locator('main details summary').first().click();
  await expect(file).toBeVisible();
  expect((await page.request.get(await file.getAttribute('href'))).status()).toBe(200);
  await page.screenshot({ path: info.outputPath('public-documents-mobile.png'), fullPage: true });
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});

test('retired CMS preview and passphrase deletion endpoints are unavailable', async ({ request }) => {
  for (const route of ['/api/draft-mode/enable?secret=retired', '/api/draft-mode/disable', '/studio']) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(404);
    expect(response.headers()['set-cookie'] || '').not.toContain('__prerender_bypass');
  }
  expect((await request.post('/api/news/delete', { data: { postId: 'not-a-record', secret: 'retired' } })).status()).toBe(404);
});

test('public listings exclude private and draft content and discussions use account identity', async ({ page, request }) => {
  test.setTimeout(120000);
  const { service } = await seedAdmin();
  const prefix = `public-test-${randomUUID()}`;
  const ids = [`${prefix}-public`, `${prefix}-private`, `${prefix}-draft`, `${prefix}-other`];
  const rows = ids.map((id, index) => ({ id, kind: 'post', title: id,
    status: index === 2 ? 'draft' : 'published', visibility: index === 1 ? 'members' : 'public',
    body: [], sections: [], settings: {} }));
  expect((await service.from('hoa_content').insert(rows)).error).toBeNull();
  let residentId;
  try {
    await page.goto('/news');
    await expect(page.getByText(ids[0], { exact: true }).first()).toBeVisible();
    await expect(page.getByText(ids[1], { exact: true })).toHaveCount(0);
    await expect(page.getByText(ids[2], { exact: true })).toHaveCount(0);
    expect((await request.get(`/news/${ids[1]}`)).status()).toBe(404);
    expect((await request.get(`/news/${ids[2]}`)).status()).toBe(404);
    const endpoint = '/api/news/comments';
    expect((await request.post(endpoint, { data: { postId: ids[0], message: 'Unauthorized' } })).status()).toBe(401);
    const status = getLocalStatus();
    const email = `${prefix}@example.test`, password = 'PublicFixture2026!';
    const resident = await service.auth.admin.createUser({ email, password, email_confirm: true,
      user_metadata: { full_name: 'Pending Fixture', address: '1 Test Lane' } });
    expect(resident.error).toBeNull(); residentId = resident.data.user.id;
    const userClient = createClient(status.API_URL, status.ANON_KEY, { auth: { persistSession: false } });
    const auth = await userClient.auth.signInWithPassword({ email, password }); expect(auth.error).toBeNull();
    const memberHeaders = { Authorization: `Bearer ${auth.data.session.access_token}` };
    expect((await request.post(endpoint, { headers: memberHeaders, data: { postId: ids[0], message: 'Pending comment' } })).status()).toBe(403);
    await service.from('hoa_profiles').update({ membership_status: 'approved' }).eq('id', residentId);
    expect((await request.post(endpoint, { headers: memberHeaders, data: { postId: ids[0], message: 'Resident retained' } })).status()).toBe(200);
    await service.from('hoa_profiles').update({ membership_status: 'revoked' }).eq('id', residentId);
    expect((await request.post(endpoint, { headers: memberHeaders, data: { postId: ids[0], message: 'Revoked comment' } })).status()).toBe(403);
    await service.auth.admin.deleteUser(residentId); residentId = null;
    const cleared = await (await request.get(`${endpoint}?postId=${ids[0]}`)).json();
    expect(cleared.comments.find(comment => comment.message === 'Resident retained').name).toBe('User Cleared');
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
    await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click(); await expect(page).toHaveURL(/\/members$/);
    await page.goto('/news');
    await expect(page.getByText(ids[1], { exact: true })).toHaveCount(0);
    await expect(page.getByText(ids[2], { exact: true })).toHaveCount(0);
    expect((await page.request.get(`/news/${ids[1]}`)).status()).toBe(200);
    expect((await page.request.get(`/news/${ids[2]}`)).status()).toBe(404);
    const posted = await page.request.post(endpoint, { data: { postId: ids[0], message: 'Account comment', name: 'Impersonated', email: 'private@example.test' } });
    expect(posted.status()).toBe(200);
    const payload = await (await page.request.get(`${endpoint}?postId=${ids[0]}`)).json();
    const parent = payload.comments.find(comment => comment.message === 'Account comment'); expect(parent.name).not.toBe('Impersonated'); expect(parent).not.toHaveProperty('email');
    expect((await page.request.post(endpoint, { data: { postId: ids[3], message: 'Cross-thread reply', parentCommentId: parent._id } })).status()).toBe(400);
    expect((await page.request.post(endpoint, { data: { postId: ids[0], message: 'Account reply', parentCommentId: parent._id } })).status()).toBe(200);
    expect((await page.request.delete(`/api/events/comments/${parent._id}`)).status()).toBe(409);
    await page.goto(`/news/${ids[0]}`);
    await expect(page.getByText('Account comment', { exact: true })).toBeVisible();
    await expect(page.getByText('Account reply', { exact: true })).toBeVisible();
    await page.getByLabel('Comment', { exact: true }).fill('Browser comment');
    await page.getByRole('button', { name: 'Submit comment', exact: true }).click();
    await expect(page.getByText('Browser comment', { exact: true })).toBeVisible();
    const reply = (await (await page.request.get(`${endpoint}?postId=${ids[0]}`)).json()).comments.find(comment => comment.parentId);
    expect((await page.request.delete(`/api/events/comments/${reply._id}`)).status()).toBe(200);
    expect((await page.request.delete(`/api/events/comments/${parent._id}`)).status()).toBe(200);
  } finally {
    if (residentId) await service.auth.admin.deleteUser(residentId);
    await service.from('hoa_content').delete().in('id', ids);
  }
});
