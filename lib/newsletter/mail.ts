import 'server-only';
import { Resend } from 'resend';
import { hubConfig, hubSiteOrigin, HubAccessError } from '@/lib/member-hub/config';
import { newsletterDelivery, newsletterRecipientAllowed } from './delivery-config';
export function newsletterOrigin() {
  return hubSiteOrigin();
}
export function configuredTransport(): 'mailpit' | 'resend' | 'disabled' {
  hubConfig();
  return newsletterDelivery().transport;
}
export function mailTransport(): 'mailpit' | 'resend' {
  const transport = configuredTransport();
  if (transport === 'disabled') throw new HubAccessError(503, 'Newsletter email delivery is disabled.');
  return transport;
}
export async function deliverMail(email: string, message: { subject: string; text: string; html: string }, idempotencyKey: string, unsubscribeUrl?: string) {
  hubConfig();
  const configuration = newsletterDelivery();
  const transport = configuration.transport;
  if (transport === 'disabled') throw new HubAccessError(503, 'Newsletter email delivery is disabled.');
  if (!newsletterRecipientAllowed(email, configuration)) throw new Error('Recipient is not on the test allowlist.');
  const headers = unsubscribeUrl ? { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : undefined;
  if (transport === 'mailpit') {
    const response = await fetch('http://127.0.0.1:55424/api/v1/send', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ From: { Email: 'no-reply@cypressdale.test', Name: 'Cypressdale HOA' }, To: [{ Email: email }],
        Subject: message.subject, Text: message.text, HTML: message.html, Headers: headers }) });
    if (!response.ok) throw new Error('Local email capture failed.');
    const data = await response.json(); return String(data.ID ?? data.id ?? 'mailpit');
  }
  const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: configuration.from, to: email, ...message, headers,
  }, { idempotencyKey });
  if (error || !data?.id) throw new Error('Email provider rejected the delivery.');
  return data.id;
}
