const DEFAULT_SITE_URL = 'https://www.cypressdalehoa.com';

function normalizeSiteUrl(value?: string | null) {
  const raw = (value || '').trim();
  if (!raw) return '';
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '';
  }
}

export function getCanonicalSiteUrl(fallbackOrigin?: string) {
  const fromEnv =
    normalizeSiteUrl(process.env.NEWSLETTER_SITE_URL) ||
    normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

  if (fromEnv) return fromEnv;

  // For newsletters we should not leak preview URLs.
  return normalizeSiteUrl(DEFAULT_SITE_URL) || normalizeSiteUrl(fallbackOrigin) || DEFAULT_SITE_URL;
}

