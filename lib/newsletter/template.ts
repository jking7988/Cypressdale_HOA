import { z } from 'zod';

export const newsletterSettingsId = 'settings-newsletter';
const color = z.string().regex(/^#[0-9a-f]{6}$/i, 'Choose a valid color.');
export const newsletterSettingsSchema = z.object({
  subject: z.string().trim().min(1, 'Enter an email subject.').max(150).regex(/^[^\r\n]*$/, 'The subject must be one line.').default('Cypressdale News & Events Update'),
  heading: z.string().trim().min(1, 'Enter a newsletter heading.').max(200).default('Cypressdale News & Events Update'),
  preheader: z.string().max(200).default(''),
  greeting: z.string().max(300).default('Hello Cypressdale neighbor,'),
  introduction: z.string().max(6000).default(''),
  footer: z.string().max(3000).default('Cypressdale HOA'),
  newsHeading: z.string().trim().min(1).max(100).default('Recent News'),
  eventsHeading: z.string().trim().min(1).max(100).default('Upcoming Events'),
  showNews: z.boolean().default(true), showEvents: z.boolean().default(true), showDates: z.boolean().default(true),
  showNewsDates: z.boolean().optional(), showEventDates: z.boolean().optional(),
  maxNews: z.number().int().min(1).max(10).default(10), maxEvents: z.number().int().min(1).max(10).default(10),
  sectionOrder: z.enum(['news-first', 'events-first']).default('news-first'),
  layout: z.enum(['list', 'blocks']).default('list'),
  textAlign: z.enum(['left', 'center', 'right']).default('left'),
  fontFamily: z.enum(['Arial', 'Georgia', 'Verdana']).default('Arial'),
  fontSize: z.number().int().min(12).max(22).default(14),
  contentWidth: z.number().int().min(480).max(720).default(600),
  cornerRadius: z.number().int().min(0).max(48).default(0),
  backgroundImage: z.object({ _ref: z.string().regex(/^[a-zA-Z0-9_.:-]{1,200}$/) }).strict().nullable().default(null),
  backgroundImageTarget: z.enum(['email', 'content']).default('email'),
  backgroundImageFit: z.enum(['cover', 'contain', 'tile']).default('cover'),
  backgroundColor: color.default('#f1f5f3'), contentColor: color.default('#ffffff'),
  textColor: color.default('#123d32'), headingColor: color.default('#123d32'), accentColor: color.default('#047857'),
  websiteLinkText: z.string().trim().min(1, 'Enter website link text.').max(100).default('Cypressdale HOA'),
  unsubscribeLinkText: z.string().trim().min(1, 'Enter unsubscribe link text.').max(100).default('Unsubscribe'),
  websiteLinkColor: color.nullable().default(null), unsubscribeLinkColor: color.nullable().default(null),
  footerLinkSize: z.number().int().min(12).max(24).nullable().default(null),
  footerLinkAlign: z.enum(['inherit', 'left', 'center', 'right']).default('inherit'),
  footerLinkUnderline: z.boolean().default(true),
}).strict().transform(({ showDates, showNewsDates, showEventDates, ...settings }) => ({
  ...settings,
  showNewsDates: showNewsDates ?? showDates,
  showEventDates: showEventDates ?? showDates,
}));
export type NewsletterSettings = z.infer<typeof newsletterSettingsSchema>;
export const defaultNewsletterSettings = newsletterSettingsSchema.parse({});
export type NewsletterItem = { id: string; kind: 'post' | 'event'; title: string; date?: string; updated_at: string };
export function selectNewsletterItems(items: NewsletterItem[], settings: NewsletterSettings) {
  const news = settings.showNews ? items.filter(item => item.kind === 'post').slice(0, settings.maxNews) : [];
  const events = settings.showEvents ? items.filter(item => item.kind === 'event').slice(0, settings.maxEvents) : [];
  return settings.sectionOrder === 'news-first' ? [...news, ...events] : [...events, ...news];
}
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
}
export function centralDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
// Clients that support dark-mode CSS need foregrounds and backgrounds changed together.
const darkModeStyles = `
:root{color-scheme:light dark;supported-color-schemes:light dark}
@media (prefers-color-scheme:dark){
  .nl-background{background-color:#121816!important}
  .nl-content{background-color:#202a26!important}
  .nl-text{color:#edf4ef!important}
  .nl-heading{color:#ffffff!important}
  .nl-link{color:#8ce4c2!important}
  .nl-border{border-color:#8ce4c2!important}
  .nl-divider{border-color:#52665b!important}
}
[data-ogsc] .nl-text{color:#edf4ef!important}
[data-ogsc] .nl-heading{color:#ffffff!important}
[data-ogsc] .nl-link{color:#8ce4c2!important}
[data-ogsc] .nl-border{border-color:#8ce4c2!important}
[data-ogsc] .nl-divider{border-color:#52665b!important}
[data-ogsc] .nl-background,[data-ogsb] .nl-background{background-color:#121816!important}
[data-ogsc] .nl-content,[data-ogsb] .nl-content{background-color:#202a26!important}
`;
export function renderNewsletter(items: NewsletterItem[], baseUrl: string, unsubscribeUrl: string, input: NewsletterSettings = defaultNewsletterSettings,
  options: { appearance?: 'light' | 'automatic' } = {}) {
  const settings = newsletterSettingsSchema.parse(input);
  // Gmail mobile honors this exact meta value to disable forced color inversion.
  // The :root styles still opt capable clients into our paired dark palette.
  const colorScheme = 'light only';
  const themeStyles = options.appearance === 'light' ? ':root{color-scheme:light;supported-color-schemes:light}' : darkModeStyles;
  const selected = selectNewsletterItems(items, settings);
  const subject = settings.subject;
  const paragraph = (value: string) => value ? `<p class="nl-text" style="margin:0 0 18px;color:${settings.textColor}">${escapeHtml(value).replace(/\r?\n/g, '<br>')}</p>` : '';
  let text = `${settings.heading}\n\n${settings.greeting}${settings.greeting ? '\n\n' : ''}${settings.introduction}${settings.introduction ? '\n\n' : ''}`;
  let html = `<h1 class="nl-heading" style="font-size:${settings.fontSize + 8}px;line-height:1.3;margin:0 0 20px;color:${settings.headingColor}">${escapeHtml(settings.heading)}</h1>${paragraph(settings.greeting)}${paragraph(settings.introduction)}`;
  const sections: ['post' | 'event', string][] = settings.sectionOrder === 'news-first'
    ? [['post', settings.newsHeading], ['event', settings.eventsHeading]] : [['event', settings.eventsHeading], ['post', settings.newsHeading]];
  for (const [kind, heading] of sections) {
    const group = selected.filter(item => item.kind === kind);
    if (!group.length) continue;
    text += `${heading}:\n`;
    html += `<h2 class="nl-heading" style="font-size:${settings.fontSize + 3}px;margin:24px 0 12px;color:${settings.headingColor}">${escapeHtml(heading)}</h2>${settings.layout === 'list' ? `<ul class="nl-text" style="margin:0;padding-left:${settings.textAlign === 'left' ? 22 : 0}px;list-style-position:${settings.textAlign === 'left' ? 'outside' : 'inside'};text-align:${settings.textAlign};color:${settings.textColor}">` : ''}`;
    for (const item of group) {
      const url = `${baseUrl}/${kind === 'post' ? 'news' : 'events'}/${encodeURIComponent(item.id)}`;
      const date = (kind === 'post' ? settings.showNewsDates : settings.showEventDates) && item.date && Number.isFinite(Date.parse(item.date))
        ? new Intl.DateTimeFormat('en-US', { timeZone: /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? 'UTC' : 'America/Chicago', dateStyle: 'medium' }).format(new Date(item.date)) : '';
      text += `- ${item.title}${date ? ` (${date})` : ''}: ${url}\n`;
      const link = `<a class="nl-link" style="color:${settings.accentColor};text-decoration:underline" href="${escapeHtml(url)}">${escapeHtml(item.title)}</a>${date ? `<span class="nl-text" style="color:${settings.textColor}"> (${escapeHtml(date)})</span>` : ''}`;
      html += settings.layout === 'list' ? `<li class="nl-text" style="margin-bottom:10px;color:${settings.textColor}">${link}</li>`
        : `<table class="nl-content nl-border" bgcolor="${settings.contentColor}" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${settings.contentColor};margin-bottom:12px;border:1px solid ${settings.accentColor};border-collapse:collapse"><tr><td class="nl-content nl-text" bgcolor="${settings.contentColor}" style="background-color:${settings.contentColor};color:${settings.textColor};padding:16px;text-align:${settings.textAlign}">${link}</td></tr></table>`;
    }
    if (settings.layout === 'list') html += '</ul>'; text += '\n';
  }
  text += `${settings.footer}\n${settings.websiteLinkText}: ${baseUrl}\n\n${settings.unsubscribeLinkText}: ${unsubscribeUrl}\n`;
  const footerLink = (label: string, url: string, linkColor: string | null, margin: string) =>
    `<p style="margin:${margin};text-align:${settings.footerLinkAlign === 'inherit' ? settings.textAlign : settings.footerLinkAlign};font-size:${settings.footerLinkSize ?? settings.fontSize}px"><a class="nl-link" style="color:${linkColor ?? settings.accentColor};text-decoration:${settings.footerLinkUnderline ? 'underline' : 'none'}" href="${escapeHtml(url)}">${escapeHtml(label)}</a></p>`;
  html += `<hr class="nl-divider" style="border:0;border-top:1px solid #d6e3de;margin:24px 0">${paragraph(settings.footer)}${footerLink(settings.websiteLinkText, baseUrl, settings.websiteLinkColor, '0')}${footerLink(settings.unsubscribeLinkText, unsubscribeUrl, settings.unsubscribeLinkColor, '12px 0 0')}`;
  const font = settings.fontFamily === 'Georgia' ? 'Georgia,serif' : `${settings.fontFamily},Arial,sans-serif`;
  const imageUrl = settings.backgroundImage ? `${baseUrl}/api/member-hub/assets/${encodeURIComponent(settings.backgroundImage._ref)}` : '';
  const imageStyle = imageUrl ? `background-image:url('${escapeHtml(imageUrl)}');background-position:center;background-size:${settings.backgroundImageFit === 'tile' ? 'auto' : settings.backgroundImageFit};background-repeat:${settings.backgroundImageFit === 'tile' ? 'repeat' : 'no-repeat'};` : '';
  const emailImage = settings.backgroundImageTarget === 'email' ? imageStyle : '';
  const contentImage = settings.backgroundImageTarget === 'content' ? imageStyle : '';
  const backgroundAttribute = imageUrl ? ` background="${escapeHtml(imageUrl)}"` : '';
  return { subject, text, html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="${colorScheme}"><meta name="supported-color-schemes" content="${colorScheme}"><title>${escapeHtml(subject)}</title><style>${themeStyles}</style></head><body class="nl-background" bgcolor="${settings.backgroundColor}" style="margin:0;padding:0;background-color:${settings.backgroundColor};color:${settings.textColor}">${settings.preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escapeHtml(settings.preheader)}</div>` : ''}<table class="nl-background" bgcolor="${settings.backgroundColor}" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${settings.backgroundColor};border-collapse:collapse"><tr><td class="nl-background"${emailImage ? backgroundAttribute : ''} bgcolor="${settings.backgroundColor}" align="center" style="background-color:${settings.backgroundColor};${emailImage}padding:24px 12px"><table class="nl-content nl-container" bgcolor="${settings.contentColor}" role="presentation" width="${settings.contentWidth}" cellpadding="0" cellspacing="0" style="width:100%;max-width:${settings.contentWidth}px;background-color:${settings.contentColor};border-collapse:separate;border-spacing:0;border-radius:${settings.cornerRadius}px;overflow:hidden"><tr><td class="nl-content nl-text"${contentImage ? backgroundAttribute : ''} bgcolor="${settings.contentColor}" style="background-color:${settings.contentColor};${contentImage}padding:24px;border-radius:${settings.cornerRadius}px;font-family:${font};font-size:${settings.fontSize}px;line-height:1.5;overflow-wrap:anywhere;word-break:break-word;text-align:${settings.textAlign};color:${settings.textColor}">${html}</td></tr></table></td></tr></table></body></html>` };
}
