import { test, expect } from '@playwright/test';
import { seedAdmin, localAdmin, getLocalStatus } from '../../scripts/member-hub/local.mjs';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

async function login(page) {
  await page.goto('/login'); await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
  await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click(); await expect(page).toHaveURL(/\/members$/);
}

test('create, format, upload, publish and restrict a member page', async ({ page, request }, info) => {
  test.setTimeout(120000);
  const { service } = await seedAdmin();
  const title = `Local Editor Test ${Date.now()}`;
  let id, uploadId;
  const hydrationErrors = [];
  page.on('console', event => { if (event.type() === 'error' && /hydrated|hydration/i.test(event.text())) hydrationErrors.push(event.text()); });
  try {
    await login(page); await page.goto('/admin/content/new');
    await page.getByRole('button', { name: 'Page Settings', exact: true }).click();
    await page.getByLabel('Content Type', { exact: true }).selectOption('page');
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByLabel('Title', { exact: true }).fill(title);
    const text = page.locator('[contenteditable="true"][aria-label="Page Body"]');
    await text.click(); await text.pressSequentially('A member-only update.');
    await text.locator('[data-slate-string]').click({ clickCount: 3 });
    await page.locator('.hub-rich-editor[data-editor-label="Page Body"]').getByRole('button', { name: 'Bold', exact: true }).click();
    await expect(text.locator('strong')).toHaveText('A member-only update.');
    await page.getByRole('button', { name: 'Page Settings', exact: true }).click();
    await page.getByLabel('Members Only', { exact: true }).check();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('button', { name: 'Image & Text', exact: true }).click();
    await page.getByRole('button', { name: 'Page Settings', exact: true }).click();
    await page.getByLabel('Upload Image or PDF').setInputFiles({ name: 'local-test.png', mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZ8AAAAASUVORK5CYII=', 'base64') });
    await expect(page.getByRole('status')).toContainText('uploaded');
    const assets = await service.from('hoa_assets').select('id').eq('original_filename', 'local-test.png').order('created_at', { ascending: false }).limit(1);
    uploadId = assets.data[0].id;
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const section = page.locator('details').filter({ hasText: '1. Image & Text' });
    if (!(await section.evaluate(element => element.open))) await section.locator('summary').click();
    await page.getByLabel('Section 1 Image', { exact: true }).selectOption(uploadId);
    const caption = page.locator('[contenteditable="true"][aria-label="Section 1 Text"]');
    await caption.click(); await caption.pressSequentially('Image caption');
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Page saved');
    await expect(page).toHaveURL(/\/admin\/content\/[0-9a-f-]{36}$/);
    id = decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1));
    expect((await request.get(`/content/${id}`)).status()).toBe(404);
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Page saved');
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    const preview = page.frameLocator('iframe[title="Page preview"]');
    await expect(preview.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(preview.getByText('A member-only update.', { exact: true })).toBeVisible();
    await expect(preview.locator('.hub-rich-copy .font-semibold').first()).toHaveText('A member-only update.');
    await expect.poll(() => preview.locator('.hub-image-section img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    await page.screenshot({ path: info.outputPath('editor-preview-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('editor-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'Page Settings', exact: true }).click();
    await page.getByLabel('Public', { exact: true }).check();
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Page saved');
    expect((await request.get(`/content/${id}`)).status()).toBe(200);
    expect((await request.get(`/api/member-hub/assets/${uploadId}`)).status()).toBe(200);
    expect(hydrationErrors).toHaveLength(0);
  } finally {
    if (!id || id === 'new') id = (await service.from('hoa_content').select('id').eq('title', title).maybeSingle()).data?.id;
    if (id) await service.from('hoa_content').delete().eq('id', id);
    if (uploadId) { const asset = await service.from('hoa_assets').select('object_path').eq('id', uploadId).single(); await service.from('hoa_assets').delete().eq('id', uploadId); if (asset.data) await service.storage.from('hoa-content').remove([asset.data.object_path]); }
  }
});

test('publishing an imported draft preserves its URL and does not restore it on reimport', async ({ page }) => {
  const { service } = await seedAdmin();
  const id = `local-publish-${randomUUID()}`;
  const document = { kind: 'event', title: 'Published Fixture', status: 'published', visibility: 'public', body: [], sections: [], settings: { startDate: '2099-11-01T15:00:00.000Z' } };
  expect((await service.from('hoa_content').insert([{ ...document, id }, { ...document, id: `drafts.${id}`, title: 'Draft Fixture', status: 'draft', source_revision: 'fixture-rev' }])).error).toBeNull();
  const parent = randomUUID(), reply = randomUUID();
  await service.from('hoa_comments').insert({ id: parent, content_id: `drafts.${id}`, display_name: 'Fixture', message: 'Parent retained' });
  await service.from('hoa_comments').insert({ id: reply, content_id: `drafts.${id}`, parent_id: parent, display_name: 'Fixture', message: 'Reply retained' });
  try {
    await login(page); await page.goto(`/admin/content/drafts.${id}`);
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/content/${id}$`));
    const saved = await service.from('hoa_content').select('title').eq('id', id).single();
    expect(saved.data.title).toBe('Draft Fixture');
    expect((await service.from('hoa_comments').select('id').eq('content_id', id)).data).toHaveLength(2);
    const retired = await service.rpc('hoa_import_content', { document: { ...document, id: `drafts.${id}`, status: 'draft', source_revision: 'fixture-rev', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), published_at: null } });
    expect(retired.error).toBeNull(); expect(retired.data).toBe(false);
  } finally { await service.from('hoa_content').delete().in('id', [id, `drafts.${id}`]); }
});

test('imported formatting survives editing and conflicting saves do not overwrite it', async ({ page }, info) => {
  test.setTimeout(120000);
  const { service } = await seedAdmin();
  const records = await service.from('hoa_content').select('*').eq('kind', 'event').eq('status', 'published');
  const source = records.data.find(row => row.sections?.some(section => section._type === 'imageWithText')) || records.data.find(row => row.sections?.length);
  expect(source).toBeTruthy();
  const id = `local-format-${randomUUID()}`;
  const copy = { ...source, id, source_revision: null, locally_edited: true };
  expect((await service.from('hoa_content').insert(copy)).error).toBeNull();
  try {
    await login(page); await page.goto(`/admin/content/${id}`);
    await page.getByLabel('Title', { exact: true }).fill('Preserved Formatting Test');
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Page saved');
    const saved = await service.from('hoa_content').select('*').eq('id', id).single();
    expect(saved.data.sections).toEqual(source.sections);
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await page.screenshot({ path: info.outputPath('imported-preview.png'), fullPage: true });
    const preview = page.frameLocator('iframe[title="Page preview"]');
    await expect(preview.getByRole('heading', { name: 'Preserved Formatting Test', exact: true })).toBeVisible();
    for (const image of await preview.locator('img').all()) await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
    const status = getLocalStatus(); const admin = createClient(status.API_URL, status.ANON_KEY);
    await admin.auth.signInWithPassword(localAdmin);
    const document = { ...saved.data, title: 'Latest Save' };
    expect((await admin.rpc('hoa_save_content', { document, expected_version: saved.data.version })).error).toBeNull();
    const conflict = await admin.rpc('hoa_save_content', { document: { ...document, title: 'Stale Save' }, expected_version: saved.data.version });
    expect(conflict.error.message).toContain('Content changed');
    await admin.auth.signOut({ scope: 'local' });
  } finally { await service.from('hoa_content').delete().eq('id', id); }
});
