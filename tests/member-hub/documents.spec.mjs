import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';

test('document workspace preserves migrated folders and supports folder creation, upload, moves, and removal', async ({ page, context }, info) => {
  test.setTimeout(120000);
  const { service } = await seedAdmin();
  const original = await service.from('hoa_content').select('id,kind,title,settings').in('kind', ['documentFile', 'documentFolder']).order('id');
  expect(original.error).toBeNull();
  const prefix = `Document Fixture ${randomUUID()}`;
  const folderNames = [`${prefix} Folder A`, `${prefix} Folder B`];
  const title = `${prefix} PDF`;
  let assetId;
  const publicPage = await context.newPage();
  try {
    await page.goto('/admin-sign-in');
    await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
    await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/content$/);
    await page.getByRole('navigation', { name: 'Administration' }).getByRole('link', { name: 'Documents', exact: true }).click();
    const tree = page.getByRole('navigation', { name: 'Folder tree' });
    for (const folder of original.data.filter(row => row.kind === 'documentFolder')) await expect(tree.locator('summary').filter({ hasText: folder.title })).toHaveCount(1);
    for (const name of folderNames) {
      await page.getByRole('button', { name: 'New Folder', exact: true }).click();
      await page.getByLabel('Folder Name', { exact: true }).fill(name);
      await page.getByRole('button', { name: 'Save Folder', exact: true }).click();
      await expect(page.getByRole('status')).toHaveText('Folder saved.');
      await expect(tree.locator('summary').filter({ hasText: name })).toHaveCount(1);
    }
    await publicPage.goto('/documents');
    await expect(publicPage.locator('summary').filter({ hasText: folderNames[0] })).toHaveCount(1);
    await publicPage.locator('summary').filter({ hasText: folderNames[0] }).click();
    await expect(publicPage.getByText('No documents in this folder.', { exact: true }).first()).toBeVisible();
    await tree.locator('summary').filter({ hasText: folderNames[0] }).click();
    await page.getByRole('button', { name: 'Add Document', exact: true }).click();
    await page.getByLabel('Document Title', { exact: true }).fill(title);
    await page.getByRole('button', { name: 'Save Document', exact: true }).click();
    await expect(page.locator('main').getByRole('alert')).toHaveText('Choose a document file.');
    await page.getByLabel('Upload File', { exact: true }).setInputFiles({ name: `${prefix}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF') });
    await expect(page.getByRole('status')).toHaveText('File uploaded.');
    assetId = await page.getByLabel('File', { exact: true }).inputValue();
    await page.getByRole('button', { name: 'Save Document', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Document saved.');
    const saved = await service.from('hoa_content').select('*').eq('title', title).single();
    expect(saved.error).toBeNull();
    const folderA = (await service.from('hoa_content').select('*').eq('title', folderNames[0]).single()).data;
    const folderB = (await service.from('hoa_content').select('*').eq('title', folderNames[1]).single()).data;
    expect(saved.data.settings.folder._ref).toBe(folderA.id);
    await expect(page.getByRole('button', { name: `Remove folder ${folderNames[0]}`, exact: true })).toBeDisabled();
    await publicPage.reload();
    const publicFolder = publicPage.locator('details').filter({ has: publicPage.locator('summary').filter({ hasText: folderNames[0] }) });
    await publicFolder.locator('summary').click();
    await expect(publicFolder.getByRole('link', { name: new RegExp('Document Fixture') })).toHaveAttribute('href', `/api/member-hub/assets/${assetId}`);
    expect((await publicPage.request.get(`/api/member-hub/assets/${assetId}`)).status()).toBe(200);
    await page.getByRole('button', { name: `Edit ${title}`, exact: true }).click();
    await page.getByLabel('Folder', { exact: true }).selectOption(folderB.id);
    await page.getByRole('button', { name: 'Save Document', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Document saved.');
    expect((await service.from('hoa_content').select('settings').eq('id', saved.data.id).single()).data.settings.folder._ref).toBe(folderB.id);
    await page.goto(`/admin/content/${saved.data.id}`);
    await expect(page).toHaveURL(new RegExp(`/admin/documents\\?item=${saved.data.id}$`));
    await expect(page.getByLabel('Folder', { exact: true })).toHaveValue(folderB.id);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: info.outputPath('document-tree-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('document-tree-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: `Remove ${title}`, exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Document removed.');
    await page.getByRole('button', { name: `Remove folder ${folderNames[1]}`, exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Folder removed.');
    const retained = await service.from('hoa_content').select('id,kind,title,settings').in('id', original.data.map(row => row.id)).order('id');
    expect(retained.data).toEqual(original.data);
  } finally {
    await publicPage.close();
    await service.from('hoa_content').delete().eq('title', title);
    await service.from('hoa_content').delete().in('title', folderNames);
    if (assetId) {
      const asset = (await service.from('hoa_assets').select('object_path').eq('id', assetId).single()).data;
      await service.from('hoa_assets').delete().eq('id', assetId);
      if (asset) await service.storage.from('hoa-content').remove([asset.object_path]);
    }
  }
});
