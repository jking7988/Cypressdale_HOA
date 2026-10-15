export function newsletterDelivery(environment: NodeJS.ProcessEnv = process.env) {
  const disabled = { transport: 'disabled' as const, recipients: [] as string[], live: false, from: '' };
  if (environment.MEMBER_HUB_ENVIRONMENT === 'local') return { ...disabled, transport: 'mailpit' as const };
  if (!['staging', 'production'].includes(environment.MEMBER_HUB_ENVIRONMENT || '')) return disabled;
  if (environment.MEMBER_HUB_ENVIRONMENT === 'production' && (environment.MEMBER_HUB_PRODUCTION_READY !== 'true'
    || (environment.VERCEL_ENV && environment.VERCEL_ENV !== 'production'))) return disabled;
  const from = environment.NEWSLETTER_FROM?.trim() || '';
  if (environment.NEWSLETTER_DELIVERY_ENABLED !== 'true' || !environment.RESEND_API_KEY || !from || /[\r\n]/.test(from)) return disabled;
  const recipients = [...new Set((environment.NEWSLETTER_TEST_RECIPIENTS || environment.NEWSLETTER_STAGING_RECIPIENTS || '')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean))].sort();
  const mode = environment.NEWSLETTER_DELIVERY_MODE || 'test';
  const live = environment.MEMBER_HUB_ENVIRONMENT === 'production' && mode === 'live'
    && environment.NEWSLETTER_PRODUCTION_DELIVERY_READY === 'true'
    && (!environment.VERCEL_ENV || environment.VERCEL_ENV === 'production');
  if (!live && (mode !== 'test' || !recipients.length || recipients.some(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))) return disabled;
  return { transport: 'resend' as const, recipients, live, from };
}

export function newsletterRecipientAllowed(email: string, configuration: ReturnType<typeof newsletterDelivery>) {
  return configuration.transport === 'mailpit'
    || (configuration.transport === 'resend' && (configuration.live || configuration.recipients.includes(email.trim().toLowerCase())));
}

export function newsletterCampaignScope(configuration: ReturnType<typeof newsletterDelivery>) {
  if (configuration.transport !== 'resend') return configuration.transport;
  return configuration.live ? 'resend:live' : 'resend:test';
}

export function newsletterCronSecret(environment: NodeJS.ProcessEnv = process.env) {
  if (environment.NEWSLETTER_CRON_SECRET && environment.CRON_SECRET && environment.NEWSLETTER_CRON_SECRET !== environment.CRON_SECRET) {
    return undefined;
  }
  return environment.NEWSLETTER_CRON_SECRET || environment.CRON_SECRET;
}
