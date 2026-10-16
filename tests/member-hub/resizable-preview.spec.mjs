import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';

test('content divider resizes either panel by dragging or keyboard and retains the split across views', async ({ page }, info) => {
  const { service } = await seedAdmin(), id = `resize-preview-${randomUUID()}`;
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  expect((await service.from('hoa_content').insert({ id, kind: 'post', title: 'Resizable content preview', status: 'draft', visibility: 'public' })).error).toBeNull();
  try {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/admin-sign-in');
    await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
    await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/content$/);
    await page.goto(`/admin/content/${id}`);
    await page.getByRole('textbox', { name: 'Page Body', exact: true }).fill('Keep these unsaved changes while resizing.');
    await page.getByRole('button', { name: 'Side by Side', exact: true }).click();
    const divider = page.getByRole('separator', { name: 'Resize editor and preview', exact: true });
    const editing = page.getByRole('group', { name: 'Content editing controls', exact: true });
    const preview = page.getByRole('region', { name: 'Content preview', exact: true });
    const previewFrame = page.frameLocator('iframe[title="Page preview"]');
    const originalEditor = await editing.boundingBox(), originalPreview = await preview.boundingBox();
    await expect(divider).toHaveAttribute('aria-valuenow', '52');
    async function dragTo(percent) {
      const handle = await divider.boundingBox(), workspace = await page.locator('.hub-editor-workspace').boundingBox();
      await page.mouse.move(handle.x + handle.width / 2, handle.y + 120);
      await page.mouse.down();
      await page.mouse.move(workspace.x + handle.width / 2 + (workspace.width - handle.width) * percent / 100, handle.y + 120, { steps: 12 });
      await page.mouse.up();
    }
    await dragTo(66);
    await expect(divider).toHaveAttribute('aria-valuenow', '66');
    expect((await editing.boundingBox()).width).toBeGreaterThan(originalEditor.width);
    expect((await preview.boundingBox()).width).toBeLessThan(originalPreview.width);
    await expect(page.locator('.hub-editor-workspace')).not.toHaveClass(/hub-editor-workspace-resizing/);
    await expect(previewFrame.getByText('Keep these unsaved changes while resizing.', { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath('wider-editor.png'), fullPage: true });
    await dragTo(35);
    await expect(divider).toHaveAttribute('aria-valuenow', '35');
    expect((await preview.boundingBox()).width).toBeGreaterThan(originalPreview.width);
    await preview.getByRole('button', { name: 'Mobile preview', exact: true }).click();
    await expect.poll(() => page.locator('iframe[title="Page preview"]').evaluate(frame => frame.contentWindow.innerWidth)).toBe(390);
    await page.screenshot({ path: info.outputPath('wider-preview.png'), fullPage: true });
    await dragTo(5); await expect(divider).toHaveAttribute('aria-valuenow', '30');
    await dragTo(95); await expect(divider).toHaveAttribute('aria-valuenow', '70');
    await divider.focus(); await divider.press('Home'); await expect(divider).toHaveAttribute('aria-valuenow', '30');
    await divider.press('ArrowRight'); await expect(divider).toHaveAttribute('aria-valuenow', '32');
    await divider.press('Shift+ArrowRight'); await expect(divider).toHaveAttribute('aria-valuenow', '42');
    await divider.press('ArrowLeft'); await expect(divider).toHaveAttribute('aria-valuenow', '40');
    await page.getByRole('button', { name: 'Page Settings', exact: true }).click();
    await expect(divider).toHaveAttribute('aria-valuenow', '40');
    await dragTo(60); await expect(divider).toHaveAttribute('aria-valuenow', '60');
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(divider).toHaveCount(0);
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Page Body', exact: true })).toHaveText('Keep these unsaved changes while resizing.');
    await page.getByRole('button', { name: 'Side by Side', exact: true }).click();
    await expect(divider).toHaveAttribute('aria-valuenow', '60');
    await divider.dblclick(); await expect(divider).toHaveAttribute('aria-valuenow', '52');
    await divider.press('End'); await expect(divider).toHaveAttribute('aria-valuenow', '70');
    await divider.press('Enter'); await expect(divider).toHaveAttribute('aria-valuenow', '52');
    for (const width of [1280, 2560]) {
      await page.setViewportSize({ width, height: 1080 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const left = await editing.boundingBox(), right = await preview.boundingBox();
      expect(left.x + left.width).toBeLessThan(right.x);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(divider).toBeHidden();
    const left = await editing.boundingBox(), right = await preview.boundingBox();
    expect(right.y).toBeGreaterThanOrEqual(left.y + left.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('stacked-mobile.png'), fullPage: true });
    const stored = (await service.from('hoa_content').select('body,status').eq('id', id).single()).data;
    expect(stored.body).toEqual([]); expect(stored.status).toBe('draft');
    expect(errors).toEqual([]);
  } finally { await service.from('hoa_content').delete().eq('id', id); }
});
