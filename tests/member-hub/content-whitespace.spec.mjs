import { test, expect } from '@playwright/test';
import { seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';
import { randomUUID } from 'node:crypto';

for (const [name, id, adminPath, publicPath] of [
  ['Yard', 'program-yard-of-the-month', '/admin/yard-of-the-month', '/yard-of-the-month'],
  ['Christmas', 'program-holiday-decorating', '/admin/holiday-decorating/christmas', '/holiday-decorating/christmas'],
  ['Halloween', 'program-halloween-decorating', '/admin/holiday-decorating/halloween', '/holiday-decorating/halloween'],
]) {
  test(`${name} text retains line breaks, blank lines, indentation and literal text in preview and publication`, async ({ page, context }, info) => {
    const { service } = await seedAdmin();
    const before = (await service.from('hoa_content').select('*').eq('id', id).single()).data;
    let ownedVersion;
    const publicPage = await context.newPage();
    const introduction = `${name} opening\n\n  First  place\n- Second place\n\tIndented note\n<strong>Literal text</strong>`;
    const schedule = 'Coming soon\n\nDates will be announced.\n  Watch for updates.';
    async function check(surface, value) {
      const text = surface.locator('.content-text').filter({ hasText: value });
      await expect(text).toHaveCount(1);
      expect(await text.textContent()).toBe(value);
      await expect(text).toHaveCSS('white-space', 'break-spaces');
      await expect(text.locator('strong')).toHaveCount(0);
      await expect.poll(() => text.evaluate(element => Number.isFinite(parseFloat(getComputedStyle(element).lineHeight))))
        .toBe(true);
      const geometry = await text.evaluate(element => {
        const value = element.textContent, node = element.firstChild;
        const range = element.ownerDocument.createRange();
        range.setStart(node, 0); range.setEnd(node, value.indexOf('\n'));
        const first = range.getBoundingClientRect();
        const next = value.indexOf('\n\n') + 2;
        range.setStart(node, next); range.setEnd(node, next + 3);
        return { firstY: first.y, nextY: range.getBoundingClientRect().y, lineHeight: parseFloat(getComputedStyle(element).lineHeight) };
      });
      expect(geometry.nextY - geometry.firstY).toBeGreaterThanOrEqual(geometry.lineHeight * 1.9);
    }
    try {
      await page.goto('/admin-sign-in');
      await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
      await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
      await page.getByRole('button', { name: 'Sign In', exact: true }).click();
      await expect(page).toHaveURL(/\/admin\/content$/);
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(adminPath);
      await page.getByRole('button', { name: 'Page Settings', exact: true }).click();
      await page.getByLabel('Introduction', { exact: true }).fill(introduction);
      if (name !== 'Yard') await page.getByLabel('Schedule', { exact: true }).fill(schedule);
      const preview = page.frameLocator('iframe[title="Page preview"]');
      await check(preview, introduction);
      if (name !== 'Yard') await check(preview, schedule);
      await page.screenshot({ path: info.outputPath(`${name}-whitespace-preview.png`), fullPage: true });
      await page.getByRole('button', { name: 'Save Page Settings', exact: true }).click();
      await expect(page.locator('main').getByRole('status')).toHaveText('Page settings saved.');
      const saved = (await service.from('hoa_content').select('version,settings').eq('id', id).single()).data;
      ownedVersion = saved.version;
      expect(saved.settings.programSettings.introduction).toBe(introduction);
      await publicPage.goto(publicPath);
      await check(publicPage, introduction);
      if (name !== 'Yard') await check(publicPage, schedule);
      await publicPage.setViewportSize({ width: 390, height: 844 });
      await check(publicPage, introduction);
      expect(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await publicPage.screenshot({ path: info.outputPath(`${name}-whitespace-mobile.png`) });
    } finally {
      await publicPage.close();
      if (ownedVersion) await service.from('hoa_content').update({ title: before.title, settings: before.settings, locally_edited: before.locally_edited }).eq('id', id).eq('version', ownedVersion);
    }
  });
}

test('rich text keeps repeated spaces, hard breaks and empty paragraphs in preview and published content', async ({ page, context }) => {
  const { service } = await seedAdmin();
  const id = `whitespace-${randomUUID()}`;
  const firstLine = 'First  line\n  Next line';
  const body = [firstLine, '', 'Final paragraph'].map((text, index) => ({
    _key: `paragraph-${index}`, _type: 'block', style: 'normal', markDefs: [],
    children: [{ _key: `text-${index}`, _type: 'span', text, marks: [] }],
  }));
  const publicPage = await context.newPage();
  async function check(surface) {
    const paragraphs = surface.locator('.hub-rich-copy > p');
    await expect(paragraphs).toHaveCount(3);
    await expect(paragraphs.first()).toHaveCSS('white-space', 'break-spaces');
    expect(await paragraphs.first().innerText()).toBe(firstLine);
    const empty = await paragraphs.nth(1).boundingBox();
    expect(empty.height).toBeGreaterThanOrEqual(20);
    await expect(paragraphs.nth(2)).toHaveText('Final paragraph');
  }
  try {
    expect((await service.from('hoa_content').insert({ id, kind: 'page', title: 'Rich text whitespace fixture', status: 'published', visibility: 'public', body, sections: [], settings: {} })).error).toBeNull();
    await page.goto('/admin-sign-in');
    await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
    await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/content$/);
    await page.goto(`/admin/content/${id}`);
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await check(page.frameLocator('iframe[title="Page preview"]'));
    await publicPage.goto(`/content/${id}`);
    await check(publicPage);
  } finally {
    await publicPage.close();
    await service.from('hoa_content').delete().eq('id', id);
  }
});
