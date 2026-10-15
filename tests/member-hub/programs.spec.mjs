import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZ8AAAAASUVORK5CYII=', 'base64');

for (const [program, label, kind, route] of [['yard', 'Yard of the Month', 'yardWinner', 'yard-of-the-month'], ['holiday', 'Holiday Decorating', 'holidayWinner', 'holiday-decorating']]) {
  test(`${label} has separate winner management, main-page settings, and a matching live preview`, async ({ page, context }, info) => {
    test.setTimeout(120000);
    const { service } = await seedAdmin();
    const prefix = `Program Fixture ${randomUUID()}`;
    const title = `${prefix} Winner`, heading = `${prefix} Heading`;
    const configId = `program-${route}`;
    const before = (await service.from('hoa_content').select('*').eq('id', configId).single()).data;
    const originals = (await service.from('hoa_content').select('id,title,settings,status,visibility').eq('kind', kind).order('id')).data;
    let winnerId, olderId, pastId, ownedVersion;
    const assetIds = [];
    const publicPage = await context.newPage();
    try {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/admin-sign-in');
      await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
      await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
      await page.getByRole('button', { name: 'Sign In', exact: true }).click();
      await expect(page).toHaveURL(/\/admin\/content$/);
      await page.getByRole('navigation', { name: 'Administration' }).getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/admin/${route}$`));
      const preview = page.frameLocator('iframe[title="Page preview"]');
      await expect(preview.locator('h1')).toHaveCount(1);
      if (program === 'holiday') {
        for (const winner of originals.filter(row => row.status === 'published' && row.visibility === 'public' && row.settings.holiday !== 'halloween')) await expect(page.getByRole('button', { name: `Edit ${winner.title}`, exact: true })).toHaveCount(1);
        await expect(preview.getByText('Add a Holiday Winner entry in Sanity', { exact: false })).toHaveCount(0);
        await publicPage.goto(`/${route}`);
        const entries = publicPage.getByRole('tabpanel').locator('article');
        const count = await entries.count();
        if (count) {
          await publicPage.setViewportSize({ width: 1440, height: 1000 });
          await expect(entries.first().getByRole('heading')).toBeVisible();
          if (count >= 3) {
            const first = await entries.nth(0).boundingBox(), second = await entries.nth(1).boundingBox(), third = await entries.nth(2).boundingBox();
            expect(first.width).toBeGreaterThan(second.width * 1.9);
            expect(Math.abs(second.y - third.y)).toBeLessThan(2);
          }
          const photoEntry = entries.filter({ has: publicPage.locator('button[aria-label^="View photos of"]') }).first();
          const photoButton = photoEntry.getByRole('button', { name: /^View photos of/ });
          await expect(photoButton.getByRole('img')).toHaveCSS('object-fit', 'contain');
          await photoButton.click();
          const gallery = publicPage.getByRole('dialog', { name: /^Photos of/ });
          await expect(gallery).toBeVisible();
          const next = gallery.getByRole('button', { name: 'Next photo', exact: true });
          if (await next.count()) {
            await next.click();
            await expect(gallery.getByRole('img')).toHaveAttribute('alt', /photo 2$/);
          }
          await gallery.getByRole('button', { name: 'Close lightbox', exact: true }).click();
          await expect(gallery).toHaveCount(0);
          await publicPage.screenshot({ path: info.outputPath('holiday-roomy-desktop.png'), fullPage: true });
          await publicPage.setViewportSize({ width: 390, height: 844 });
          expect(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          await publicPage.screenshot({ path: info.outputPath('holiday-roomy-mobile.png'), fullPage: true });
          await entries.first().scrollIntoViewIfNeeded();
          await publicPage.screenshot({ path: info.outputPath('holiday-winners-mobile-viewport.png') });
          if (await publicPage.locator('figure').count()) {
            await publicPage.locator('figure').first().scrollIntoViewIfNeeded();
            await publicPage.screenshot({ path: info.outputPath('holiday-maps-mobile-viewport.png') });
          }
          const previewPhoto = preview.getByRole('button', { name: /^View photos of/ }).first();
          await previewPhoto.click();
          await expect(preview.getByRole('dialog', { name: /^Photos of/ })).toBeVisible();
          await preview.getByRole('button', { name: 'Close lightbox', exact: true }).click();
        }
      }
      await page.getByRole('button', { name: 'New Winner', exact: true }).click();
      await page.getByLabel('Winner Title', { exact: true }).fill(`${prefix} Older Winner`);
      if (program === 'yard') await page.getByLabel('Month', { exact: true }).fill('2098-10');
      else {
        await page.getByLabel('Year', { exact: true }).fill('2098');
        await expect(page.getByLabel('Holiday', { exact: true })).toHaveValue('Christmas');
        await page.getByLabel('Placement', { exact: true }).selectOption('1');
      }
      await page.getByLabel('Published', { exact: true }).check();
      await page.getByRole('button', { name: 'Save Winner', exact: true }).click();
      await expect(page.locator('main').getByRole('status')).toHaveText('Winner saved.');
      olderId = (await service.from('hoa_content').select('id').eq('title', `${prefix} Older Winner`).single()).data.id;
      await page.getByRole('button', { name: 'New Winner', exact: true }).click();
      await page.getByLabel('Winner Title', { exact: true }).fill(title);
      if (program === 'yard') await page.getByLabel('Month', { exact: true }).fill('2099-10');
      else {
        await page.getByLabel('Year', { exact: true }).fill('2099');
        await expect(page.getByLabel('Holiday', { exact: true })).toHaveValue('Christmas');
        await page.getByLabel('Placement', { exact: true }).selectOption('3');
        await page.getByLabel('Judging Section', { exact: true }).selectOption('2');
      }
      await page.getByLabel('Street / Block', { exact: true }).fill('Test Block');
      const existingImage = (await service.from('hoa_assets').select('id').eq('library', 'files').like('id', 'image-%').like('mime_type', 'image/%').order('id').limit(1).single()).data;
      expect(existingImage).toBeTruthy();
      await page.getByLabel('Add Existing Photo', { exact: true }).selectOption(existingImage.id);
      await page.getByLabel('Upload Winner Photos', { exact: true }).setInputFiles([
        { name: `${prefix}-1.png`, mimeType: 'image/png', buffer: png },
        { name: `${prefix}-2.png`, mimeType: 'image/png', buffer: png },
      ]);
      await expect(page.locator('main').getByRole('status')).toHaveText('Photos uploaded.');
      const uploaded = (await service.from('hoa_assets').select('id,library').in('original_filename', [`${prefix}-1.png`, `${prefix}-2.png`])).data;
      expect(uploaded).toHaveLength(2); expect(uploaded.every(row => row.library === 'files')).toBe(true);
      uploaded.forEach(row => assetIds.push(row.id));
      await expect(page.locator('.hub-program-photo-list img')).toHaveCount(3);
      await page.getByLabel('Published', { exact: true }).check();
      await page.getByRole('button', { name: 'Save Winner', exact: true }).click();
      await expect(page.locator('main').getByRole('status')).toHaveText('Winner saved.');
      const saved = (await service.from('hoa_content').select('*').eq('title', title).single()).data;
      winnerId = saved.id; expect(saved.settings.photos).toHaveLength(3);
      if (program === 'yard') {
        await page.getByRole('button', { name: 'New Winner', exact: true }).click();
        await page.getByLabel('Winner Title', { exact: true }).fill(`${prefix} Past Winner`);
        await page.getByLabel('Month', { exact: true }).fill('2099-09');
        await page.getByLabel('Add Existing Photo', { exact: true }).selectOption(existingImage.id);
        await page.getByLabel('Published', { exact: true }).check();
        await page.getByRole('button', { name: 'Save Winner', exact: true }).click();
        await expect(page.locator('main').getByRole('status')).toHaveText('Winner saved.');
        pastId = (await service.from('hoa_content').select('id').eq('title', `${prefix} Past Winner`).single()).data.id;
      }
      await publicPage.goto(`/${route}`);
      await expect(publicPage.getByRole('heading', { name: title, exact: true })).toBeVisible();
      if (program === 'yard') {
        for (const width of [1440, 390]) {
          await publicPage.setViewportSize({ width, height: 900 });
          for (const winnerTitle of [title, `${prefix} Past Winner`]) {
            for (const surface of [publicPage, preview]) {
              const photo = surface.getByRole('img', { name: winnerTitle, exact: true });
              await expect(photo).toHaveCSS('object-fit', 'contain');
              await expect.poll(() => photo.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
              await expect(photo.locator('..')).toHaveCSS('aspect-ratio', '4 / 3');
            }
          }
          await publicPage.screenshot({ path: info.outputPath(`yard-full-photos-${width}.png`), fullPage: true });
        }
      }
      if (program === 'yard') await expect(publicPage.getByText('October 2099', { exact: true })).toBeVisible();
      else {
        await expect(publicPage.getByText('3rd Place', { exact: true })).toBeVisible();
        await expect(publicPage.getByText('Section 2 winner', { exact: true })).toBeVisible();
        await expect(publicPage.getByText(`$${before.settings.programSettings?.prizes?.[2] ?? 25} prize`, { exact: true })).toBeVisible();
      }
      const older = { title: `${prefix} Older Winner` };
      const olderYear = '2098';
      const yearTabs = publicPage.getByRole('tablist', { name: 'Winner years', exact: true });
      await expect(yearTabs.getByRole('tab', { name: '2099', exact: true })).toHaveAttribute('aria-selected', 'true');
      await yearTabs.getByRole('tab', { name: olderYear, exact: true }).click();
      await expect(publicPage.getByRole('tabpanel').getByRole('heading', { name: older.title, exact: true })).toBeVisible();
      await expect(publicPage.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
      await yearTabs.getByRole('tab', { name: olderYear, exact: true }).press('Home');
      await expect(publicPage.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await preview.getByRole('tab', { name: olderYear, exact: true }).click();
      await expect(preview.getByRole('tabpanel').getByRole('heading', { name: older.title, exact: true })).toBeVisible();
      await expect(preview.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
      await page.screenshot({ path: info.outputPath(`${program}-year-tabs-desktop.png`), fullPage: true });
      await publicPage.setViewportSize({ width: 390, height: 844 });
      await yearTabs.getByRole('tab', { name: olderYear, exact: true }).click();
      await expect(publicPage.getByRole('tabpanel').getByRole('heading', { name: older.title, exact: true })).toBeVisible();
      expect(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await publicPage.screenshot({ path: info.outputPath(`${program}-year-tabs-mobile.png`), fullPage: true });
      await yearTabs.getByRole('tab', { name: '2099', exact: true }).click();
      await preview.getByRole('tab', { name: '2099', exact: true }).click();
      await page.getByRole('button', { name: 'Page Settings', exact: true }).click();
      await page.getByLabel('Page Title', { exact: true }).fill(heading);
      await expect(preview.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await page.getByLabel('Introduction', { exact: true }).fill('A custom program introduction.');
      await expect(preview.getByText('A custom program introduction.', { exact: true })).toBeVisible();
      await page.getByLabel('Page Width', { exact: true }).selectOption('wide');
      await page.locator('details').filter({ has: page.locator('summary').getByText('Contact Section', { exact: true }) }).locator('summary').click();
      await page.getByLabel('Show Contact', { exact: true }).uncheck();
      await page.getByRole('button', { name: 'Save Page Settings', exact: true }).click();
      await expect(page.locator('main').getByRole('status')).toHaveText('Page settings saved.');
      const changed = (await service.from('hoa_content').select('*').eq('id', configId).single()).data;
      ownedVersion = changed.version;
      expect(changed.settings.programSettings.pageTitle).toBe(heading);
      expect(changed.settings.programSettings.showContact).toBe(false);
      await publicPage.reload();
      await expect(publicPage.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(publicPage.getByRole('heading', { name: title, exact: true })).toBeVisible();
      const controls = await page.getByRole('region', { name: 'Program page settings' }).boundingBox();
      const viewing = await page.getByRole('region', { name: 'Program preview' }).boundingBox();
      expect(controls.x + controls.width).toBeLessThanOrEqual(viewing.x);
      await page.screenshot({ path: info.outputPath(`${program}-settings-desktop.png`), fullPage: true });
      await page.reload();
      await page.getByRole('button', { name: 'Page Settings', exact: true }).click();
      await expect(page.getByLabel('Page Title', { exact: true })).toHaveValue(heading);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(preview.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await preview.getByRole('heading', { name: heading, exact: true }).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await preview.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`${program}-settings-mobile.png`), fullPage: true });
      await page.goto(`/admin/content/${winnerId}`);
      await expect(page).toHaveURL(new RegExp(`/admin/${route}\\?winner=${winnerId}$`));
      await expect(page.getByLabel('Winner Title', { exact: true })).toHaveValue(title);
      await page.getByRole('button', { name: 'Winners', exact: true }).click();
      await expect(page.getByLabel('Winner Title', { exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: `Edit ${title}`, exact: true })).toBeVisible();
      await page.getByRole('button', { name: `Edit ${title}`, exact: true }).click();
      await page.getByLabel('Winner Title', { exact: true }).fill(`${title} Unsaved`);
      page.once('dialog', dialog => dialog.dismiss());
      await page.getByRole('button', { name: 'Winners', exact: true }).click();
      await expect(page.getByLabel('Winner Title', { exact: true })).toHaveValue(`${title} Unsaved`);
      page.once('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: 'Winners', exact: true }).click();
      await expect(page.getByLabel('Winner Title', { exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: `Edit ${title}`, exact: true }).click();
      await expect(page.getByLabel('Winner Title', { exact: true })).toHaveValue(title);
      await page.getByRole('button', { name: 'Page Settings', exact: true }).click();
      await page.getByRole('button', { name: 'Winners', exact: true }).click();
      await expect(page.getByLabel('Winner Title', { exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: `Remove ${title}`, exact: true }).click();
      await page.getByRole('dialog', { name: 'Remove winner', exact: true }).getByRole('button', { name: 'Remove', exact: true }).click();
      await expect(page.locator('main').getByRole('status')).toHaveText('Winner removed.');
      if (originals.length) expect((await service.from('hoa_content').select('id,title,settings,status,visibility').in('id', originals.map(row => row.id)).order('id')).data).toEqual(originals);
    } finally {
      await publicPage.close();
      if (!winnerId) winnerId = (await service.from('hoa_content').select('id').eq('title', title).maybeSingle()).data?.id;
      if (winnerId) await service.from('hoa_content').delete().eq('id', winnerId);
      if (!olderId) olderId = (await service.from('hoa_content').select('id').eq('title', `${prefix} Older Winner`).maybeSingle()).data?.id;
      if (olderId) await service.from('hoa_content').delete().eq('id', olderId);
      if (!pastId) pastId = (await service.from('hoa_content').select('id').eq('title', `${prefix} Past Winner`).maybeSingle()).data?.id;
      if (pastId) await service.from('hoa_content').delete().eq('id', pastId);
      if (ownedVersion) await service.from('hoa_content').update({ settings: before.settings, locally_edited: before.locally_edited }).eq('id', configId).eq('version', ownedVersion);
      for (const id of assetIds) {
        const asset = (await service.from('hoa_assets').select('object_path').eq('id', id).maybeSingle()).data;
        if (asset) { await service.from('hoa_assets').delete().eq('id', id); await service.storage.from('hoa-content').remove([asset.object_path]); }
      }
    }
  });
}
