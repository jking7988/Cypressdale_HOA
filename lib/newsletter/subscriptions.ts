import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { createHubStorageClient, HubAccessError } from '@/lib/member-hub/server';
import { deliverMail, newsletterOrigin, mailTransport } from './mail';
import { escapeHtml } from './template';
export const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export function hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }
export async function requestSubscription(input: unknown) {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(254),
    name: z.string().trim().max(200).optional(), street: z.string().trim().max(500).optional() }).safeParse(input);
  if (!parsed.success) throw new HubAccessError(400, 'Enter a valid email address and subscription details.');
  mailTransport(); const origin = newsletterOrigin();
  const token = randomBytes(32).toString('hex');
  const { data, error } = await createHubStorageClient().rpc('hoa_request_newsletter', {
    subscriber_email: parsed.data.email, subscriber_name: parsed.data.name || null,
    subscriber_street: parsed.data.street || null, token_hash: hashToken(token) });
  if (error?.code === '54000') throw new HubAccessError(429,'Too many newsletter requests. Please try again in a minute.');
  if (error) throw new Error('Subscription request failed.');
  if (data) {
    const url = `${origin}/api/newsletter/verify?token=${token}`;
    await deliverMail(parsed.data.email, { subject: 'Confirm your Cypressdale newsletter subscription',
      text: `Confirm your newsletter subscription:\n${url}\n\nThis link expires in 24 hours. Ignore this message if you did not request it.`,
      html: `<h1>Confirm your newsletter subscription</h1><p><a href="${escapeHtml(url)}">Confirm subscription</a></p><p>This link expires in 24 hours. Ignore this message if you did not request it.</p>` }, `newsletter-confirm-${hashToken(token)}`);
  }
  return { status: 'verification-sent', message: 'Check your email to confirm your Cypressdale newsletter subscription.' };
}
export async function requestUnsubscribe(input: unknown) {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(254) }).safeParse(input);
  if (!parsed.success) throw new HubAccessError(400, 'Enter a valid email address.');
  mailTransport(); const origin = newsletterOrigin();
  const service = createHubStorageClient();
  const { data, error } = await service.rpc('hoa_request_newsletter_management',{subscriber_email:parsed.data.email});
  if (error?.code === '54000') throw new HubAccessError(429,'Too many newsletter requests. Please try again in a minute.');
  if (error) throw error;
  if (data) {
      const url = `${origin}/api/newsletter/unsubscribe?token=${data}`;
      await deliverMail(parsed.data.email, { subject: 'Manage your Cypressdale newsletter subscription',
        text: `Unsubscribe from the newsletter:\n${url}\n\nIgnore this email if you did not request it.`,
        html: `<h1>Newsletter subscription</h1><p><a href="${escapeHtml(url)}">Unsubscribe</a></p><p>Ignore this email if you did not request it.</p>` }, `newsletter-manage-${data}-${Date.now()}`);
  }
  return { status: 'management-sent', message: 'If subscribed, you will receive an email to manage your subscription.' };
}
