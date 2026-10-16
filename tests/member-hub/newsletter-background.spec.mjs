import { test, expect } from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import { seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';
import { newsletterSettingsId } from '../../lib/newsletter/template.ts';

test('newsletter backgrounds upload to Files, persist, render, and expose only approved non-private images', async ({ page, browser, request }, info) => {
  test.setTimeout(180000);
  const { service } = await seedAdmin(), prefix = `newsletter-bg-${randomUUID()}`;
  const before = (await service.from('hoa_content').select('*').eq('id', newsletterSettingsId).maybeSingle()).data;
  const beforeRefs = (await service.from('hoa_content_assets').select('*').eq('content_id', newsletterSettingsId)).data ?? [];
  const assetIds = [], paths = [];
  const memberId = `${prefix}-member`, runId = randomUUID();
  let ownedVersion;
  const fixture = await browser.newPage({ viewport: { width: 64, height: 64 } });
  await fixture.setContent('<body style="margin:0;background:#b9dec9"><div style="width:32px;height:32px;background:#80b9cc"></div></body>');
  const image = await fixture.screenshot(); await fixture.close();
  try {
    const candidates = [];
    for (const [name, mime, library] of [['unused.png', 'image/png', 'files'], ['private.png', 'image/png', 'files'], ['document.png', 'image/png', 'documents']]) {
      const id = `upload-${randomUUID()}`, path = `tests/${prefix}/${name}`; assetIds.push(id); paths.push(path);
      expect((await service.storage.from('hoa-content').upload(path, image, { contentType: mime })).error).toBeNull();
      expect((await service.from('hoa_assets').insert({ id, object_path: path, original_filename: name, mime_type: mime, library,
        size_bytes: image.length, sha256: createHash('sha256').update(image).digest('hex') })).error).toBeNull();
      candidates.push(id);
    }
    expect((await service.from('hoa_content').insert({ id: memberId, kind: 'page', title: prefix, status: 'draft', visibility: 'members' })).error).toBeNull();
    expect((await service.from('hoa_content_assets').insert({ content_id: memberId, asset_id: candidates[1] })).error).toBeNull();
    await page.goto('/admin-sign-in');
    await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
    await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/content$/);
    await page.goto('/admin/newsletter');
    const picker = page.getByRole('combobox', { name: 'Background Image', exact: true });
    expect(await picker.locator(`option[value="${candidates[2]}"]`).count()).toBe(0);
    await page.getByLabel('Upload Background Image', { exact: true }).setInputFiles({ name: `${prefix}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
    await expect(page.getByRole('alert').filter({ hasText: 'PDFs cannot be used' })).toBeVisible();
    await page.getByLabel('Upload Background Image', { exact: true }).setInputFiles({ name: `${prefix}.png`, mimeType: 'image/png', buffer: image });
    await expect(page.getByRole('status')).toContainText('Background uploaded to Files.');
    const selected = await picker.inputValue(); assetIds.push(selected);
    const uploaded = (await service.from('hoa_assets').select('*').eq('id', selected).single()).data;
    paths.push(uploaded.object_path); expect(uploaded.library).toBe('files');
    expect((await request.get(`/api/member-hub/assets/${selected}`)).status()).toBe(404);
    await page.getByRole('combobox', { name: 'Background Placement', exact: true }).selectOption('content');
    await page.getByRole('combobox', { name: 'Background Fit', exact: true }).selectOption('tile');
    const preview = page.frameLocator('iframe[title="Newsletter Preview"]');
    await expect(preview.locator('td.nl-content')).toHaveCSS('background-repeat', 'repeat');
    await expect(preview.locator('td.nl-content')).toHaveCSS('background-image', new RegExp(selected));
    await page.getByRole('button', { name: 'Save Customization', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Newsletter customization saved.');
    ownedVersion = (await service.from('hoa_content').select('version').eq('id', newsletterSettingsId).single()).data.version;
    const publicImage = await request.get(`/api/member-hub/assets/${selected}`);
    expect(publicImage.status()).toBe(200); expect(publicImage.headers()['content-type']).toBe('image/png');
    expect(await publicImage.body()).toEqual(image);
    expect((await request.get(`/api/member-hub/assets/${candidates[0]}`)).status()).toBe(404);
    await page.reload();
    await expect(picker).toHaveValue(selected);
    await expect(page.getByRole('combobox', { name: 'Background Fit', exact: true })).toHaveValue('tile');
    await page.getByRole('region', { name: 'Newsletter email preview' }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath('background-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(preview.locator('td.nl-content')).toHaveCSS('background-image', new RegExp(selected));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('background-mobile.png'), fullPage: true });
    await picker.selectOption(candidates[1]);
    await page.getByRole('button', { name: 'Save Customization', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'not used by member-only content' })).toBeVisible();
    // Previously sent campaign images remain available after the current background is removed.
    expect((await service.from('newsletter_runs').insert({ id: runId, run_key: prefix, transport: 'mailpit',
      payload: { settings: { backgroundImage: { _ref: selected } } }, sent_at: new Date().toISOString() })).error).toBeNull();
    await picker.selectOption('');
    await page.getByRole('button', { name: 'Save Customization', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Newsletter customization saved.');
    ownedVersion = (await service.from('hoa_content').select('version').eq('id', newsletterSettingsId).single()).data.version;
    expect((await request.get(`/api/member-hub/assets/${selected}`)).status()).toBe(200);
    expect((await request.get(`/api/member-hub/assets/${candidates[1]}`)).status()).toBe(404);
    expect((await request.get(`/api/member-hub/assets/${candidates[2]}`)).status()).toBe(404);
    await service.from('newsletter_runs').delete().eq('id', runId);
    expect((await request.get(`/api/member-hub/assets/${selected}`)).status()).toBe(404);
  } finally {
    await service.from('newsletter_runs').delete().eq('id', runId);
    await service.from('hoa_content').delete().eq('id', memberId);
    if (ownedVersion) {
      const current = (await service.from('hoa_content').select('version').eq('id', newsletterSettingsId).maybeSingle()).data;
      if (current?.version === ownedVersion) {
        if (before) {
          await service.from('hoa_content').update({ settings: before.settings }).eq('id', newsletterSettingsId).eq('version', ownedVersion);
          await service.from('hoa_content_assets').delete().eq('content_id', newsletterSettingsId).in('asset_id', assetIds);
          if (beforeRefs.length) await service.from('hoa_content_assets').upsert(beforeRefs);
        } else await service.from('hoa_content').delete().eq('id', newsletterSettingsId).eq('version', ownedVersion);
      }
    }
    await service.from('hoa_assets').delete().in('id', assetIds);
    await service.storage.from('hoa-content').remove(paths);
  }
});
