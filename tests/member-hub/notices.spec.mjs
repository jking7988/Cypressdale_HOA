import { test, expect } from '@playwright/test';
import { seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';

test('success banners expire, repeated messages restart the timer, and errors remain visible', async ({ page }) => {
  await seedAdmin();
  await page.goto('/admin-sign-in');
  await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
  await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/content$/);
  await page.goto('/admin/newsletter');
  await page.route('**/api/newsletter/preview', route => route.fulfill({ json: {
    subject: 'Banner timer fixture', text: '', html: '<p>Fixture</p>', subscribers: 1,
    transport: 'mailpit', items: [{ id: 'timer-fixture', kind: 'post', title: 'Fixture' }],
  } }));
  await page.route('**/api/newsletter/send', route => route.fulfill({ json: { sent: 1, pending: 0, transport: 'mailpit' } }));
  await page.getByRole('button', { name: 'Refresh preview', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Banner timer fixture', exact: true })).toBeVisible();
  await page.clock.install();
  const notice = page.locator('main').getByRole('status');
  async function send() {
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Send to Mailpit', exact: true }).click();
    await expect(notice).toContainText('1 sent; 0 pending.');
  }
  await send();
  await page.clock.fastForward(3000);
  await send();
  await page.clock.fastForward(2500);
  await expect(notice).toBeVisible();
  await page.clock.fastForward(3000);
  await expect(notice).toHaveCount(0);
  await send();
  await page.route('**/api/newsletter/preview', route => route.fulfill({ status: 503, json: { error: 'Timer fixture refresh failed.' } }));
  await page.getByRole('button', { name: 'Refresh preview', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toHaveText('Timer fixture refresh failed.');
  await page.clock.fastForward(6000);
  await expect(page.locator('main').getByRole('alert')).toHaveText('Timer fixture refresh failed.');
  await expect(notice).toHaveCount(0);
});
