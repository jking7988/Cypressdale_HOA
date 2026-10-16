import { test, expect } from '@playwright/test';
import { seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';

test('newsletter distinguishes local capture, live delivery, tester-only delivery and disabled delivery', async ({ page }) => {
  await seedAdmin();
  await page.goto('/admin-sign-in');
  await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
  await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/content$/);
  await page.goto('/admin/newsletter');
  await expect(page.getByText('Mailpit', { exact: true })).toBeVisible();
  const local = await (await page.request.get('/api/newsletter/preview')).json();
  expect(local.transport).toBe('mailpit'); expect(local.live).toBe(false);
  let configuration = { transport: 'resend', live: true, subscribers: 24 };
  const requests = [];
  await page.route('**/api/newsletter/send', async route => { requests.push(route.request().method()); await route.abort(); });
  await page.route('**/api/newsletter/preview', route => route.fulfill({ json: {
    ...local, ...configuration, items: [{ id: 'status-fixture', kind: 'post', title: 'Newsletter status fixture' }],
    availableItems: [{ id: 'status-fixture', kind: 'post', title: 'Newsletter status fixture' }],
    html: '<h1>Newsletter status fixture</h1>',
  } }));
  const refresh = page.getByRole('button', { name: 'Refresh preview', exact: true });
  const send = page.getByRole('button', { name: 'Send Newsletter', exact: true });
  await refresh.click();
  await expect(page.getByText('Live Delivery', { exact: true })).toBeVisible();
  await expect(page.getByText('Staging', { exact: true })).toHaveCount(0);
  await expect(send).toBeEnabled();
  let confirmation = '';
  page.once('dialog', async dialog => { confirmation = dialog.message(); await dialog.dismiss(); });
  await send.click();
  expect(confirmation).toBe('Send this newsletter to 24 confirmed subscribers?');
  configuration = { transport: 'resend', live: false, subscribers: 2 };
  await refresh.click();
  await expect(page.getByText('Test Recipients Only', { exact: true })).toBeVisible();
  page.once('dialog', async dialog => { confirmation = dialog.message(); await dialog.dismiss(); });
  await send.click();
  expect(confirmation).toContain('2 confirmed subscribers on the test allowlist only');
  configuration = { transport: 'disabled', live: false, subscribers: 24 };
  await refresh.click();
  await expect(page.getByText('Delivery Disabled', { exact: true })).toBeVisible();
  await expect(send).toBeDisabled();
  expect(requests).toEqual([]);
});
