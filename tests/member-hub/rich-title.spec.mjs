import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';

test('title controls match the body and retain formatting through draft reload, preview and publication', async ({ page }, info) => {
  test.setTimeout(180000);
  const { service } = await seedAdmin();
  const prefix = `rich-title-${randomUUID()}`, ids = [];
  try {
    await page.goto('/admin-sign-in');
    await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
    await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/content$/);
    for (const [kind, route] of [['post', 'news'], ['event', 'events'], ['page', 'content']]) {
      const id = `${prefix}-${kind}`, title = `Formatted community title ${kind}`; ids.push(id);
      expect((await service.from('hoa_content').insert({ id, kind, title, status: 'draft', visibility: 'public', settings: kind === 'event' ? { startDate: '2099-11-01T15:00:00Z' } : {} })).error).toBeNull();
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(`/admin/content/${id}`);
      const editor = page.locator('.hub-rich-editor[data-editor-label="Title"]');
      const editable = page.getByRole('textbox', { name: 'Title', exact: true });
      await expect(editable).toHaveText(title);
      const bodyToolbar = page.locator('.hub-rich-editor[data-editor-label="Page Body"] [role="toolbar"]');
      await expect(bodyToolbar).toBeVisible();
      expect(await editor.getByRole('toolbar').getByRole('button').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label'))))
        .toEqual(await bodyToolbar.getByRole('button').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label'))));
      await editable.click(); await editable.press('ControlOrMeta+a');
      await expect(editor.getByRole('toolbar')).toHaveAttribute('data-selection-expanded', 'true');
      for (const [name, tag] of [['Bold', 'strong'], ['Italic', 'em'], ['Underline', 'u']]) {
        await editor.getByRole('button', { name, exact: true }).click();
        await expect(editable.locator(tag)).toBeVisible();
      }
      await editor.getByRole('button', { name: 'Align Center', exact: true }).click();
      await expect(editable.locator('p')).toHaveCSS('text-align', 'center');
      await editor.getByLabel('Text Size', { exact: true }).click();
      await expect(editor.getByLabel('Text Size', { exact: true })).toBeFocused();
      await editor.getByLabel('Text Size', { exact: true }).fill('32');
      await expect(editable).toHaveText(title);
      await editor.getByLabel('Text Color', { exact: true }).evaluate(input => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '#ad1457');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await editor.getByRole('button', { name: 'Add Link', exact: true }).click();
      await editor.getByLabel('Link URL', { exact: true }).fill('https://example.test/community');
      await editor.getByRole('button', { name: 'Apply Link', exact: true }).click();
      await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
      await expect(page.locator('.hub-editor-save-state')).toHaveText('Saved');
      const saved = (await service.from('hoa_content').select('title,settings,status').eq('id', id).single()).data;
      expect(saved.status).toBe('draft'); expect(saved.title).toBe(title);
      expect(saved.settings.titleRichText[0].textAlign).toBe('center');
      expect(saved.settings.titleRichText[0].children[0].marks).toEqual(expect.arrayContaining(['strong', 'em', 'underline']));
      await page.reload();
      await expect(editable).toHaveText(title);
      await expect(editable.locator('p')).toHaveCSS('text-align', 'center');
      await expect(editable.locator('strong')).toBeVisible();
      await page.getByRole('button', { name: 'Side by Side', exact: true }).click();
      const preview = page.frameLocator('iframe[title="Page preview"]');
      const previewTitle = preview.getByRole('heading', { name: title, exact: true });
      await expect(previewTitle.locator('span').first()).toHaveCSS('text-align', 'center');
      await expect(previewTitle.getByRole('link', { name: title, exact: true })).toHaveAttribute('href', 'https://example.test/community');
      await page.getByRole('button', { name: 'Publish', exact: true }).click();
      await expect(page.getByRole('status')).toContainText('Page saved.');
      await page.goto(`/${route}/${id}`);
      const heading = page.getByRole('heading', { name: title, exact: true });
      await expect(heading.locator('strong')).toBeVisible(); await expect(heading.locator('em')).toBeVisible();
      await expect(heading.locator('[style*="font-size"]')).toHaveCSS('font-size', '32px');
      await expect(heading.locator('[style*="font-size"]')).toHaveCSS('color', 'rgb(173, 20, 87)');
      await expect(heading.getByRole('link', { name: title, exact: true })).toHaveAttribute('href', 'https://example.test/community');
      expect(await heading.evaluate(element => [...element.querySelectorAll('*')].some(child => getComputedStyle(child).textDecorationLine.includes('underline')))).toBe(true);
      expect(await heading.locator('h1,h2,h3,p,ul,ol,li').count()).toBe(0);
      await page.screenshot({ path: info.outputPath(`${kind}-title-desktop.png`), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`${kind}-title-mobile.png`), fullPage: true });
      await page.goto('/admin/content');
      await page.getByLabel('Search content', { exact: true }).fill(title);
      await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
    }
  } finally { if (ids.length) await service.from('hoa_content').delete().in('id', ids); }
});
