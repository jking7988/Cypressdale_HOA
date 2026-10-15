import { loadHubPage } from '@/lib/member-hub/pages';
import { listNewsletterSubscribers } from '@/lib/newsletter/directory';
import SubscriberDirectory from '@/components/member-hub/SubscriberDirectory';
export const metadata = { title: 'Subscribers' };
export default async function SubscribersPage() {
  const { account, error } = await loadHubPage('admin');
  if (!account) return <p className="hub-message">{error}</p>;
  return <><div className="hub-page-heading"><h1>Subscribers</h1></div>
    <SubscriberDirectory initial={await listNewsletterSubscribers()} /></>;
}
