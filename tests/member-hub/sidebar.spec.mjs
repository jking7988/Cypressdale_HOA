import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { seedAdmin } from '../../scripts/member-hub/local.mjs';

test('published pages render Calendar, newsletter, and Community independently', async ({ page }, info) => {
  test.setTimeout(120000);
  const { service } = await seedAdmin();
  const ids = [];
  try {
    for (const kind of ['event', 'post', 'page']) {
      const id = `sidebar-test-${randomUUID()}`;
      ids.push(id);
      expect((await service.from('hoa_content').insert({ id, kind, title: id, status: 'published', visibility: 'public',
        body: [], sections: [], settings: {} })).error).toBeNull();
      const route = kind === 'event' ? 'events' : kind === 'post' ? 'news' : 'content';
      for (let mask = 0; mask < 8; mask++) {
        const settings = { showRightSidebar: !!(mask & 1), showCalendar: !!(mask & 2), showNewsletterSignup: !!(mask & 4) };
        expect((await service.from('hoa_content').update({ settings }).eq('id', id)).error).toBeNull();
        expect((await page.goto(`/${route}/${id}`)).status()).toBe(200);
        const main = page.locator('main');
        for (const [name, enabled] of [['Community', settings.showRightSidebar], ['Calendar', settings.showCalendar],
          ['Cypressdale Email Newsletter', settings.showNewsletterSignup]]) {
          await expect(main.getByRole('heading', { name, exact: true })).toHaveCount(enabled ? 1 : 0);
        }
        if (settings.showCalendar) await expect(main.getByRole('link', { name: /Open events calendar/ })).toHaveAttribute('href', '/events');
      }
      await page.screenshot({ path: info.outputPath(`${kind}-sidebar-desktop.png`), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole('heading', { name: 'Cypressdale Email Newsletter', exact: true }).scrollIntoViewIfNeeded();
      await expect(page.getByLabel('Email address', { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`${kind}-sidebar-mobile.png`), fullPage: true });
      await page.setViewportSize({ width: 1280, height: 900 });
    }
  } finally {
    if (ids.length) await service.from('hoa_content').delete().in('id', ids);
  }
});
