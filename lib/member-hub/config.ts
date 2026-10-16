export class HubAccessError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function normalizedUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.hostname.endsWith('.')) return null;
    return url;
  } catch {
    return null;
  }
}

function isPublishableKey(key: string | undefined) {
  if (!key) return false;
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  try {
    const parts = key.split('.');
    return parts.length === 3 && JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')).role === 'anon';
  } catch {
    return false;
  }
}

export function hubConfig(environment: NodeJS.ProcessEnv = process.env) {
  if (environment.MEMBER_HUB_ENABLED !== 'true') {
    throw new HubAccessError(503, 'Member hub is not available yet.');
  }
  const mode = environment.MEMBER_HUB_ENVIRONMENT;
  const shared = mode === 'production' || mode === 'hosted-development';
  const url = normalizedUrl(environment.MEMBER_HUB_SUPABASE_URL || (shared ? environment.NEXT_PUBLIC_SUPABASE_URL : undefined));
  const publishableKey = environment.MEMBER_HUB_SUPABASE_PUBLISHABLE_KEY || (shared
    ? environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || environment.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined);
  const productionUrl = normalizedUrl(environment.MEMBER_HUB_PRODUCTION_SUPABASE_URL || environment.NEXT_PUBLIC_SUPABASE_URL);
  const existingUrl = normalizedUrl(environment.NEXT_PUBLIC_SUPABASE_URL);
  const excludedHosts = [productionUrl, existingUrl].filter((value) => value !== null)
    .map((value) => value.hostname.replace(/\.$/, ''));
  const localHost = url && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const production = mode === 'production' && environment.MEMBER_HUB_PRODUCTION_READY === 'true'
    && url && productionUrl && url.protocol === 'https:' && url.origin === productionUrl.origin
    && url.hostname.endsWith('.supabase.co') && !url.port
    && (!existingUrl || existingUrl.origin === url.origin)
    && (!environment.VERCEL_ENV || environment.VERCEL_ENV === 'production');
  if (production) siteOrigin(environment);
  const hostedDevelopment = mode === 'hosted-development' && environment.MEMBER_HUB_SHARED_DATABASE === 'true'
    && environment.NODE_ENV === 'development' && !environment.VERCEL && !environment.VERCEL_ENV
    && url && existingUrl && url.origin === existingUrl.origin && url.protocol === 'https:'
    && url.hostname.endsWith('.supabase.co') && !url.port
    && (!productionUrl || productionUrl.origin === url.origin);
  if (hostedDevelopment) siteOrigin(environment);
  const isolated = url && (mode === 'local'
    ? localHost && ['http:', 'https:'].includes(url.protocol)
    : mode === 'staging' && productionUrl && url.protocol === 'https:'
      && !excludedHosts.includes(url.hostname.replace(/\.$/, '')));
  if ((!isolated && !production && !hostedDevelopment) || !url || !publishableKey || !isPublishableKey(publishableKey)) {
    throw new HubAccessError(503, 'Member hub environment configuration is not approved.');
  }
  return { url: url.origin, publishableKey, secureCookies: mode !== 'local' && mode !== 'hosted-development' };
}

function siteOrigin(environment: NodeJS.ProcessEnv) {
  const url = normalizedUrl(environment.MEMBER_HUB_SITE_URL);
  const localHost = url && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const valid = url && (['local', 'hosted-development'].includes(environment.MEMBER_HUB_ENVIRONMENT || '')
    ? localHost && ['http:', 'https:'].includes(url.protocol)
    : url.protocol === 'https:' && !localHost);
  if (!valid || !url) throw new HubAccessError(503, 'Member site URL is not configured safely.');
  return url.origin;
}

export function hubSiteOrigin(environment: NodeJS.ProcessEnv = process.env) {
  hubConfig(environment);
  return siteOrigin(environment);
}

export function hubServiceRoleKey(environment: NodeJS.ProcessEnv = process.env) {
  hubConfig(environment);
  const key = environment.MEMBER_HUB_SUPABASE_SERVICE_ROLE_KEY
    || (['production', 'hosted-development'].includes(environment.MEMBER_HUB_ENVIRONMENT || '') ? environment.SUPABASE_SERVICE_ROLE_KEY : undefined);
  let serviceRole = false;
  try { serviceRole = !!key && JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')).role === 'service_role'; }
  catch { /* New Supabase secret keys are not JWTs. */ }
  if (!key || (!/^sb_secret_[A-Za-z0-9_-]+$/.test(key) && !serviceRole)) throw new HubAccessError(503, 'Member file storage credentials are not configured safely.');
  return key;
}
