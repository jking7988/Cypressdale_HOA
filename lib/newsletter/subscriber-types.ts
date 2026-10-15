export type NewsletterSubscriber = {
  id: string; email: string; name: string | null; street: string | null;
  active: boolean; verified: boolean; created_at: string; updated_at: string;
};
export function subscriberStatus(subscriber: NewsletterSubscriber) {
  return !subscriber.verified ? 'unconfirmed' : subscriber.active ? 'subscribed' : 'unsubscribed';
}
