import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';

test('saved new drafts and later edits survive reloads and reopening from Content', async ({ page }) => {
  const { service } = await seedAdmin();
  const title = `Draft persistence ${randomUUID()}`;
  let id;
  try {
    await page.goto('/admin-sign-in');
    await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
    await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/content$/);
    await page.goto('/admin/content/new');
    await page.getByLabel('Title', { exact: true }).fill(title);
    const body = page.getByRole('textbox', { name: 'Page Body', exact: true });
    await body.click();
    await body.pressSequentially('First saved draft.');
    await expect(page.locator('.hub-editor-save-state')).toHaveText('Unsaved changes');
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/content\/[0-9a-f-]{36}$/);
    id = new URL(page.url()).pathname.split('/').at(-1);
    await expect(page.locator('.hub-editor-save-state')).toHaveText('Saved');
    await page.reload();
    await expect(page.getByLabel('Title', { exact: true })).toHaveText(title);
    await expect(body).toContainText('First saved draft.');
    await expect(page.locator('.hub-status')).toHaveText('Draft');
    await body.click();
    await body.press('ControlOrMeta+End');
    await body.pressSequentially(' Latest saved changes.');
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toHaveCount(0);
    await expect(page.locator('.hub-editor-save-state')).toHaveText('Saved');
    const stored = (await service.from('hoa_content').select('body,status,version').eq('id', id).single()).data;
    expect(stored.status).toBe('draft');
    expect(stored.version).toBeGreaterThan(1);
    expect(stored.body.flatMap(block => block.children || []).map(span => span.text || '').join('')).toBe('First saved draft. Latest saved changes.');
    await page.reload();
    await expect(body).toContainText('First saved draft. Latest saved changes.');
    await page.goto('/admin/content');
    await page.getByLabel('Search content', { exact: true }).fill(title);
    await page.getByLabel('Filter Status', { exact: true }).selectOption('draft');
    await page.getByRole('link', { name: title, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/content/${id}$`));
    await expect(body).toContainText('First saved draft. Latest saved changes.');
    await expect(page.locator('.hub-editor-save-state')).toHaveText('Saved');
  } finally {
    if (!id) id = (await service.from('hoa_content').select('id').eq('title', title).maybeSingle()).data?.id;
    if (id) await service.from('hoa_content').delete().eq('id', id);
  }
});
