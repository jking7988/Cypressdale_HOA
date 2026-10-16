import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { seedAdmin } from '../../scripts/member-hub/local.mjs';
import { eventDay } from '../../lib/member-hub/event-list.ts';

test('event overview shows newest postings first with paging, past archive, calendar and compact mobile cards', async ({ page }, info) => {
  const { service } = await seedAdmin();
  const prefix = `directory-${randomUUID()}`;
  const start = new Date(); start.setUTCDate(start.getUTCDate() + 2); start.setUTCHours(18, 0, 0, 0);
  const day = eventDay(start);
  const rows = Array.from({ length: 8 }, (_, index) => ({ id: `${prefix}-${index}`, kind: 'event', title: `Community gathering ${index}`,
    status: 'published', visibility: 'public', published_at: new Date(Date.now() + index * 1000).toISOString(),
    settings: { startDate: start.toISOString(), description: 'An afternoon for Cypressdale neighbors.', location: 'Cypressdale Park' } }));
  rows.push({ ...rows[0], id: `${prefix}-past`, title: 'Past community gathering', published_at: new Date(Date.now() + 10000).toISOString(),
    settings: { startDate: new Date(Date.now() - 40 * 86400000).toISOString() } });
  expect((await service.from('hoa_content').insert(rows)).error).toBeNull();
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/events');
    const cards = page.getByLabel('Event cards', { exact: true });
    await expect(cards.locator('article')).toHaveCount(6);
    await expect(cards.locator('article').first()).toHaveAttribute('id', `${prefix}-7`);
    await expect(page.getByRole('textbox', { name: 'Comment', exact: true })).toHaveCount(0);
    expect(await cards.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(3);
    await page.screenshot({ path: info.outputPath('events-desktop.png'), fullPage: true });
    const download = page.waitForEvent('download');
    await cards.locator('article').first().getByRole('button', { name: 'Download .ics file' }).click();
    expect((await download).suggestedFilename()).toBe(`event-${prefix}-7.ics`);
    await page.getByRole('button', { name: 'Next event page' }).click();
    await expect(page.locator(`[id="${prefix}-0"]`)).toBeVisible();
    await page.getByRole('button', { name: 'Past', exact: false }).click();
    await expect(page.getByRole('heading', { name: 'Past Events', exact: true })).toBeVisible();
    await expect(cards.locator('article').first()).toHaveAttribute('id', `${prefix}-past`);
    await expect(cards.getByRole('button', { name: "I'm going", exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Upcoming', exact: false }).click();
    await page.getByRole('button', { name: 'Calendar view', exact: true }).click();
    if (day.slice(0, 7) !== eventDay(new Date()).slice(0, 7)) await page.getByRole('button', { name: 'Next month', exact: true }).click();
    await page.getByRole('button', { name: new RegExp(`^${day},`) }).click();
    await expect(page.getByRole('heading', { name: `Events on ${day}`, exact: true })).toBeVisible();
    await expect(cards.locator('article').first()).toHaveAttribute('id', `${prefix}-7`);
    await page.getByRole('button', { name: 'Clear date', exact: true }).click();
    await page.getByRole('button', { name: 'Grid view', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await cards.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(1);
    await page.screenshot({ path: info.outputPath('events-mobile.png'), fullPage: true });
    await cards.locator('article').first().getByRole('link', { name: 'View event', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/events/${prefix}-7$`));
    await expect(page.getByRole('heading', { name: 'Community gathering 7', exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Discussion', exact: true })).toBeVisible();
  } finally { await service.from('hoa_content').delete().in('id', rows.map(row => row.id)); }
});
