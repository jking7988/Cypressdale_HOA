import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';

const block = text => [{ _type: 'block', _key: 'block', style: 'normal', markDefs: [], children: [{ _type: 'span', _key: 'span', text, marks: [] }] }];
const fields = ['Title', 'Page Body', 'Summary', 'Section 1 Text'];
const editorFor = (page, label) => page.locator(`.hub-rich-editor[data-editor-label="${label}"]`);

async function signIn(page) {
  await page.goto('/admin-sign-in');
  await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
  await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/content$/);
}

test('links apply to selected text in all rich fields, support editing/removal and persist to the public page', async ({ page }) => {
  const { service } = await seedAdmin(), id = `links-${randomUUID()}`;
  const title = 'Cypressdale link formatting';
  expect((await service.from('hoa_content').insert({ id, kind: 'post', title, status: 'draft', visibility: 'public', body: block('Body link'),
    settings: { excerpt: block('Summary link') }, sections: [{ _type: 'textSection', _key: 'section', body: block('Section link') }] })).error).toBeNull();
  try {
    await signIn(page); await page.goto(`/admin/content/${id}`);
    await page.getByText('Summary', { exact: true }).click();
    for (const [index, label] of fields.entries()) {
      const editor = editorFor(page, label), editable = page.getByRole('textbox', { name: label, exact: true });
      await editable.click(); await editable.press('ControlOrMeta+a');
      await expect(editor.getByRole('toolbar')).toHaveAttribute('data-selection-expanded', 'true');
      await editor.getByRole('button', { name: 'Add Link', exact: true }).click();
      await expect(editor.getByLabel('Link URL', { exact: true })).toBeFocused();
      if (index === 0) {
        await editor.getByLabel('Link URL', { exact: true }).fill('javascript:alert(1)');
        await editor.getByRole('button', { name: 'Apply Link', exact: true }).click();
        await expect(editor.getByRole('alert')).toContainText('Enter a valid');
        await expect(editable).toHaveText(title);
      }
      await editor.getByLabel('Link URL', { exact: true }).fill(`www.example.com/community-${index}`);
      await editor.getByLabel('Link URL', { exact: true }).press('Enter');
      await expect(editable.locator(`[data-link-href="https://www.example.com/community-${index}"]`)).toBeVisible();
    }
    const body = editorFor(page, 'Page Body'), bodyInput = page.getByRole('textbox', { name: 'Page Body', exact: true });
    await bodyInput.click(); await bodyInput.press('ControlOrMeta+a');
    await expect(body.getByRole('toolbar')).toHaveAttribute('data-selection-expanded', 'true');
    await body.getByRole('button', { name: 'Remove Link', exact: true }).click();
    await expect(bodyInput.locator('[data-link-href]')).toHaveCount(0);
    await expect(bodyInput).toHaveText('Body link');
    await body.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(bodyInput.locator('[data-link-href]')).toBeVisible();
    const titleEditor = editorFor(page, 'Title'), titleInput = page.getByRole('textbox', { name: 'Title', exact: true });
    await titleInput.locator('[data-link-href]').click();
    await titleInput.locator('[data-link-href]').evaluate(element => {
      const text = document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode();
      window.getSelection().setPosition(text, Math.min(3, text.textContent.length));
      document.dispatchEvent(new Event('selectionchange'));
    });
    await expect(titleEditor.getByRole('toolbar')).toHaveAttribute('data-selection-expanded', 'false');
    await expect(titleEditor.getByRole('button', { name: 'Add Link', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await titleEditor.getByRole('button', { name: 'Add Link', exact: true }).click();
    await expect(titleEditor.getByLabel('Link URL', { exact: true })).toHaveValue('https://www.example.com/community-0');
    await titleEditor.getByLabel('Link URL', { exact: true }).fill('https://example.com/updated');
    await titleEditor.getByRole('button', { name: 'Apply Link', exact: true }).click();
    await expect(titleInput).toHaveText(title);
    await expect(titleInput.locator('[data-link-href]')).toHaveAttribute('data-link-href', 'https://example.com/updated');
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(page.locator('.hub-editor-save-state')).toHaveText('Saved');
    const saved = (await service.from('hoa_content').select('*').eq('id', id).single()).data;
    for (const value of [saved.settings.titleRichText, saved.body, saved.settings.excerpt, saved.sections[0].body]) {
      expect(value[0].markDefs.some(mark => mark._type === 'link')).toBe(true);
      expect(value[0].children.some(span => span.marks.some(mark => value[0].markDefs.some(def => def._key === mark && def._type === 'link')))).toBe(true);
    }
    await page.reload();
    await expect(titleInput.locator('[data-link-href]')).toHaveAttribute('data-link-href', 'https://example.com/updated');
    await expect(bodyInput.locator('[data-link-href]')).toHaveAttribute('data-link-href', 'https://www.example.com/community-1');
    await page.getByRole('button', { name: 'Side by Side', exact: true }).click();
    const preview = page.frameLocator('iframe[title="Page preview"]');
    await expect(preview.getByRole('link', { name: 'Body link', exact: true })).toHaveAttribute('href', 'https://www.example.com/community-1');
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Page saved.');
    await page.goto(`/news/${id}`);
    for (const [name, href] of [[title, 'https://example.com/updated'], ['Body link', 'https://www.example.com/community-1'], ['Section link', 'https://www.example.com/community-3']]) {
      await expect(page.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
    }
  } finally { await service.from('hoa_content').delete().eq('id', id); }
});

test('adding a link without selecting text inserts the URL in every rich field', async ({ page }, info) => {
  const { service } = await seedAdmin(), id = `insert-links-${randomUUID()}`;
  expect((await service.from('hoa_content').insert({ id, kind: 'post', title: 'Link insertion', status: 'draft', visibility: 'public',
    sections: [{ _type: 'textSection', _key: 'section', body: [] }] })).error).toBeNull();
  try {
    await signIn(page); await page.goto(`/admin/content/${id}`);
    await page.getByText('Summary', { exact: true }).click();
    for (const [index, label] of fields.entries()) {
      const editor = editorFor(page, label), editable = page.getByRole('textbox', { name: label, exact: true });
      if (label === 'Title') {
        await editable.click(); await editable.press('End');
        await expect(editor.getByRole('toolbar')).toHaveAttribute('data-selection-expanded', 'false');
      }
      await editor.getByRole('button', { name: 'Add Link', exact: true }).click();
      await editor.getByLabel('Link URL', { exact: true }).fill(`example.com/insert-${index}`);
      await editor.getByRole('button', { name: 'Apply Link', exact: true }).click();
      await expect(editable.locator('[data-link-href]')).toHaveText(`example.com/insert-${index}`);
      await expect(editable.locator('[data-link-href]')).toHaveAttribute('data-link-href', `https://example.com/insert-${index}`);
    }
    const body = editorFor(page, 'Page Body');
    await body.getByRole('button', { name: 'Add Link', exact: true }).click();
    await body.getByLabel('Link URL', { exact: true }).fill('https://example.com/cancelled');
    await body.getByLabel('Link URL', { exact: true }).press('Escape');
    await expect(page.getByRole('textbox', { name: 'Page Body', exact: true })).toBeFocused();
    await expect(body.locator('[data-link-href]')).not.toHaveAttribute('data-link-href', 'https://example.com/cancelled');
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(page.locator('.hub-editor-save-state')).toHaveText('Saved');
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Page Body', exact: true })).toHaveText('example.com/insert-1');
    await page.setViewportSize({ width: 390, height: 844 });
    await body.getByRole('button', { name: 'Add Link', exact: true }).click();
    await expect(body.getByLabel('Link URL', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('link-controls-mobile.png'), fullPage: true });
  } finally { await service.from('hoa_content').delete().eq('id', id); }
});
