import { test, expect } from '@playwright/test';
import { seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';

test('an existing resident can accept an emailed admin invitation', async ({ browser, page, request }) => {
  const { service } = await seedAdmin();
  const email = `existing-${Date.now()}@example.test`;
  const created = await service.auth.admin.createUser({ email, password: 'ExistingResident2026!', email_confirm: true,
    user_metadata: { full_name: 'Existing Resident', address: '123 Local Test Street' } });
  expect(created.error).toBeNull();
  const context = await browser.newContext();
  try {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
    await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(/\/members$/);
    await page.getByRole('link', { name: 'Manage Members' }).click();
    await page.getByLabel('Invite by Email').fill(email);
    await page.getByRole('button', { name: 'Send Invitation' }).click();
    await expect(page.getByRole('status')).toContainText('Admin invitation sent');
    let message;
    await expect.poll(async () => {
      const response = await request.get('http://127.0.0.1:55424/api/v1/messages');
      message = (await response.json()).messages.find(item => item.Subject === 'Sign in to Cypressdale HOA' && item.To.some(person => person.Address === email));
      return !!message;
    }).toBe(true);
    const response = await request.get(`http://127.0.0.1:55424/api/v1/message/${message.ID}`);
    const data = await response.json();
    const link = data.HTML.match(/href="([^"]+)"/)[1].replace(/&amp;/g, '&');
    const invited = await context.newPage();
    await invited.goto(link);
    await expect(invited).toHaveURL(/\/members\/accept-invite\?id=/);
    await invited.getByLabel('Set Password').fill('ExistingAdminPassword2026!');
    await invited.getByRole('button', { name: 'Accept Admin Invitation' }).click();
    await expect(invited).toHaveURL(/\/admin\/members$/);
    await page.reload();
    await page.getByRole('button', { name: /Admins \d/ }).click();
    await page.getByLabel('Search residents').fill(email);
    await page.getByRole('button', { name: 'Remove Existing Resident', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Your Current Password').fill(localAdmin.password);
    await dialog.getByLabel('I understand this cannot be undone.').check();
    await dialog.getByRole('button', { name: 'Remove Account', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Existing Resident', exact: true })).toHaveCount(0);
    await invited.reload();
    await expect(invited).toHaveURL(/\/admin-sign-in$/);
  } finally {
    await service.auth.admin.deleteUser(created.data.user.id);
    await context.close();
  }
});
