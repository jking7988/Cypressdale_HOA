import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';

test('published content and its draft share one row, with safe edit, preview, discard and publication flows', async ({ page, context }, info) => {
  const { service } = await seedAdmin();
  const id = `group-${randomUUID()}`, standaloneId = `drafts.group-${randomUUID()}`;
  const prefix = `Group Fixture ${randomUUID()}`;
  const liveTitle = `${prefix} Live`, draftTitle = `${prefix} Changes`, standaloneTitle = `${prefix} Draft Only`;
  const base = { kind: 'post', visibility: 'public', body: [], sections: [], settings: {} };
  const rows = [{ ...base, id, title: liveTitle, status: 'published' },
    { ...base, id: `drafts.${id}`, title: draftTitle, status: 'draft' },
    { ...base, id: standaloneId, title: standaloneTitle, status: 'draft' }];
  const publicPage = await context.newPage();
  try {
    expect((await service.from('hoa_content').insert(rows)).error).toBeNull();
    await page.goto('/admin-sign-in');
    await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
    await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/content$/);
    await page.getByLabel('Search content', { exact: true }).fill(prefix);
    await expect(page.locator('tbody tr')).toHaveCount(2);
    const paired = page.locator('tbody tr').filter({ has: page.getByRole('link', { name: draftTitle, exact: true }) });
    await expect(paired.getByText('Published', { exact: true })).toBeVisible();
    await expect(paired.getByText('Draft changes', { exact: true })).toBeVisible();
    await expect(paired.getByRole('link', { name: `Edit ${draftTitle}`, exact: true })).toHaveAttribute('href', `/admin/content/drafts.${id}`);
    await expect(paired.getByRole('link', { name: `Preview ${draftTitle}`, exact: true })).toHaveAttribute('href', `/content/${id}`);
    await publicPage.goto(`/content/${id}`);
    await expect(publicPage.getByRole('heading', { name: liveTitle, exact: true })).toBeVisible();
    for (const status of ['draft', 'published']) {
      await page.getByLabel('Filter Status', { exact: true }).selectOption(status);
      await expect(paired).toHaveCount(1);
    }
    await page.getByLabel('Filter Status', { exact: true }).selectOption('all');
    await page.getByLabel('Search content', { exact: true }).fill(liveTitle);
    await expect(paired).toHaveCount(1);
    await page.getByLabel('Search content', { exact: true }).fill(prefix);
    await page.screenshot({ path: info.outputPath('grouped-content-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('grouped-content-mobile.png'), fullPage: true });
    await paired.getByRole('button', { name: `Discard draft for ${draftTitle}`, exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Delete content', exact: true });
    await expect(modal).toContainText('The published version stays live.');
    await modal.getByRole('button', { name: 'Discard Draft', exact: true }).click();
    await expect(page.locator('main').getByRole('status')).toHaveText('Draft discarded.');
    await expect(page.getByRole('link', { name: liveTitle, exact: true })).toBeVisible();
    expect((await service.from('hoa_content').select('title').eq('id', id).single()).data.title).toBe(liveTitle);
    await publicPage.reload();
    await expect(publicPage.getByRole('heading', { name: liveTitle, exact: true })).toBeVisible();
    const previewHref = await page.getByRole('link', { name: `Preview ${standaloneTitle}`, exact: true }).getAttribute('href');
    await page.goto(previewHref);
    await expect(page.getByRole('button', { name: 'Preview', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.frameLocator('iframe[title="Page preview"]').getByRole('heading', { name: standaloneTitle, exact: true })).toBeVisible();
    expect((await service.from('hoa_content').insert(rows[1])).error).toBeNull();
    await page.goto('/admin/content');
    await page.getByLabel('Search content', { exact: true }).fill(prefix);
    await page.getByRole('link', { name: `Edit ${draftTitle}`, exact: true }).click();
    await expect(page.getByLabel('Title', { exact: true })).toHaveValue(draftTitle);
    await expect(page.getByRole('link', { name: 'Open Saved Page', exact: true })).toHaveAttribute('href', `/content/${id}`);
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/content/${id}$`));
    await page.goto('/admin/content');
    await page.getByLabel('Search content', { exact: true }).fill(prefix);
    await expect(page.locator('tbody tr')).toHaveCount(2);
    await expect(page.getByText('Draft changes', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: `Edit ${draftTitle}`, exact: true })).toHaveAttribute('href', `/admin/content/${id}`);
  } finally {
    await publicPage.close();
    await service.from('hoa_content').delete().in('id', [id, `drafts.${id}`, standaloneId]);
  }
});
