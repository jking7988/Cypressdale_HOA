export function normalizeRichTextLink(input: string): string | null {
  const value = input.trim();
  if (!value || /[\u0000-\u001f\u007f\\]/.test(value)) return null;
  if (value.startsWith('#')) return value;
  if (value.startsWith('/')) return value.startsWith('//') ? null : value;

  const website = /^(?:[a-z0-9-]+\.)+[a-z0-9-]+(?::\d+)?(?:[/?#]|$)/i.test(value);
  try {
    const url = new URL(website ? `https://${value}` : value);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.hostname && !url.username && !url.password ? url.href : null;
    }
    if ((url.protocol === 'mailto:' || url.protocol === 'tel:') && url.pathname.trim()) return url.href;
  } catch { /* Invalid addresses are reported beside the URL input. */ }
  return null;
}
