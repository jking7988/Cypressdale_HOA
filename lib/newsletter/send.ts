import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { createHubStorageClient, createHubUserClient, HubAccessError } from '@/lib/member-hub/server';
import { deliverMail, mailTransport, configuredTransport, newsletterOrigin } from './mail';
import { centralDate, renderNewsletter, selectNewsletterItems, newsletterSettingsSchema, type NewsletterSettings, type NewsletterItem } from './template';
import { loadNewsletterSettings } from './settings';
import { newsletterCampaignKey } from './campaign';
import { newsletterTables } from './tables';
import { newsletterDelivery, newsletterRecipientAllowed, newsletterCampaignScope } from './delivery-config';
export async function newsletterContent() {
  const { data, error } = await createHubUserClient().from('hoa_content')
    .select('id,kind,title,settings,updated_at,created_at').eq('status','published').eq('visibility','public').in('kind',['post','event']);
  if (error) throw new Error('Unable to load public newsletter content.');
  const rows = data ?? [], now = Date.now();
  const posts = rows.filter(row => row.kind === 'post').sort((a,b) =>
    String(b.settings.newsDate || b.settings.publishedAt || b.created_at).localeCompare(String(a.settings.newsDate || a.settings.publishedAt || a.created_at))).slice(0,10);
  const events = rows.filter(row => row.kind === 'event').map(row => ({...row,nextDate:
    [row.settings.startDate || row.settings.start,row.settings.secondStartDate].filter(date => typeof date === 'string' && Date.parse(date) >= now)
      .sort((a,b) => Date.parse(a)-Date.parse(b))[0]})).filter(row => row.nextDate)
    .sort((a,b) => Date.parse(a.nextDate)-Date.parse(b.nextDate)).slice(0,10);
  return [...posts,...events].map(row => ({ id: row.id, kind: row.kind, title: row.title, updated_at: row.updated_at,
    date: row.kind === 'post' ? row.settings.newsDate || row.settings.publishedAt || row.created_at : 'nextDate' in row ? row.nextDate : undefined })) as NewsletterItem[];
}
function digest(items: NewsletterItem[], settings: NewsletterSettings) { return createHash('sha256').update(JSON.stringify({ items, settings })).digest('hex'); }
export async function newsletterPreview() {
  const availableItems = await newsletterContent();
  const customization = await loadNewsletterSettings();
  const items = selectNewsletterItems(availableItems, customization.settings);
  const service = createHubStorageClient();
  const delivery = newsletterDelivery();
  let subscriberQuery = service.from('newsletter_subscribers').select('id', { head: true, count: 'exact' }).eq('active',true).eq('verified',true);
  if (delivery.transport === 'resend' && !delivery.live) subscriberQuery = subscriberQuery.in('email',delivery.recipients);
  const subscribers = await subscriberQuery;
  if (subscribers.error) throw subscribers.error;
  return { items, availableItems, settings: customization.settings, settingsVersion: customization.version,
    subscribers: subscribers.count ?? 0, transport: configuredTransport(), live: delivery.live, origin: newsletterOrigin(),
    ...renderNewsletter(items, newsletterOrigin(), `${newsletterOrigin()}/api/newsletter/unsubscribe`, customization.settings) };
}
export async function runNewsletterSend({ force = false, expectedSettingsVersion, resendRequestId, requestedBy }: {
  force?: boolean; expectedSettingsVersion?: number; resendRequestId?: string; requestedBy?: string;
} = {}) {
  if (resendRequestId && !force) throw new HubAccessError(403, 'Only an admin can override the daily newsletter limit.');
  const tables = newsletterTables();
  const service = createHubStorageClient(), now = new Date(), transport = mailTransport(), origin = newsletterOrigin();
  const delivery = newsletterDelivery(), deliveryScope = newsletterCampaignScope(delivery);
  const testRecipients = delivery.transport === 'resend' && !delivery.live ? delivery.recipients : [];
  const scopeKey = testRecipients.length ? `${deliveryScope}:${createHash('sha256').update(JSON.stringify(testRecipients)).digest('hex').slice(0,16)}` : deliveryScope;
  const today = centralDate(now), key = newsletterCampaignKey(scopeKey, today, resendRequestId);
  if (!force && new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short'}).format(now) !== 'Fri')
    return { statusCode:200, body:{ sent:0, reason:'not-friday' } };
  const customization = await loadNewsletterSettings();
  if (expectedSettingsVersion !== undefined && expectedSettingsVersion !== customization.version) {
    throw new HubAccessError(409, 'Newsletter customization changed. Refresh the preview before sending.');
  }
  const { settings } = customization;
  const items = selectNewsletterItems(await newsletterContent(), settings);
  if (!items.length) return { statusCode:200, body:{ sent:0, reason:'no-content' } };
  const contentDigest = digest(items, settings);
  let previousQuery = service.from(tables.runs).select('payload').not('sent_at','is',null).eq('transport',transport);
  if (transport === 'resend') previousQuery = previousQuery.eq('payload->>deliveryScope',deliveryScope);
  const previous = await previousQuery.order('sent_at',{ascending:false}).limit(1).maybeSingle();
  if (previous.error) throw previous.error;
  if (!force && previous.data?.payload.digest === contentDigest) return { statusCode:200, body:{ sent:0,reason:'no-new-updates' } };
  const payload = { items, settings, digest:contentDigest, origin, deliveryScope, testRecipients,
    manualResend: !!resendRequestId, resendRequestId: resendRequestId ?? null, requestedBy: requestedBy ?? null };
  let recipientQuery = service.from('newsletter_subscribers').select('id',{count:'exact',head:true}).eq('active',true).eq('verified',true);
  if (testRecipients.length) recipientQuery = recipientQuery.in('email',testRecipients);
  const recipients = await recipientQuery;
  if (recipients.error) throw recipients.error;
  if (!recipients.count) return {statusCode:200,body:{sent:0,reason:'no-active-subscribers'}};
  const started = await service.rpc('hoa_start_newsletter',{campaign_key:key,campaign_payload:payload,mail_transport:transport});
  if (started.error) throw started.error;
  const run = await service.from(tables.runs).select('*').eq('id',started.data).single();
  if (run.error) throw run.error;
  if (run.data.sent_at) return { statusCode:200, body:{ sent:0,reason:resendRequestId ? 'already-sent-request' : 'already-sent-today',runId:run.data.id } };
  if (run.data.payload.digest !== contentDigest || run.data.payload.origin !== origin)
    throw new HubAccessError(409,'Newsletter content or customization changed after this campaign was created. No outdated email was sent.');
  if (transport === 'resend' && (run.data.payload.deliveryScope !== deliveryScope
    || JSON.stringify(run.data.payload.testRecipients) !== JSON.stringify(testRecipients))) {
    throw new HubAccessError(409,'Email delivery settings changed after this campaign was created.');
  }
  const campaignSettings = newsletterSettingsSchema.parse(run.data.payload.settings ?? settings);
  const claim = randomUUID();
  let sent = 0, failed = 0;
  const startedAt = Date.now();
  do {
    const jobs = await service.rpc('hoa_claim_newsletter',{campaign_id:run.data.id,claim_id:claim});
    if (jobs.error) throw jobs.error;
    if (!jobs.data?.length) break;
    for (const job of jobs.data ?? []) {
      let status = 'skipped', providerId: string | null = null, lastError: string | null = null;
      try {
        const sub = await service.from('newsletter_subscribers').select('email,unsubscribe_token,active,verified').eq('id',job.subscriber_id).maybeSingle();
        if (sub.error) throw sub.error;
        if (sub.data?.active && sub.data.verified && newsletterRecipientAllowed(sub.data.email,delivery)) {
          const latest = await loadNewsletterSettings();
          if (digest(selectNewsletterItems(await newsletterContent(), latest.settings), latest.settings) !== contentDigest) throw new Error('Newsletter content or customization changed; delivery paused.');
          if (Date.now() - Date.parse(run.data.created_at) > 23 * 60 * 60 * 1000) throw new Error('Retry window expired; review this delivery before retrying.');
          const unsubscribe = `${origin}/api/newsletter/unsubscribe?token=${sub.data.unsubscribe_token}`;
          providerId = await deliverMail(sub.data.email, renderNewsletter(items,origin,unsubscribe,campaignSettings), `newsletter-${job.id}`,unsubscribe);
          status = 'sent'; sent++;
        }
      } catch (error) { status = 'failed'; failed++; lastError = error instanceof Error ? error.message : 'Delivery failed.'; }
      const saved = await service.from(tables.deliveries).update({ status,provider_id:providerId,last_error:lastError,
        sent_at:status === 'sent' ? new Date().toISOString() : null,lease_until:null })
        .eq('id',job.id).eq('lease_id',claim);
      if (saved.error) throw saved.error;
      }
    if (failed) break;
  } while (Date.now() - startedAt < 20000);
  const pending = await service.from(tables.deliveries).select('id',{count:'exact',head:true}).eq('run_id',run.data.id).in('status',['pending','sending','failed']);
  if (pending.error) throw pending.error;
  if (!pending.count) {
    const completed = await service.from(tables.runs).update({sent_at:new Date().toISOString()}).eq('id',run.data.id);
    if (completed.error) throw completed.error;
  }
  return { statusCode: failed ? 502 : 200, body:{sent,failed,pending:pending.count ?? 0,runId:run.data.id,transport} };
}
