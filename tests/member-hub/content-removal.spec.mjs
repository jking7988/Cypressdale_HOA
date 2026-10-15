import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';

test('content rows support confirmed deletion, preserve files and reject linked or changed content', async ({ page, request }, info) => {
  const { service } = await seedAdmin();
  const prefix = `Content Removal Fixture ${randomUUID()}`;
  const rows = ['post', 'event', 'page'].map(kind => ({ id: `remove-${kind}-${randomUUID()}`, kind, title: `${prefix} ${kind}`,
    status: kind === 'event' ? 'draft' : 'published', visibility: 'public', settings: {}, body: [], sections: [] }));
  const linked = { ...rows[0], id: `remove-linked-${randomUUID()}`, title: `${prefix} with comments` };
  const ids = [...rows, linked].map(row => row.id);
  try {
    expect((await service.from('hoa_content').insert([...rows, linked])).error).toBeNull();
    expect((await service.from('hoa_comments').insert({ content_id: linked.id, display_name: 'Fixture', message: 'Preserve this discussion.' })).error).toBeNull();
    const asset = (await service.from('hoa_assets').select('id,sha256').eq('library', 'files').limit(1).single()).data;
    expect(asset).toBeTruthy();
    expect((await service.from('hoa_content_assets').insert({ content_id: rows[0].id, asset_id: asset.id })).error).toBeNull();
    expect((await request.get(`/news/${rows[0].id}`)).status()).toBe(200);
    await page.goto('/admin-sign-in');
    await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
    await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/content$/);
    await page.getByLabel('Search content', { exact: true }).fill(prefix);
    const modal = page.getByRole('dialog', { name: 'Delete content', exact: true });
    const edit = await page.getByRole('link', { name: `Edit ${rows[0].title}`, exact: true }).boundingBox();
    const deletion = await page.getByRole('button', { name: `Delete ${rows[0].title}`, exact: true }).boundingBox();
    expect(Math.abs(edit.y - deletion.y)).toBeLessThan(2);
    await page.screenshot({ path: info.outputPath('delete-content-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: `Delete ${rows[0].title}`, exact: true }).click();
    await expect(modal).toContainText(rows[0].title);
    await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect((await service.from('hoa_content').select('id').eq('id', rows[0].id).single()).data).toBeTruthy();
    await page.getByRole('button', { name: `Delete ${linked.title}`, exact: true }).click();
    await modal.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(modal.getByRole('alert')).toContainText('Content has comments.');
    expect((await service.from('hoa_comments').select('id').eq('content_id', linked.id)).data).toHaveLength(1);
    await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: `Delete ${rows[1].title}`, exact: true }).click();
    expect((await service.from('hoa_content').update({ title: `${rows[1].title} updated` }).eq('id', rows[1].id)).error).toBeNull();
    await modal.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(modal.getByRole('alert')).toContainText('Content changed.');
    await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.reload();
    await page.getByLabel('Search content', { exact: true }).fill(prefix);
    rows[1].title += ' updated';
    await page.setViewportSize({ width: 390, height: 844 });
    for (const row of rows) {
      await page.getByRole('button', { name: `Delete ${row.title}`, exact: true }).click();
      await expect(modal).toBeVisible();
      if (row.kind === 'post') {
        expect(await modal.evaluate(element => element.getBoundingClientRect().width <= innerWidth)).toBe(true);
        await page.screenshot({ path: info.outputPath('delete-content-mobile.png'), fullPage: true });
      }
      await modal.getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(page.locator('main').getByRole('status')).toHaveText('Content deleted.');
      await expect(page.getByRole('button', { name: `Delete ${row.title}`, exact: true })).toHaveCount(0);
      expect((await service.from('hoa_content').select('id').eq('id', row.id)).data).toHaveLength(0);
    }
    expect((await request.get(`/news/${rows[0].id}`)).status()).toBe(404);
    expect((await request.get(`/content/${rows[2].id}`)).status()).toBe(404);
    expect((await service.from('hoa_assets').select('id,sha256').eq('id', asset.id).single()).data).toEqual(asset);
    await page.reload();
    await page.getByLabel('Search content', { exact: true }).fill(prefix);
    await expect(page.getByRole('button', { name: `Delete ${linked.title}`, exact: true })).toBeVisible();
    for (const row of rows) await expect(page.getByRole('button', { name: `Delete ${row.title}`, exact: true })).toHaveCount(0);
  } finally {
    await service.from('hoa_content').delete().in('id', ids);
  }
});
