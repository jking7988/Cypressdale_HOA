import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { seedAdmin, localAdmin, getLocalStatus } from '../../scripts/member-hub/local.mjs';

test('subscriber directory is admin-only and removes newsletter records without removing accounts', async ({ page, request }, info) => {
  test.setTimeout(120000);
  const { service } = await seedAdmin(), status = getLocalStatus();
  const prefix = `subscriber-${randomUUID()}`;
  const email = `${prefix}@example.test`, password = 'SubscriberFixture2026!';
  const fixture = { email, name: 'Subscriber Directory Fixture', street: '123 Long Cypressdale Test Street', active: true, verified: true };
  const rows = await service.from('newsletter_subscribers').insert([
    fixture, { ...fixture, email: `${prefix}-unconfirmed@example.test`, name: null, street: null, pending_name: 'Unconfirmed Fixture', verified: false },
    { ...fixture, email: `${prefix}-unsubscribed@example.test`, name: null, street: null,
      pending_name: 'Unverified Replacement', pending_street: 'Unverified Street', active: false },
  ]).select('id,email');
  expect(rows.error).toBeNull();
  const subscriberId = rows.data.find(row => row.email === email).id;
  const account = await service.auth.admin.createUser({ email, password, email_confirm: true,
    user_metadata: { full_name: fixture.name, address: fixture.street } });
  expect(account.error).toBeNull();
  const accountId = account.data.user.id;
  try {
    expect((await request.get('/api/newsletter/subscribers')).status()).toBe(401);
    expect((await request.delete(`/api/newsletter/subscribers/${subscriberId}`, { data: { email } })).status()).toBe(401);
    await page.goto('/admin/subscribers'); await expect(page).toHaveURL(/\/admin-sign-in$/);
    await service.from('hoa_profiles').update({ membership_status: 'approved' }).eq('id', accountId);
    const client = createClient(status.API_URL, status.ANON_KEY, { auth: { persistSession: false } });
    const auth = await client.auth.signInWithPassword({ email, password }); expect(auth.error).toBeNull();
    const headers = { Authorization: `Bearer ${auth.data.session.access_token}` };
    expect((await request.get('/api/newsletter/subscribers', { headers })).status()).toBe(403);
    expect((await request.delete(`/api/newsletter/subscribers/${subscriberId}`, { headers, data: { email } })).status()).toBe(403);
    await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
    await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click(); await expect(page).toHaveURL(/\/admin\/content$/);
    await page.getByRole('navigation', { name: 'Administration' }).getByRole('link', { name: 'Subscribers', exact: true }).click();
    await page.getByLabel('Search subscribers').fill(prefix);
    const table = page.getByRole('table', { name: 'Newsletter subscribers' });
    await expect(table.locator('tbody tr')).toHaveCount(3);
    await expect(table.getByText('Unconfirmed Fixture', { exact: true })).toBeVisible();
    await expect(table.getByText('Unverified Replacement', { exact: true })).toHaveCount(0);
    await expect(table.getByText('Unverified Street', { exact: true })).toHaveCount(0);
    await expect(table.getByText(fixture.street, { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: info.outputPath('subscribers-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: /^Subscribed \d+$/ }).click(); await expect(table.locator('tbody tr')).toHaveCount(1);
    await page.getByRole('button', { name: /^Unconfirmed \d+$/ }).click(); await expect(table.locator('tbody tr')).toHaveCount(1);
    await page.getByRole('button', { name: /^Unsubscribed \d+$/ }).click(); await expect(table.locator('tbody tr')).toHaveCount(1);
    await page.getByRole('button', { name: /^All \d+$/ }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('subscribers-mobile.png'), fullPage: true });
    const payload = await (await page.request.get('/api/newsletter/subscribers')).json();
    const record = payload.subscribers.find(subscriber => subscriber.id === subscriberId);
    expect(record).not.toHaveProperty('verification_hash'); expect(record).not.toHaveProperty('unsubscribe_token');
    expect((await page.request.delete(`/api/newsletter/subscribers/${subscriberId}`, { data: { email: 'wrong@example.test' } })).status()).toBe(404);
    await page.getByRole('button', { name: `Remove ${email}`, exact: true }).click();
    let dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Remove Subscriber', exact: true })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect((await service.from('newsletter_subscribers').select('id').eq('id', subscriberId).single()).data.id).toBe(subscriberId);
    await page.getByRole('button', { name: `Remove ${email}`, exact: true }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('I confirm removal of this subscriber.').check();
    await page.screenshot({ path: info.outputPath('subscriber-removal-mobile.png'), fullPage: true });
    await dialog.getByRole('button', { name: 'Remove Subscriber', exact: true }).click();
    await expect(page.locator('main').getByRole('status')).toHaveText('Subscriber removed.');
    await expect(table.locator('tbody tr')).toHaveCount(2);
    expect((await service.from('newsletter_subscribers').select('id').eq('id', subscriberId)).data).toEqual([]);
    expect((await service.auth.admin.getUserById(accountId)).data.user.id).toBe(accountId);
    const imported = await service.rpc('hoa_import_newsletter_subscriber', { document: fixture });
    expect(imported.error).toBeNull(); expect(imported.data).toBe(false);
    expect((await service.from('newsletter_subscribers').select('id').eq('email', email)).data).toEqual([]);
    await page.getByLabel('Search subscribers').fill('no-matching-subscriber-fixture');
    await expect(page.getByText('No subscribers match this view.', { exact: true })).toBeVisible();
  } finally {
    await service.from('newsletter_subscribers').delete().in('id', rows.data.map(row => row.id));
    await service.auth.admin.deleteUser(accountId);
  }
});
