import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';

test('paragraph alignment applies to selections and survives save, preview and published pages', async ({ page }, info) => {
  test.setTimeout(120000);
  const { service } = await seedAdmin();
  const id = `alignment-${randomUUID()}`;
  const texts = ['Left paragraph', 'Centered paragraph', 'Right heading', 'Aligned list item'];
  const body = texts.map((text, index) => ({ _type: 'block', _key: `paragraph-${index}`, style: index === 2 ? 'h2' : 'normal',
    ...(index === 3 ? { listItem: 'bullet', level: 1 } : {}),
    markDefs: [], children: [{ _type: 'span', _key: `span-${index}`, text, marks: index === 1 ? ['strong'] : [] }] }));
  expect((await service.from('hoa_content').insert({ id, kind: 'post', title: 'Paragraph alignment fixture', status: 'draft', visibility: 'public', body, settings: {} })).error).toBeNull();
  try {
    await page.goto('/admin-sign-in');
    await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
    await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/content$/);
    await page.goto(`/admin/content/${id}`);
    const editor = page.locator('.hub-rich-editor[data-editor-label="Page Body"]');
    const editable = editor.getByRole('textbox', { name: 'Page Body', exact: true });
    const align = name => editor.getByRole('button', { name: `Align ${name}`, exact: true });
    await editable.getByText(texts[0], { exact: true }).click();
    await editable.press('ControlOrMeta+a');
    await expect(editor.getByRole('toolbar')).toHaveAttribute('data-selected-blocks', '4');
    await align('Center').click();
    await expect(editable.locator('p').filter({ hasText: texts[0] })).toHaveCSS('text-align', 'center');
    await expect(editable.locator('h2')).toHaveCSS('text-align', 'center');
    await editable.getByText(texts[0], { exact: true }).click();
    await expect(editor.getByRole('toolbar')).toHaveAttribute('data-selected-blocks', '1');
    await align('Left').click();
    await expect(editable.locator('p').filter({ hasText: texts[0] })).toHaveCSS('text-align', 'left');
    await editable.getByText(texts[1], { exact: true }).click();
    await expect(align('Center')).toHaveAttribute('aria-pressed', 'true');
    await align('Right').click();
    await expect(editable.locator('p').filter({ hasText: texts[1] })).toHaveCSS('text-align', 'right');
    await editor.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(editable.locator('p').filter({ hasText: texts[1] })).toHaveCSS('text-align', 'center');
    await editor.getByRole('button', { name: 'Redo', exact: true }).click();
    await expect(editable.locator('p').filter({ hasText: texts[1] })).toHaveCSS('text-align', 'right');
    await align('Center').click();
    await editable.getByText(texts[2], { exact: true }).click();
    await expect(editor.getByLabel('Paragraph Style', { exact: true })).toHaveValue('h2');
    await align('Right').click();
    await expect(align('Right')).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Page saved.');
    const saved = (await service.from('hoa_content').select('body').eq('id', id).single()).data.body;
    expect(saved.map(block => block.textAlign)).toEqual(['left', 'center', 'right', 'center']);
    expect(saved[1].children[0].marks).toContain('strong');
    await page.getByRole('button', { name: 'Side by Side', exact: true }).click();
    const preview = page.frameLocator('iframe[title="Page preview"]');
    await expect(preview.locator('p').filter({ hasText: texts[1] })).toHaveCSS('text-align', 'center');
    await expect(preview.getByRole('heading', { name: texts[2], exact: true })).toHaveCSS('text-align', 'right');
    await page.screenshot({ path: info.outputPath('alignment-editor-desktop.png'), fullPage: true });
    await page.goto(`/admin/content/${id}`);
    await expect(page.locator('.hub-rich-editable p').filter({ hasText: texts[1] })).toHaveCSS('text-align', 'center');
    for (const [kind, route, contentId] of [['post', 'news', id], ['event', 'events', `${id}-event`], ['page', 'content', `${id}-page`]]) {
      if (kind !== 'post') expect((await service.from('hoa_content').insert({ id: contentId, kind, title: 'Published alignment fixture', status: 'published', visibility: 'public', body: saved,
        settings: kind === 'event' ? { startDate: '2099-11-01T15:00:00Z' } : {} })).error).toBeNull();
      await page.goto(`/${route}/${contentId}`);
      await expect(page.locator('p').filter({ hasText: texts[0] })).toHaveCSS('text-align', 'left');
      await expect(page.locator('p').filter({ hasText: texts[1] })).toHaveCSS('text-align', 'center');
      await expect(page.getByRole('heading', { name: texts[2], exact: true })).toHaveCSS('text-align', 'right');
      await expect(page.locator('li').filter({ hasText: texts[3] })).toHaveCSS('text-align', 'center');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('alignment-public-mobile.png'), fullPage: true });
  } finally { await service.from('hoa_content').delete().in('id', [id, `${id}-event`, `${id}-page`]); }
});
