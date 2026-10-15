import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';

test('Admins and Homeowners have separate entries on desktop and mobile', async ({ page }, info) => {
  for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 320, height: 740 }]]) {
    await page.setViewportSize(viewport);
    await page.goto('/homeowners');
    await expect(page.getByRole('heading', { name: 'Homeowners', exact: true })).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('Coming soon.');
    await expect(page.locator('form')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Member Hub', exact: true })).toHaveCount(0);
    const nav = page.getByRole('navigation', { name: 'Account portals' });
    await expect(nav.getByRole('link', { name: 'Admins', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Homeowners', exact: true })).toBeVisible();
    const portals = await nav.boundingBox();
    const brand = await page.getByRole('link', { name: 'Cypressdale HOA', exact: true }).boundingBox();
    expect(portals.x + portals.width).toBeLessThanOrEqual(brand.x);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect.poll(() => page.locator('main img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    await page.screenshot({ path: info.outputPath(`homeowners-${name}.png`), fullPage: true });
    await nav.getByRole('link', { name: 'Admins', exact: true }).click();
    await expect(page).toHaveURL(/\/admin-sign-in$/);
    await expect(page.getByRole('heading', { name: 'Admin Sign In' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Register as a Resident' })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`admins-${name}.png`), fullPage: true });
  }
});

test('the admin sign-in accepts admins and rejects approved resident accounts', async ({ page }) => {
  const { service } = await seedAdmin();
  const email = `portal-${randomUUID()}@example.test`, password = 'PortalFixture2026!';
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true,
    user_metadata: { full_name: 'Portal Fixture', address: '1 Test Lane' } });
  expect(created.error).toBeNull();
  const id = created.data.user.id;
  try {
    await service.from('hoa_profiles').update({ membership_status: 'approved' }).eq('id', id);
    await page.goto('/admin-sign-in');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page.locator('main').getByRole('alert')).toContainText('invited admin account');
    await page.goto('/admin/content'); await expect(page).toHaveURL(/\/admin-sign-in$/);
    await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
    await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/content$/);
  } finally { await service.auth.admin.deleteUser(id); }
});
