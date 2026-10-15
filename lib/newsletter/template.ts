export type NewsletterItem = { id: string; kind: 'post' | 'event'; title: string; date?: string; updated_at: string };
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
}
export function centralDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function renderNewsletter(items: NewsletterItem[], baseUrl: string, unsubscribeUrl: string) {
  const subject = 'Cypressdale News & Events Update';
  let text = 'Hello Cypressdale neighbor,\n\n';
  let html = `<h1 style="font-size:20px">${subject}</h1><p>Hello Cypressdale neighbor,</p>`;
  for (const [kind, heading] of [['post', 'Recent News'], ['event', 'Upcoming Events']] as const) {
    const group = items.filter(item => item.kind === kind);
    if (!group.length) continue;
    text += `${heading}:\n`;
    html += `<h2 style="font-size:16px">${heading}</h2><ul>`;
    for (const item of group) {
      const url = `${baseUrl}/${kind === 'post' ? 'news' : 'events'}/${encodeURIComponent(item.id)}`;
      const date = item.date && Number.isFinite(Date.parse(item.date))
        ? new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium' }).format(new Date(item.date)) : '';
      text += `- ${item.title}${date ? ` (${date})` : ''}: ${url}\n`;
      html += `<li><a style="color:#047857" href="${escapeHtml(url)}">${escapeHtml(item.title)}</a>${date ? ` (${escapeHtml(date)})` : ''}</li>`;
    }
    html += '</ul>'; text += '\n';
  }
  text += `Cypressdale HOA\n${baseUrl}\n\nUnsubscribe: ${unsubscribeUrl}\n`;
  html += `<hr><p>Cypressdale HOA</p><p><a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a></p>`;
  return { subject, text, html: `<html><body style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;overflow-wrap:anywhere;color:#123d32;max-width:600px;margin:24px auto;padding:24px">${html}</body></html>` };
}
