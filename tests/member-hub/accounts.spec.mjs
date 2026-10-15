import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { getLocalStatus, seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';

const status = getLocalStatus();
const newClient = () => createClient(status.API_URL, status.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function login(page, email, password) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/members$/);
}

async function emailLink(request, recipient, subject) {
  let message;
  await expect.poll(async () => {
    const response = await request.get('http://127.0.0.1:55424/api/v1/messages');
    const data = await response.json();
    message = data.messages.find(item => item.Subject.includes(subject) && item.To.some(person => person.Address === recipient));
    return !!message;
  }, { timeout: 20000 }).toBe(true);
  const response = await request.get(`http://127.0.0.1:55424/api/v1/message/${message.ID}`);
  const data = await response.json();
  const match = data.HTML.match(/href="([^"]+)"/);
  expect(match).toBeTruthy();
  const url = match[1].replace(/&amp;/g, '&');
  expect(new URL(url).origin).toBe('http://localhost:3001');
  return url;
}

test('login and registration fit desktop and mobile and use the existing neighborhood image', async ({ page }, testInfo) => {
  for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    await page.setViewportSize(viewport);
    for (const route of ['login', 'register']) {
      await page.goto(`/${route}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${route}-${name}.png`), fullPage: true });
    }
  }
});

test('registration, verification, approval, revocation, recovery and self-deletion', async ({ browser, page, request }, testInfo) => {
  test.setTimeout(180000);
  const { service } = await seedAdmin(status);
  const email = `resident-${Date.now()}@example.test`;
  const password = 'ResidentTestPassword2026!';
  const resetPassword = 'ResidentResetPassword2026!';
  const residentName = 'Local Test Resident';
  const contentId = `local-event-${Date.now()}`;
  const assetId = `${contentId}-asset`;
  const bytes = Buffer.from('Private local test attachment');
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  let userId;
  try {
    await page.goto('/register');
    await page.getByLabel('Full Name', { exact: true }).fill(residentName);
    await page.getByLabel('Cypressdale Address').fill('123 Cypressdale Test Street');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByRole('status')).toContainText('Check your email');
    await page.goto(await emailLink(request, email, 'Confirm your'));
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page).toHaveURL(/\/members$/);
    await expect(page.getByText('Awaiting Approval', { exact: true })).toBeVisible();
    await page.goto('/admin/members');
    await expect(page.getByText('Approved membership is required.', { exact: true })).toBeVisible();

    const resident = newClient();
    const signin = await resident.auth.signInWithPassword({ email, password });
    expect(signin.error).toBeNull();
    userId = signin.data.user.id;
    await login(adminPage, localAdmin.email, localAdmin.password);
    await adminPage.getByRole('link', { name: 'Manage Members' }).click();
    await adminPage.getByLabel('Search residents').fill(email);
    await adminPage.getByRole('button', { name: `Approve ${residentName}`, exact: true }).click();
    await expect(adminPage.getByRole('status')).toContainText('Membership approved');

    expect((await service.from('hoa_content').insert({ id: contentId, kind: 'event', title: 'Local Member Test Event', status: 'published', visibility: 'members' })).error).toBeNull();
    expect((await service.storage.from('hoa-content').upload(`${assetId}.txt`, bytes, { contentType: 'text/plain' })).error).toBeNull();
    expect((await service.from('hoa_assets').insert({ id: assetId, object_path: `${assetId}.txt`, original_filename: 'private.txt', mime_type: 'text/plain', size_bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })).error).toBeNull();
    expect((await service.from('hoa_content_assets').insert({ content_id: contentId, asset_id: assetId })).error).toBeNull();
    await page.goto('/members');
    await expect(page.getByText('Approved Member', { exact: true })).toBeVisible();
    await expect(page.getByText('Local Member Test Event')).toBeVisible();
    const authorizedFile = await page.request.get(`/api/member-hub/assets/${assetId}`);
    expect(authorizedFile.status()).toBe(200);
    expect(await authorizedFile.text()).toBe(bytes.toString());
    expect(authorizedFile.headers()['cache-control']).toContain('no-store');
    expect((await request.get(`/api/member-hub/assets/${assetId}`)).status()).toBe(404);
    await adminPage.getByRole('button', { name: /Approved \d/ }).click();
    await adminPage.getByRole('button', { name: `Revoke ${residentName}`, exact: true }).click();
    await expect(adminPage.getByRole('status')).toContainText('Member access revoked');
    expect((await page.request.get(`/api/member-hub/assets/${assetId}`)).status()).toBe(404);
    await page.reload();
    await expect(page.getByText('Access Revoked', { exact: true })).toBeVisible();
    await adminPage.getByRole('button', { name: /Revoked \d/ }).click();
    await adminPage.getByRole('button', { name: `Approve ${residentName}`, exact: true }).click();
    await expect(adminPage.getByRole('status')).toContainText('Membership approved');

    expect((await resident.from('hoa_comments').insert({ content_id: contentId, author_id: userId, display_name: 'Ignored supplied name', message: 'Keep this comment.' })).error).toBeNull();
    expect((await resident.from('hoa_rsvps').insert({ content_id: contentId, author_id: userId, display_name: 'Ignored supplied name', status: 'yes' })).error).toBeNull();
    await page.goto('/forgot-password');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByRole('button', { name: 'Send Reset Link' }).click();
    await expect(page.getByRole('status')).toContainText('If an account exists');
    await page.goto(await emailLink(request, email, 'Reset your'));
    await page.getByRole('button', { name: 'Continue to password reset', exact: true }).click();
    await expect(page).toHaveURL(/\/reset-password$/);
    await page.getByLabel('New Password', { exact: true }).fill(resetPassword);
    await page.getByLabel('Confirm Password', { exact: true }).fill(resetPassword);
    await page.getByRole('button', { name: 'Save Password' }).click();
    await expect(page).toHaveURL(/\/members$/);
    await page.getByRole('link', { name: 'Account Settings' }).click();
    await page.getByRole('button', { name: 'Delete My Account', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Your Current Password').fill(resetPassword);
    await dialog.getByLabel('I understand this cannot be undone.').check();
    await dialog.getByRole('button', { name: 'Delete My Account', exact: true }).click();
    await expect(page).toHaveURL(/\/login\?removed=1$/);
    expect((await service.from('hoa_comments').select('display_name, author_id').eq('content_id', contentId)).data)
      .toEqual([{ display_name: 'User Cleared', author_id: null }]);
    expect((await service.from('hoa_rsvps').select('display_name, author_id').eq('content_id', contentId)).data)
      .toEqual([{ display_name: 'User Cleared', author_id: null }]);

    await adminPage.setViewportSize({ width: 1440, height: 1000 });
    await adminPage.reload();
    await adminPage.getByRole('button', { name: /All \d/ }).click();
    await adminPage.getByLabel('Search residents').fill('');
    await adminPage.screenshot({ path: testInfo.outputPath('admin-desktop.png'), fullPage: true });
    await adminPage.setViewportSize({ width: 390, height: 844 });
    expect(await adminPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await adminPage.screenshot({ path: testInfo.outputPath('admin-mobile.png'), fullPage: true });
  } finally {
    if (!userId) userId = (await service.auth.admin.listUsers()).data.users.find(user => user.email === email)?.id;
    if (userId) await service.auth.admin.deleteUser(userId);
    await service.from('hoa_content').delete().eq('id', contentId);
    await service.from('hoa_assets').delete().eq('id', assetId);
    await service.storage.from('hoa-content').remove([`${assetId}.txt`]);
    await adminContext.close();
  }
});

test('email invitation grants admin access and the last admin cannot self-delete', async ({ browser, page, request }) => {
  test.setTimeout(120000);
  const { service } = await seedAdmin(status);
  const email = `invited-${Date.now()}@example.test`;
  const invitedContext = await browser.newContext();
  const invitedPage = await invitedContext.newPage();
  let invitedId;
  try {
    await login(page, localAdmin.email, localAdmin.password);
    await page.getByRole('link', { name: 'Manage Members' }).click();
    await page.getByLabel('Invite by Email').fill(email);
    await page.getByRole('button', { name: 'Send Invitation' }).click();
    await expect(page.getByRole('status')).toContainText('Admin invitation sent');
    await invitedPage.goto(await emailLink(request, email, 'admin invitation'));
    await invitedPage.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(invitedPage).toHaveURL(/\/members\/accept-invite\?id=/);
    await invitedPage.getByLabel('Full Name').fill('Invited Local Admin');
    await invitedPage.getByLabel('Set Password').fill('InvitedAdminPassword2026!');
    await invitedPage.getByRole('button', { name: 'Accept Admin Invitation' }).click();
    await expect(invitedPage).toHaveURL(/\/admin\/members$/);
    const invited = newClient();
    const result = await invited.auth.signInWithPassword({ email, password: 'InvitedAdminPassword2026!' });
    invitedId = result.data.user?.id;
    expect(invitedId).toBeTruthy();
    expect((await invited.rpc('hoa_member_directory')).error).toBeNull();
    await service.auth.admin.deleteUser(invitedId);
    invitedId = null;
    const admins = await service.from('hoa_profiles').select('id').eq('role', 'admin');
    // An interactive tester may have added another admin; never delete the shared test admin.
    if (admins.data.length > 1) return;
    await page.goto('/members/account');
    await page.getByRole('button', { name: 'Delete My Account', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Your Current Password').fill(localAdmin.password);
    await dialog.getByLabel('I understand this cannot be undone.').check();
    await dialog.getByRole('button', { name: 'Delete My Account', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('last active admin');
  } finally {
    if (!invitedId) invitedId = (await service.auth.admin.listUsers()).data.users.find(user => user.email === email)?.id;
    if (invitedId) await service.auth.admin.deleteUser(invitedId);
    await invitedContext.close();
  }
});
