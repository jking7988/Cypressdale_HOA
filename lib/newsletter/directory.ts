import 'server-only';
import { createHubStorageClient } from '@/lib/member-hub/server';
import type { NewsletterSubscriber } from './subscriber-types';

export async function listNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  const service = createHubStorageClient();
  const subscribers: NewsletterSubscriber[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await service.from('newsletter_subscribers')
      .select('id,email,name,street,pending_name,pending_street,active,verified,created_at,updated_at')
      .order('id').range(offset, offset + 999);
    if (error) throw new Error('Unable to load subscribers.');
    subscribers.push(...(data ?? []).map(row => ({ id: row.id, email: row.email,
      name: row.name ?? (row.verified ? null : row.pending_name), street: row.street ?? (row.verified ? null : row.pending_street),
      active: row.active, verified: row.verified, created_at: row.created_at, updated_at: row.updated_at })));
    if (!data || data.length < 1000) break;
  }
  return subscribers.sort((a, b) => a.email.localeCompare(b.email));
}
