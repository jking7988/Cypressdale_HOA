import { test, expect } from '@playwright/test';
import { seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';

test('turning section borders off removes every edge despite retained thickness and color', async ({ page }, info) => {
  test.setTimeout(120000);
  const { service } = await seedAdmin();
  const title = `Border Fixture ${Date.now()}`;
  let id;
  async function borderWidths(element) {
    return element.evaluate(node => {
      const css = getComputedStyle(node);
      return [css.borderTopWidth, css.borderRightWidth, css.borderBottomWidth, css.borderLeftWidth];
    });
  }
  try {
    await page.goto('/admin-sign-in');
    await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
    await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click(); await expect(page).toHaveURL(/\/admin\/content$/);
    await page.goto('/admin/content/new');
    await page.getByRole('button', { name: 'Page Settings', exact: true }).click();
    await page.getByLabel('Content Type', { exact: true }).selectOption('page');
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByLabel('Title', { exact: true }).fill(title);
    await page.getByRole('button', { name: 'Side by Side', exact: true }).click();
    const preview = page.getByRole('region', { name: 'Content preview', exact: true });
    const previewFrame = page.frameLocator('iframe[title="Page preview"]');
    for (const [index, kind] of ['Text', 'Image & Text', 'Topic'].entries()) {
      await page.getByRole('button', { name: kind, exact: true }).click();
      const details = page.locator('details.hub-section-controls').filter({ has: page.getByLabel(`Section ${index + 1} Title`, { exact: true }) });
      if (!(await details.evaluate(node => node.open))) await details.locator('summary').click();
      await details.getByLabel(`Section ${index + 1} Title`, { exact: true }).fill(`Border ${kind}`);
      const section = previewFrame.locator('.hub-page-section').nth(index);
      await details.getByLabel(`Section ${index + 1} Border`, { exact: true }).selectOption('strong');
      for (const [thickness, width] of [['thin', '1px'], ['medium', '2px'], ['thick', '4px']]) {
        await details.getByLabel(`Section ${index + 1} Border Thickness`, { exact: true }).selectOption(thickness);
        await expect.poll(() => borderWidths(section)).toEqual(Array(4).fill(width));
      }
      await details.getByLabel('Border Color', { exact: true }).check();
      await details.getByLabel(`Section ${index + 1} Border Color`, { exact: true }).fill('#ff0000');
      await details.getByLabel(`Section ${index + 1} Border`, { exact: true }).selectOption('none');
      await expect.poll(() => borderWidths(section)).toEqual(Array(4).fill('0px'));
      await expect(details.getByLabel(`Section ${index + 1} Border Thickness`, { exact: true })).toHaveValue('thick');
      await details.getByLabel(`Section ${index + 1} Border`, { exact: true }).selectOption('subtle');
      await expect.poll(() => borderWidths(section)).toEqual(Array(4).fill('4px'));
      await details.getByLabel(`Section ${index + 1} Border`, { exact: true }).selectOption('none');
      await details.getByLabel('Border Color', { exact: true }).uncheck();
      await expect.poll(() => borderWidths(section)).toEqual(Array(4).fill('0px'));
    }
    await page.screenshot({ path: info.outputPath('border-none-preview.png'), fullPage: true });
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    for (const section of await previewFrame.locator('.hub-page-section').all()) expect(await borderWidths(section)).toEqual(Array(4).fill('0px'));
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.locator('main').getByRole('status')).toContainText('Page saved');
    await expect(page).toHaveURL(/\/admin\/content\/[0-9a-f-]{36}$/);
    id = new URL(page.url()).pathname.split('/').at(-1);
    await page.goto(`/content/${id}`);
    await expect(page.locator('.hub-page-section')).toHaveCount(3);
    for (const section of await page.locator('.hub-page-section').all()) expect(await borderWidths(section)).toEqual(Array(4).fill('0px'));
  } finally {
    if (!id) id = (await service.from('hoa_content').select('id').eq('title', title).maybeSingle()).data?.id;
    if (id) await service.from('hoa_content').delete().eq('id', id);
  }
});
