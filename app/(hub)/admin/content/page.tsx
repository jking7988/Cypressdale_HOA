import { loadHubPage } from '@/lib/member-hub/pages';
import ContentDirectory from '@/components/member-hub/ContentDirectory';
import type { ContentRecord } from '@/lib/member-hub/content';
export const metadata = { title: 'Manage Content' };
export default async function Content() {
  const { account, error } = await loadHubPage('admin');
  if (!account) return <p className="hub-message">{error}</p>;
  const result = await account.client.from('hoa_content').select('id, title, kind, status, visibility, version, updated_at').in('kind', ['post', 'event', 'page']).not('id', 'in', '(program-yard-of-the-month,program-holiday-decorating,program-halloween-decorating,settings-newsletter)').order('updated_at', { ascending: false }).limit(1000);
  if (result.error) return <p className="hub-message">Unable to load content.</p>;
  return <ContentDirectory records={result.data as ContentRecord[]} />;
}
