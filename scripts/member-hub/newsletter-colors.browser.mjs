import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { renderNewsletter, defaultNewsletterSettings } from '../../lib/newsletter/template.ts';

function contrast(foreground, background) {
  const luminance = value => {
    const channels = value.match(/\d+/g).slice(0, 3).map(Number).map(channel => {
      const normalized = channel / 255;
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('centered and right-aligned list markers follow their text on desktop and mobile', async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: 'light' });
      for (const textAlign of ['left', 'center', 'right']) {
        const { html } = renderNewsletter([{ id: 'story', kind: 'post', title: 'Cypressdale Halloween Decorating Contest', date: '2026-10-01', updated_at: '' }],
          'https://example.com', 'https://example.com/unsubscribe', { ...defaultNewsletterSettings, textAlign });
        await page.setContent(html);
        const styles = await page.locator('li').evaluate(element => ({
          alignment: getComputedStyle(element).textAlign,
          position: getComputedStyle(element).listStylePosition,
          padding: getComputedStyle(element.parentElement).paddingLeft,
        }));
        assert.deepEqual(styles, { alignment: textAlign, position: textAlign === 'left' ? 'outside' : 'inside', padding: textAlign === 'left' ? '22px' : '0px' });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (textAlign === 'center') await page.screenshot({ path: join(tmpdir(), `cypressdale-newsletter-bullets-${width}.png`), fullPage: true });
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test('editor iframe retains saved colors even when the device uses dark mode', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ colorScheme: 'dark', viewport: { width: 390, height: 900 } });
    const settings = { ...defaultNewsletterSettings, contentColor: '#5aff9c', textColor: '#223344', headingColor: '#334455' };
    const preview = renderNewsletter([], 'https://example.com', 'https://example.com/unsubscribe', settings, { appearance: 'light' });
    await page.setContent('<iframe title="Newsletter Preview" sandbox=""></iframe>');
    await page.locator('iframe').evaluate((frame, html) => { frame.srcdoc = html; }, preview.html);
    const frame = page.frameLocator('iframe');
    await frame.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' });
    assert.equal(await frame.locator('td.nl-content').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(90, 255, 156)');
    assert.equal(await frame.locator('h1').evaluate(element => getComputedStyle(element).color), 'rgb(51, 68, 85)');
    assert.equal(await frame.locator('p.nl-text').first().evaluate(element => getComputedStyle(element).color), 'rgb(34, 51, 68)');
  } finally {
    await browser.close();
  }
});

test('newsletter light, dark, Outlook and CSS-stripped fallbacks remain readable on desktop and mobile', async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      for (const layout of ['list', 'blocks']) {
        const settings = { ...defaultNewsletterSettings, layout, introduction: 'First line\nSecond line' };
        const { html } = renderNewsletter([{ id: 'story', kind: 'post', title: 'Neighborhood news', date: '2026-10-15', updated_at: '' }],
          'https://example.com', 'https://example.com/unsubscribe', settings);
        for (const mode of ['light', 'dark', 'outlook', 'no-style']) {
          await page.emulateMedia({ colorScheme: mode === 'dark' ? 'dark' : 'light' });
          await page.setContent(html);
          if (mode === 'outlook') await page.locator('body').evaluate(body => body.setAttribute('data-ogsc', ''));
          if (mode === 'no-style') await page.locator('style').evaluate(style => style.remove());
          const result = await page.evaluate(() => {
            const content = document.querySelector('td.nl-content');
            const background = getComputedStyle(content).backgroundColor;
            const colors = [...document.querySelectorAll('.nl-text, .nl-heading, .nl-link')].map(element => ({
              text: element.textContent, color: getComputedStyle(element).color,
            }));
            return { background, colors, overflow: document.documentElement.scrollWidth > innerWidth };
          });
          assert.equal(result.background, ['dark', 'outlook'].includes(mode) ? 'rgb(32, 42, 38)' : 'rgb(255, 255, 255)');
          assert.equal(result.overflow, false, `${width}/${layout}/${mode}: horizontal overflow`);
          for (const entry of result.colors) assert.ok(contrast(entry.color, result.background) >= 4.5,
            `${width}/${layout}/${mode}: insufficient contrast for ${entry.text}`);
          await assert.doesNotReject(() => page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' }));
          if (layout === 'blocks' && ['light', 'dark'].includes(mode)) {
            await page.screenshot({ path: join(tmpdir(), `cypressdale-newsletter-${width}-${mode}.png`), fullPage: true });
          }
        }
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
