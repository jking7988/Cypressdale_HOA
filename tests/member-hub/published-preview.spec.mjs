import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';

test('saved content types stay editable and previews match published page backgrounds and frames', async ({ page, context }, info) => {
  test.setTimeout(120000);
  const { service } = await seedAdmin();
  const id = `preview-type-${randomUUID()}`;
  const title = 'Published Preview Fixture';
  const errors = [];
  const previewRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/\/api\/(news\/comments|rsvp)/.test(request.url())) previewRequests.push(request.url()); });
  expect((await service.from('hoa_content').insert({ id, kind: 'post', title, status: 'published', visibility: 'public',
    body: [], sections: [], settings: { showCalendar: false, showNewsletterSignup: false } })).error).toBeNull();
  const published = await context.newPage();
  try {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/admin-sign-in');
    await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
    await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/content$/);
    await page.goto(`/admin/content/${id}`);
    await page.getByRole('button', { name: 'Page Settings', exact: true }).click();
    const preview = page.frameLocator('iframe[title="Page preview"]');
    const type = page.getByLabel('Content Type', { exact: true });
    await expect(type).toBeEnabled();
    for (const [kind, route] of [['post', 'news'], ['event', 'events'], ['post', 'news']]) {
      await type.selectOption(kind);
      await expect(preview.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
      await expect(page.locator('main').getByRole('status')).toContainText('Page saved');
      expect((await service.from('hoa_content').select('kind').eq('id', id).single()).data.kind).toBe(kind);
      const dimensions = await page.locator('iframe[title="Page preview"]').evaluate(frame => ({ width: frame.contentWindow.innerWidth, height: frame.contentWindow.innerHeight }));
      await published.setViewportSize(dimensions);
      expect((await published.goto(`/${route}/${id}`)).status()).toBe(200);
      const styles = element => {
        const style = getComputedStyle(element);
        return [style.backgroundImage, style.backgroundColor, style.borderColor, style.borderRadius, style.padding, style.fontSize, style.fontWeight];
      };
      await expect.poll(() => preview.locator('main > div').first().evaluate(styles)).toEqual(await published.locator('main > div').first().evaluate(styles));
      await expect.poll(() => preview.locator('article').evaluate(styles)).toEqual(await published.locator('article').evaluate(styles));
      await expect.poll(() => preview.getByRole('heading', { name: title, exact: true }).evaluate(styles)).toEqual(await published.getByRole('heading', { name: title, exact: true }).evaluate(styles));
      if (kind === 'post') {
        await expect(preview.getByRole('heading', { name: 'Discussion', exact: true })).toHaveCount(0);
        const background = preview.locator('[style*="newsletter-bg.png"]');
        await expect(background).toHaveCount(1);
        await expect.poll(() => background.evaluate(styles)).toEqual(await published.locator('[style*="newsletter-bg.png"]').evaluate(styles));
      }
      await page.screenshot({ path: info.outputPath(`${kind}-preview-desktop.png`), fullPage: true });
    }
    await page.reload();
    await page.getByRole('button', { name: 'Page Settings', exact: true }).click();
    await expect(type).toHaveValue('post');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(preview.getByRole('heading', { name: title, exact: true })).toBeVisible();
    expect(await preview.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('news-preview-mobile.png'), fullPage: true });
    expect(errors).toEqual([]);
    expect(previewRequests).toEqual([]);
  } finally {
    await published.close();
    await service.from('hoa_content').delete().eq('id', id);
  }
});
