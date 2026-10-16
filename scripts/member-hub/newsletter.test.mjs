import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNewsletter,centralDate,defaultNewsletterSettings,newsletterSettingsSchema,selectNewsletterItems } from '../../lib/newsletter/template.ts';
import { newsletterTables } from '../../lib/newsletter/tables.ts';
test('production campaign tables do not collide with legacy history; local and isolated staging retain their schema', () => {
  assert.deepEqual(newsletterTables({ MEMBER_HUB_ENVIRONMENT: 'production' }), {
    runs: 'hoa_newsletter_runs', deliveries: 'hoa_newsletter_deliveries',
  });
  assert.deepEqual(newsletterTables({ MEMBER_HUB_ENVIRONMENT: 'hosted-development' }), {
    runs: 'hoa_newsletter_runs', deliveries: 'hoa_newsletter_deliveries',
  });
  for (const mode of ['local', 'staging']) assert.deepEqual(newsletterTables({ MEMBER_HUB_ENVIRONMENT: mode }), {
    runs: 'newsletter_runs', deliveries: 'newsletter_deliveries',
  });
});
test('newsletter templates escape editor text and link to existing ID-based routes',()=>{
  const result=renderNewsletter([{id:'source:id',kind:'post',title:'<img src=x onerror=alert(1)> & "News"',updated_at:'2026-01-01',date:'2026-01-01T12:00:00Z'}],
    'http://localhost:3001','http://localhost:3001/api/newsletter/unsubscribe?token=example');
  assert.ok(result.html.includes('&lt;img')); assert.ok(!result.html.includes('<img'));
  assert.ok(result.html.includes('/news/source%3Aid')); assert.ok(result.text.includes('/news/source%3Aid'));
});
test('newsletter day keys follow Central time across UTC midnight',()=>{
  assert.equal(centralDate(new Date('2026-10-17T01:00:00Z')),'2026-10-16');
});

test('news and event dates are independent in HTML and text for either layout', () => {
  const items = [
    { id: 'news', kind: 'post', title: 'Community news', date: '2026-10-01', updated_at: '' },
    { id: 'event', kind: 'event', title: 'Community event', date: '2026-10-24', updated_at: '' },
  ];
  for (const layout of ['list', 'blocks']) for (const showNewsDates of [true, false]) for (const showEventDates of [true, false]) {
    const settings = newsletterSettingsSchema.parse({ layout, showNewsDates, showEventDates });
    const rendered = renderNewsletter(items, 'https://example.com', 'https://example.com/unsubscribe', settings);
    for (const format of [rendered.html, rendered.text]) {
      assert.equal(format.includes('Oct 1, 2026'), showNewsDates);
      assert.equal(format.includes('Oct 24, 2026'), showEventDates);
    }
  }
});

test('legacy date preferences initialize both sections and explicit section values take precedence', () => {
  for (const showDates of [true, false]) {
    const migrated = newsletterSettingsSchema.parse({ showDates });
    assert.equal(migrated.showNewsDates, showDates);
    assert.equal(migrated.showEventDates, showDates);
    assert.ok(!('showDates' in migrated));
    assert.deepEqual(newsletterSettingsSchema.parse(migrated), migrated);
  }
  const mixed = newsletterSettingsSchema.parse({ showDates: false, showEventDates: true });
  assert.equal(mixed.showNewsDates, false);
  assert.equal(mixed.showEventDates, true);
  assert.equal(defaultNewsletterSettings.showNewsDates, true);
  assert.equal(defaultNewsletterSettings.showEventDates, true);
  for (const input of [{ showDates: 'false' }, { showNewsDates: null }, { showEventDates: 1 }]) {
    assert.equal(newsletterSettingsSchema.safeParse(input).success, false);
  }
});

test('editor-only light appearance does not change the theme of sent emails', () => {
  const args = [[], 'https://example.com', 'https://example.com/unsubscribe', defaultNewsletterSettings];
  const preview = renderNewsletter(...args, { appearance: 'light' });
  const email = renderNewsletter(...args);
  assert.ok(preview.html.includes('name="color-scheme" content="light only"'));
  assert.ok(!preview.html.includes('prefers-color-scheme:dark'));
  assert.ok(email.html.includes('name="color-scheme" content="light only"'));
  assert.ok(email.html.includes(':root{color-scheme:light dark;'));
  assert.ok(email.html.includes('prefers-color-scheme:dark'));
  assert.equal(preview.text, email.text);
  assert.equal(preview.subject, email.subject);
});

test('emails pair explicit fallback backgrounds with foreground colors and include dark-mode styles', () => {
  for (const layout of ['list', 'blocks']) {
    const { html } = renderNewsletter([{ id: 'story', kind: 'post', title: 'Neighborhood news', date: '2026-10-15', updated_at: '' }],
      'https://example.com', 'https://example.com/unsubscribe', { ...defaultNewsletterSettings, layout });
    assert.ok(html.includes('name="color-scheme" content="light only"'));
    assert.ok(html.includes('@media (prefers-color-scheme:dark)'));
    assert.ok(html.includes('[data-ogsc] .nl-text'));
    assert.ok(html.includes('bgcolor="#ffffff"'));
    assert.ok(html.includes('background-color:#ffffff;padding:24px'));
    assert.ok(html.includes('class="nl-text" style="margin:0 0 18px;color:#123d32"'));
    assert.ok(html.includes('class="nl-text" style="color:#123d32"> (Oct 15, 2026)</span>'));
    assert.ok(html.includes('class="nl-link" style="color:#047857;text-decoration:underline"'));
    if (layout === 'blocks') assert.ok(html.includes('background-color:#ffffff;color:#123d32;padding:16px'));
  }
});

test('customization applies safely to HTML, subject and plain-text alternatives', () => {
  const settings = newsletterSettingsSchema.parse({ subject: 'Community Bulletin', heading: '<b>Autumn News</b>', greeting: 'Hello neighbors,',
    introduction: 'First line\nSecond <script>line</script>', footer: 'Board of Directors\nContact us', preheader: 'This week in Cypressdale',
    fontFamily: 'Georgia', fontSize: 18, contentWidth: 640, textAlign: 'center', layout: 'blocks',
    backgroundColor: '#112233', contentColor: '#ffffff', headingColor: '#334455', textColor: '#223344', accentColor: '#556677', showDates: false });
  const rendered = renderNewsletter([{ id: 'story', kind: 'post', title: 'Neighborhood news', date: '2026-10-15', updated_at: '2026-10-15' }],
    'https://example.com', 'https://example.com/unsubscribe?token=private', settings);
  assert.equal(rendered.subject, settings.subject);
  for (const value of ['#112233', '#334455', '#223344', '#556677', 'Georgia,serif', 'font-size:18px', 'max-width:640px', 'text-align:center', 'This week in Cypressdale', '&lt;b&gt;Autumn News&lt;/b&gt;', 'First line<br>Second &lt;script&gt;line&lt;/script&gt;']) assert.ok(rendered.html.includes(value), value);
  assert.ok(!rendered.html.includes('<script>')); assert.ok(!rendered.html.includes('<ul'));
  assert.ok(!rendered.text.includes('Oct 15')); assert.ok(rendered.text.includes('First line\nSecond <script>line</script>'));
  assert.ok(rendered.html.includes('Unsubscribe')); assert.ok(rendered.text.includes('token=private'));
});

test('footer links customize appearance and escaped labels without changing destinations', () => {
  const settings = newsletterSettingsSchema.parse({ websiteLinkText: 'Visit <Cypressdale>', unsubscribeLinkText: 'Stop & unsubscribe',
    websiteLinkColor: '#224466', unsubscribeLinkColor: '#663344', footerLinkSize: 20, footerLinkAlign: 'right', footerLinkUnderline: false });
  const { html, text } = renderNewsletter([], 'https://example.com', 'https://example.com/unsubscribe?token=recipient&check=1', settings);
  assert.ok(html.includes('text-align:right;font-size:20px'));
  assert.ok(html.includes('color:#224466;text-decoration:none" href="https://example.com">Visit &lt;Cypressdale&gt;'));
  assert.ok(html.includes('color:#663344;text-decoration:none" href="https://example.com/unsubscribe?token=recipient&amp;check=1">Stop &amp; unsubscribe'));
  assert.ok(text.includes('Visit <Cypressdale>: https://example.com'));
  assert.ok(text.includes('Stop & unsubscribe: https://example.com/unsubscribe?token=recipient&check=1'));
  for (const change of [{ websiteLinkText: '' }, { unsubscribeLinkText: ' ' }, { footerLinkSize: 1 }, { footerLinkAlign: 'fixed' },
    { websiteLinkColor: 'red;display:none' }, { unsubscribeLinkColor: 'javascript:alert(1)' }, { unsubscribeLinkText: 'x'.repeat(101) }]) {
    assert.equal(newsletterSettingsSchema.safeParse(change).success, false);
  }
  const inherited = renderNewsletter([], 'https://example.com', 'https://example.com/unsubscribe', newsletterSettingsSchema.parse({ fontSize: 18, textAlign: 'center', accentColor: '#224466' }));
  assert.ok(inherited.html.includes('text-align:center;font-size:18px'));
  assert.ok(inherited.html.includes('color:#224466;text-decoration:underline" href="https://example.com">Cypressdale HOA'));
});

test('container rounding defaults to square, validates limits and reaches preview and email', () => {
  assert.equal(newsletterSettingsSchema.parse({}).cornerRadius, 0);
  for (const cornerRadius of [0, 16, 48]) {
    const settings = newsletterSettingsSchema.parse({ cornerRadius });
    for (const options of [{}, { appearance: 'light' }]) {
      const { html } = renderNewsletter([], 'https://example.com', 'https://example.com/unsubscribe', settings, options);
      assert.ok(html.includes(`border-collapse:separate;border-spacing:0;border-radius:${cornerRadius}px;overflow:hidden`));
      assert.ok(html.includes(`padding:24px;border-radius:${cornerRadius}px;font-family:`));
    }
  }
  for (const cornerRadius of [-1, 49, 1.5, '16px']) assert.equal(newsletterSettingsSchema.safeParse({ cornerRadius }).success, false);
});

test('background images render as absolute asset links with safe fit and fallback colors', () => {
  for (const backgroundImageTarget of ['email', 'content']) for (const backgroundImageFit of ['cover', 'contain', 'tile']) {
    const settings = newsletterSettingsSchema.parse({ backgroundImage: { _ref: 'upload-background' }, backgroundImageTarget, backgroundImageFit });
    const { html } = renderNewsletter([], 'https://example.com', 'https://example.com/unsubscribe', settings);
    assert.ok(html.includes('background="https://example.com/api/member-hub/assets/upload-background"'));
    assert.ok(html.includes("background-image:url('https://example.com/api/member-hub/assets/upload-background')"));
    assert.ok(html.includes(`background-size:${backgroundImageFit === 'tile' ? 'auto' : backgroundImageFit}`));
    assert.ok(html.includes(`background-repeat:${backgroundImageFit === 'tile' ? 'repeat' : 'no-repeat'}`));
    assert.ok(html.includes('bgcolor="#ffffff"')); assert.ok(html.includes('bgcolor="#f1f5f3"'));
  }
  assert.equal(newsletterSettingsSchema.parse({}).backgroundImage, null);
  for (const input of [{ backgroundImage: { _ref: "x');color:red" } }, { backgroundImageFit: 'bad' }, { backgroundImageTarget: 'script' }]) {
    assert.equal(newsletterSettingsSchema.safeParse(input).success, false);
  }
});

test('section inclusion, limits and ordering are identical for selection and email rendering', () => {
  const items = ['post', 'post', 'event', 'event'].map((kind, index) => ({ id: String(index), title: `Item ${index}`, kind, updated_at: '2026-10-15' }));
  const settings = { ...defaultNewsletterSettings, sectionOrder: 'events-first', maxNews: 1, maxEvents: 1 };
  assert.deepEqual(selectNewsletterItems(items, settings).map(item => item.id), ['2', '0']);
  const rendered = renderNewsletter(items, 'https://example.com', 'https://example.com/unsubscribe', settings);
  assert.ok(rendered.html.indexOf('Upcoming Events') < rendered.html.indexOf('Recent News'));
  assert.ok(!rendered.html.includes('Item 1')); assert.ok(!rendered.html.includes('Item 3'));
  assert.equal(selectNewsletterItems(items, { ...settings, showNews: false }).length, 1);
  assert.deepEqual(selectNewsletterItems(items, { ...settings, showNews: false, showEvents: false }), []);
});

test('customization rejects unsafe styling, header injection and oversized values', () => {
  for (const change of [{ subject: 'Title\r\nBcc: victim@example.com' }, { accentColor: 'red;display:none' },
    { fontFamily: 'url(https://evil.example)' }, { contentWidth: 99999 }, { fontSize: 1 }, { maxNews: 1000 }, { introduction: 'a'.repeat(6001) }]) {
    assert.equal(newsletterSettingsSchema.safeParse({ ...defaultNewsletterSettings, ...change }).success, false);
  }
  const rendered = renderNewsletter([{ id: 'day', kind: 'post', title: 'Date-only news', date: '2026-10-15', updated_at: '' }], 'https://example.com', 'https://example.com/unsubscribe');
  assert.ok(rendered.text.includes('Oct 15, 2026'));
});
