import { test, expect } from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { seedAdmin } from '../../scripts/member-hub/local.mjs';
import { newsDay } from '../../lib/member-hub/news-list.ts';

test('news overview has newest-first cards, paging, inclusive calendar, flyers and responsive layout', async ({ page }, info) => {
  const { service } = await seedAdmin();
  const prefix = `news-directory-${randomUUID()}`;
  const day = newsDay({ _id: '', title: '', _createdAt: new Date().toISOString() });
  const image = await readFile(new URL('../../public/images/entrance.jpg', import.meta.url));
  const assetId = `${prefix}-image`, objectPath = `tests/${assetId}.jpg`;
  const rows = Array.from({ length: 8 }, (_, index) => ({
    id: `${prefix}-${index}`, kind: 'post', title: `Cypressdale neighborhood update ${index}`,
    status: 'published', visibility: 'public', published_at: `2099-01-${String(index + 1).padStart(2, '0')}T18:00:00Z`,
    settings: { newsDate: day }, body: [{ _type: 'block', _key: 'body', style: 'normal', markDefs: [],
      children: [{ _type: 'span', _key: 'text', marks: [], text: 'Community announcements and neighborhood news from Cypressdale.' }] }],
    sections: index === 7 ? [{ _type: 'fileSection', _key: 'flyer', file: { asset: { _ref: assetId } } }] : [],
  }));
  rows.push({ ...rows[0], id: `${prefix}-draft`, title: 'Unpublished directory fixture', status: 'draft' });
  rows.push({ ...rows[0], id: `${prefix}-private`, title: 'Private directory fixture', visibility: 'members' });
  try {
    expect((await service.storage.from('hoa-content').upload(objectPath, image, { contentType: 'image/jpeg' })).error).toBeNull();
    expect((await service.from('hoa_assets').insert({ id: assetId, object_path: objectPath, original_filename: 'Community flyer.jpg', mime_type: 'image/jpeg', size_bytes: image.length, sha256: createHash('sha256').update(image).digest('hex') })).error).toBeNull();
    expect((await service.from('hoa_content').insert(rows)).error).toBeNull();
    expect((await service.from('hoa_content_assets').insert({ content_id: `${prefix}-7`, asset_id: assetId })).error).toBeNull();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/news');
    const cards = page.getByLabel('News cards', { exact: true });
    await expect(cards.locator('article')).toHaveCount(6);
    await expect(cards.locator('article').first()).toHaveAttribute('id', `${prefix}-7`);
    await expect(page.getByText('Unpublished directory fixture', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Private directory fixture', { exact: true })).toHaveCount(0);
    const flyer = cards.locator('article').first().getByRole('img');
    await expect(flyer).toBeVisible();
    await expect.poll(() => flyer.evaluate(element => element.naturalWidth)).toBeGreaterThan(0);
    expect(await flyer.evaluate(element => getComputedStyle(element).objectFit)).toBe('contain');
    await expect(cards.locator('article').first().getByRole('link', { name: 'View flyer', exact: true })).toHaveAttribute('href', `/api/member-hub/assets/${assetId}`);
    expect(await cards.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(3);
    await page.screenshot({ path: info.outputPath('news-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: 'Next news page', exact: true }).click();
    await expect(page.locator(`[id="${prefix}-0"]`)).toBeVisible();
    await page.getByRole('button', { name: 'Calendar view', exact: true }).click();
    await page.getByRole('button', { name: new RegExp(`^${day},`) }).click();
    await expect(page.getByRole('heading', { name: `News on ${day}`, exact: true })).toBeVisible();
    await expect(cards.locator('article').first()).toHaveAttribute('id', `${prefix}-7`);
    await page.getByRole('button', { name: 'Next month', exact: true }).click();
    const emptyDay = page.getByLabel('News calendar', { exact: true }).getByRole('button', { name: /, 0 updates$/ }).first();
    await emptyDay.click();
    await expect(page.getByText('No news on this date.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Clear date', exact: true }).click();
    await expect(cards.locator('article')).toHaveCount(6);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('news-calendar-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'Grid view', exact: true }).click();
    expect(await cards.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('news-mobile.png'), fullPage: true });
    await cards.locator('article').first().getByRole('link', { name: 'Read update', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/news/${prefix}-7$`));
    await expect(page.getByRole('heading', { name: rows[7].title, exact: true })).toBeVisible();
  } finally {
    await service.from('hoa_content').delete().in('id', rows.map(row => row.id));
    await service.from('hoa_assets').delete().eq('id', assetId);
    await service.storage.from('hoa-content').remove([objectPath]);
  }
});
