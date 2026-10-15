import { loadHubPage } from '@/lib/member-hub/pages';
import DocumentManager from '@/components/member-hub/DocumentManager';
import type { ContentRecord, MediaAsset } from '@/lib/member-hub/content';

export const metadata = { title: 'Manage Documents' };

export default async function Documents({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const { account, error } = await loadHubPage('admin');
  if (!account) return <p className="hub-message">{error}</p>;
  const [records, assets, query] = await Promise.all([
    account.client.from('hoa_content').select('*').in('kind', ['documentFolder', 'documentFile']).order('title'),
    account.client.from('hoa_assets').select('id, original_filename, mime_type, object_path, library').eq('library', 'documents').order('created_at', { ascending: false }).limit(1000),
    searchParams,
  ]);
  if (records.error || assets.error) return <p className="hub-message">Unable to load documents.</p>;
  return <DocumentManager initial={records.data as ContentRecord[]} assets={assets.data as MediaAsset[]} selected={query.item} />;
}
