import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { seedAdmin, localAdmin, getLocalStatus } from '../../scripts/member-hub/local.mjs';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZ8AAAAASUVORK5CYII=', 'base64');
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');

test('Files and Documents stay separate, content uploads join Files, and used files are protected', async ({ page, request }, info) => {
  test.setTimeout(120000);
  const { service } = await seedAdmin();
  const prefix = `Library ${randomUUID()}`;
  const assetIds = [];
  const contentTitle = `${prefix} Event`, documentTitle = `${prefix} Document`;
  const docRows = (await service.from('hoa_content').select('id,settings').eq('kind', 'documentFile').order('id')).data;
  const existingDocIds = [...new Set(docRows.map(row => row.settings.file?.asset?._ref).filter(Boolean))];
  const classified = await service.from('hoa_assets').select('id,library').in('id', existingDocIds);
  expect(classified.error).toBeNull();
  expect(classified.data.every(asset => asset.library === 'documents')).toBe(true);
  const status = getLocalStatus();
  const admin = createClient(status.API_URL, status.ANON_KEY, { auth: { persistSession: false } });
  await admin.auth.signInWithPassword(localAdmin);
  try {
    await page.goto('/admin/files');
    await expect(page).toHaveURL(/\/admin-sign-in$/);
    await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
    await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/content$/);
    await page.goto('/admin/files');
    for (const id of existingDocIds) await expect(page.locator(`a[href="/api/member-hub/assets/${id}"]`)).toHaveCount(0);
    await page.getByLabel('Upload Files', { exact: true }).setInputFiles([
      { name: `${prefix}.png`, mimeType: 'image/png', buffer: png },
      { name: `${prefix}.pdf`, mimeType: 'application/pdf', buffer: pdf },
    ]);
    await expect(page.locator('main').getByRole('status')).toHaveText('2 files uploaded.');
    const uploaded = await service.from('hoa_assets').select('*').in('original_filename', [`${prefix}.png`, `${prefix}.pdf`]);
    expect(uploaded.data).toHaveLength(2); expect(uploaded.data.every(asset => asset.library === 'files')).toBe(true);
    uploaded.data.forEach(asset => assetIds.push(asset.id));
    const unusedPdf = uploaded.data.find(asset => asset.mime_type === 'application/pdf');
    await page.goto('/admin/documents');
    await page.getByRole('button', { name: 'Add Document', exact: true }).click();
    await expect(page.getByLabel('File', { exact: true }).locator(`option[value="${unusedPdf.id}"]`)).toHaveCount(0);
    await page.getByLabel('Document Title', { exact: true }).fill(documentTitle);
    await page.getByLabel('Upload File', { exact: true }).setInputFiles({ name: `${prefix}-document.pdf`, mimeType: 'application/pdf', buffer: pdf });
    await expect(page.locator('main').getByRole('status')).toHaveText('File uploaded.');
    const documentAssetId = await page.getByLabel('File', { exact: true }).inputValue(); assetIds.push(documentAssetId);
    await page.getByRole('button', { name: 'Save Document', exact: true }).click();
    await expect(page.locator('main').getByRole('status')).toHaveText('Document saved.');
    expect((await service.from('hoa_assets').select('library').eq('id', documentAssetId).single()).data.library).toBe('documents');
    await page.goto('/admin/content/new');
    await page.getByLabel('Title', { exact: true }).fill(contentTitle);
    await page.getByRole('button', { name: 'Page Settings', exact: true }).click();
    await page.getByLabel('Content Type', { exact: true }).selectOption('event');
    await expect(page.getByLabel('Flyer', { exact: true }).locator(`option[value="${documentAssetId}"]`)).toHaveCount(0);
    await expect(page.getByLabel('Flyer', { exact: true }).locator(`option[value="${unusedPdf.id}"]`)).toHaveCount(1);
    await page.getByLabel('Upload Image or PDF').setInputFiles({ name: `${prefix}-content.png`, mimeType: 'image/png', buffer: png });
    await expect(page.locator('main').getByRole('status')).toContainText('uploaded');
    const contentAsset = (await service.from('hoa_assets').select('*').eq('original_filename', `${prefix}-content.png`).single()).data;
    assetIds.push(contentAsset.id); expect(contentAsset.library).toBe('files');
    await page.getByLabel('Flyer', { exact: true }).selectOption(contentAsset.id);
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(page.locator('main').getByRole('status')).toContainText('Page saved');
    await page.goto('/admin/files');
    await page.getByLabel('Search files', { exact: true }).fill(prefix);
    await expect(page.getByText(`${prefix}-content.png`, { exact: true })).toBeVisible();
    await expect(page.getByText(`${prefix}-document.pdf`, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: `Remove ${prefix}-content.png`, exact: true })).toBeDisabled();
    await expect(page.getByRole('link', { name: contentTitle, exact: true })).toBeVisible();
    expect((await admin.rpc('hoa_remove_file', { target_id: contentAsset.id })).error.message).toContain('in use');
    expect((await admin.rpc('hoa_remove_file', { target_id: documentAssetId })).error.message).toContain('Document files');
    expect((await request.get(`/api/member-hub/assets/${contentAsset.id}`)).status()).toBe(404);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: info.outputPath('files-library-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const table = await page.locator('.hub-files-table').boundingBox();
    const wrap = await page.locator('.hub-files-table-wrap').boundingBox();
    expect(table.width).toBeLessThanOrEqual(wrap.width);
    await page.screenshot({ path: info.outputPath('files-library-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: `Remove ${prefix}.pdf`, exact: true }).click();
    await page.getByRole('dialog', { name: 'Remove file', exact: true }).getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(page.locator('main').getByRole('status')).toHaveText('File removed.');
    expect((await service.from('hoa_assets').select('id').eq('id', unusedPdf.id).maybeSingle()).data).toBeNull();
    expect((await service.storage.from('hoa-content').download(unusedPdf.object_path)).error).toBeTruthy();
    expect((await request.get(`/api/member-hub/assets/${unusedPdf.id}`)).status()).toBe(404);
    expect((await service.rpc('hoa_retired_asset_ids')).data).toContain(unusedPdf.id);
    await page.goto('/admin/documents');
    await page.getByRole('button', { name: 'Add Document', exact: true }).click();
    await expect(page.getByLabel('File', { exact: true }).locator(`option[value="${contentAsset.id}"]`)).toHaveCount(0);
    await expect(page.getByLabel('File', { exact: true }).locator(`option[value="${documentAssetId}"]`)).toHaveCount(1);
    expect((await service.from('hoa_content').select('id,settings').in('id', docRows.map(row => row.id)).order('id')).data).toEqual(docRows);
  } finally {
    await admin.auth.signOut({ scope: 'local' });
    await service.from('hoa_content').delete().in('title', [contentTitle, documentTitle]);
    for (const id of assetIds) {
      const asset = (await service.from('hoa_assets').select('object_path').eq('id', id).maybeSingle()).data;
      if (!asset) continue;
      await service.from('hoa_assets').delete().eq('id', id);
      await service.storage.from('hoa-content').remove([asset.object_path]);
    }
  }
});
