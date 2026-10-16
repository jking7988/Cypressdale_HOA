import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getLocalStatus, seedAdmin, localAdmin } from '../../scripts/member-hub/local.mjs';
import { newsletterSettingsId, centralDate, renderNewsletter } from '../../lib/newsletter/template.ts';

async function signIn(page) {
  await page.goto('/admin-sign-in');
  await page.getByLabel('Email', { exact: true }).fill(localAdmin.email);
  await page.getByLabel('Password', { exact: true }).fill(localAdmin.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/content$/);
  await page.goto('/admin/newsletter');
}

test('newsletter customization persists privately, previews immediately and matches captured campaign emails', async ({ page, browser, request }, info) => {
  test.setTimeout(180000);
  const local = getLocalStatus(), { service } = await seedAdmin(local), prefix = `custom-newsletter-${randomUUID()}`;
  const before = (await service.from('hoa_content').select('*').eq('id', newsletterSettingsId).maybeSingle()).data;
  const priorRun = (await service.from('newsletter_runs').select('id').eq('run_key', `mailpit:${centralDate()}`).maybeSingle()).data;
  const email = `${prefix}@example.test`, subject = `Community Bulletin ${prefix}`;
  const ids = [`${prefix}-news`, `${prefix}-event`, `${prefix}-private`];
  let ownedVersion, runId;
  const other = await browser.newPage();
  try {
    expect((await service.from('hoa_content').insert([
      { id: ids[0], kind: 'post', title: 'Cypressdale autumn news', status: 'published', visibility: 'public', settings: { newsDate: '2099-12-31' } },
      { id: ids[1], kind: 'event', title: 'Cypressdale neighborhood gathering', status: 'published', visibility: 'public', settings: { startDate: new Date(Date.now() + 3600000).toISOString() } },
      { id: ids[2], kind: 'post', title: 'Private newsletter fixture', status: 'published', visibility: 'members', settings: { newsDate: '2100-01-01' } },
    ])).error).toBeNull();
    expect((await service.from('newsletter_subscribers').insert({ email, active: true, verified: true })).error).toBeNull();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await signIn(page); await signIn(other);
    const initial = await (await page.request.get('/api/newsletter/preview')).json();
    const preview = page.frameLocator('iframe[title="Newsletter Preview"]');
    await page.getByLabel('Email Subject', { exact: true }).fill(subject);
    await page.getByLabel('Newsletter Heading', { exact: true }).fill('Cypressdale Community Bulletin');
    await page.getByLabel('Inbox Preview Text', { exact: true }).fill('This week around the neighborhood');
    await page.getByLabel('Greeting', { exact: true }).fill('Hello Cypressdale neighbors,');
    await page.getByLabel('Introduction', { exact: true }).fill('First introduction line.\nSecond introduction line.');
    await page.getByRole('textbox', { name: 'Footer Text', exact: true }).fill('Your HOA Board\nCypressdale community');
    await page.getByLabel('Website Link Text', { exact: true }).fill('Visit our community');
    await page.getByLabel('Unsubscribe Link Text', { exact: true }).fill('Unsubscribe from updates');
    await page.getByRole('combobox', { name: 'Footer Link Size', exact: true }).selectOption('20');
    await page.getByRole('combobox', { name: 'Footer Link Alignment', exact: true }).selectOption('right');
    await page.getByLabel('Underline Footer Links', { exact: true }).uncheck();
    await page.getByRole('checkbox', { name: 'Website Link Color', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Unsubscribe Link Color', exact: true }).check();
    await page.locator('input[type="color"][aria-label="Website Link Color"]').fill('#224466');
    await page.locator('input[type="color"][aria-label="Unsubscribe Link Color"]').fill('#663344');
    await page.getByLabel('News Items', { exact: true }).fill('1');
    await page.getByLabel('Event Items', { exact: true }).fill('1');
    await page.getByRole('combobox', { name: 'Section Order', exact: true }).selectOption('events-first');
    await page.getByRole('combobox', { name: 'Layout', exact: true }).selectOption('blocks');
    await page.getByRole('combobox', { name: 'Font', exact: true }).selectOption('Georgia');
    await page.getByLabel('Text Size', { exact: true }).fill('18');
    await page.getByLabel('Email Width', { exact: true }).fill('640');
    await page.getByLabel('Container Corner Radius (px)', { exact: true }).fill('24');
    await page.getByRole('combobox', { name: 'Text Alignment', exact: true }).selectOption('center');
    await page.getByLabel('Show News Dates', { exact: true }).uncheck();
    await page.getByLabel('Show Event Dates', { exact: true }).check();
    await page.getByLabel('Link / Accent Color', { exact: true }).evaluate(input => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '#a32645');
      input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(preview.getByRole('heading', { name: 'Cypressdale Community Bulletin', exact: true })).toBeVisible();
    await expect(preview.locator('.nl-container')).toHaveCSS('border-radius', '24px');
    const websiteLink = preview.getByRole('link', { name: 'Visit our community', exact: true });
    await expect(websiteLink).toHaveCSS('color', 'rgb(34, 68, 102)');
    await expect(websiteLink).toHaveCSS('font-size', '20px');
    await expect(websiteLink).toHaveCSS('text-decoration-line', 'none');
    await expect(websiteLink.locator('..')).toHaveCSS('text-align', 'right');
    await expect(websiteLink).toHaveAttribute('href', initial.origin);
    await expect(preview.getByRole('link', { name: 'Unsubscribe from updates', exact: true })).toHaveCSS('color', 'rgb(102, 51, 68)');
    await expect(preview.getByRole('link', { name: 'Cypressdale autumn news', exact: true })).toHaveCSS('color', 'rgb(163, 38, 69)');
    await expect(preview.getByText('Private newsletter fixture', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Send to Mailpit', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Save Customization', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Newsletter customization saved.');
    const stored = (await service.from('hoa_content').select('*').eq('id', newsletterSettingsId).single()).data;
    ownedVersion = stored.version;
    expect(stored.status).toBe('draft'); expect(stored.visibility).toBe('members'); expect(stored.settings.newsletterSettings.subject).toBe(subject);
    await other.getByLabel('Email Subject', { exact: true }).fill('Stale admin edit');
    await other.getByRole('button', { name: 'Save Customization', exact: true }).click();
    await expect(other.getByRole('alert').filter({ hasText: 'Content changed' })).toBeVisible();
    expect((await service.from('hoa_content').select('version').eq('id', newsletterSettingsId).single()).data.version).toBe(ownedVersion);
    const anonymous = createClient(local.API_URL, local.ANON_KEY, { auth: { persistSession: false } });
    expect((await anonymous.from('hoa_content').select('id').eq('id', newsletterSettingsId)).data).toEqual([]);
    expect((await request.get(`/content/${newsletterSettingsId}`)).status()).toBe(404);
    await page.reload();
    await expect(page.getByLabel('Email Subject', { exact: true })).toHaveValue(subject);
    await expect(page.getByLabel('Container Corner Radius (px)', { exact: true })).toHaveValue('24');
    await expect(preview.locator('.nl-container')).toHaveCSS('border-radius', '24px');
    await expect(page.getByLabel('Website Link Text', { exact: true })).toHaveValue('Visit our community');
    await expect(page.getByLabel('Unsubscribe Link Text', { exact: true })).toHaveValue('Unsubscribe from updates');
    await expect(websiteLink).toHaveCSS('color', 'rgb(34, 68, 102)');
    await expect(page.getByRole('combobox', { name: 'Font', exact: true })).toHaveValue('Georgia');
    await expect(page.getByRole('combobox', { name: 'Text Alignment', exact: true })).toHaveValue('center');
    await expect(page.getByLabel('Show News Dates', { exact: true })).not.toBeChecked();
    await expect(page.getByLabel('Show Event Dates', { exact: true })).toBeChecked();
    await expect(preview.getByRole('link', { name: 'Cypressdale autumn news', exact: true }).locator('..')).not.toContainText('Dec 31, 2099');
    await page.screenshot({ path: info.outputPath('newsletter-customization-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('region', { name: 'Newsletter email preview', exact: true }).scrollIntoViewIfNeeded();
    await expect(preview.getByRole('heading', { name: 'Cypressdale Community Bulletin', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await preview.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('newsletter-customization-mobile.png'), fullPage: true });
    const current = await (await page.request.get('/api/newsletter/preview')).json();
    expect(current.settings).toEqual(stored.settings.newsletterSettings);
    const staleSend = await page.request.post('/api/newsletter/send', { data: { settingsVersion: initial.settingsVersion } });
    expect(staleSend.status()).toBe(409);
    if (!priorRun) {
      const sent = await page.request.post('/api/newsletter/send', { data: { settingsVersion: current.settingsVersion } });
      expect(sent.status()).toBe(200); const result = await sent.json(); runId = result.runId;
      expect(runId).toBeTruthy();
      for (let index = 0; index < 5 && (await service.from('newsletter_deliveries').select('id', { count: 'exact', head: true }).eq('run_id', runId).in('status', ['pending', 'sending', 'failed'])).count; index++) {
        expect((await page.request.post('/api/newsletter/send', { data: { settingsVersion: current.settingsVersion } })).status()).toBe(200);
      }
      let messageId;
      await expect.poll(async () => {
        const messages = await (await request.get('http://127.0.0.1:55424/api/v1/messages')).json();
        messageId = messages.messages.find(message => message.Subject === subject && message.To.some(to => to.Address === email))?.ID;
        return !!messageId;
      }).toBe(true);
      const message = await (await request.get(`http://127.0.0.1:55424/api/v1/message/${messageId}`)).json();
      const subscriber = (await service.from('newsletter_subscribers').select('unsubscribe_token').eq('email', email).single()).data;
      const expected = renderNewsletter(current.items, current.origin, `${current.origin}/api/newsletter/unsubscribe?token=${subscriber.unsubscribe_token}`, current.settings);
      expect(message.HTML.replace(/\r\n/g, '\n')).toBe(expected.html.replace(/\r\n/g, '\n'));
      expect(message.HTML).toContain('font-family:Georgia'); expect(message.HTML).toContain('First introduction line.<br>Second introduction line.');
      const run = (await service.from('newsletter_runs').select('payload').eq('id', runId).single()).data;
      expect(run.payload.settings).toEqual(current.settings);
      expect((await (await page.request.post('/api/newsletter/send')).json()).reason).toBe('already-sent-today');
    }
    await page.goto('/admin/content');
    await expect(page.getByRole('link', { name: 'Newsletter customization', exact: true })).toHaveCount(0);
    await page.goto(`/admin/content/${newsletterSettingsId}`); await expect(page).toHaveURL(/\/admin\/newsletter$/);
  } finally {
    await other.close();
    if (runId && !priorRun) await service.from('newsletter_runs').delete().eq('id', runId);
    await service.from('newsletter_subscribers').delete().eq('email', email);
    await service.from('hoa_content').delete().in('id', ids);
    if (ownedVersion) {
      if (before) await service.from('hoa_content').update({ settings: before.settings }).eq('id', newsletterSettingsId).eq('version', ownedVersion);
      else await service.from('hoa_content').delete().eq('id', newsletterSettingsId).eq('version', ownedVersion);
    }
  }
});
