import { loadHubPage } from '@/lib/member-hub/pages';
import { createHubStorageClient } from '@/lib/member-hub/server';
import { collectReferences, type LibraryAsset } from '@/lib/member-hub/asset-library';
import type { ContentKind } from '@/lib/member-hub/content';
import FileLibrary from '@/components/member-hub/FileLibrary';

export const metadata = { title: 'Manage Files' };

export default async function Files() {
  const { account, error } = await loadHubPage('admin');
  if (!account) return <p className="hub-message">{error}</p>;
  const [assets, content, pending] = await Promise.all([
    account.client.from('hoa_assets').select('id, original_filename, mime_type, object_path, library, size_bytes, created_at').eq('library', 'files').order('created_at', { ascending: false }).limit(1000),
    account.client.from('hoa_content').select('id, title, kind, status, body, sections, settings'),
    createHubStorageClient().rpc('hoa_pending_file_cleanup'),
  ]);
  if (assets.error || content.error || pending.error) return <p className="hub-message">Unable to load files.</p>;
  const rows = (content.data || []).map(row => ({ ...row, references: collectReferences([row.body, row.sections, row.settings]) }));
  const library: LibraryAsset[] = (assets.data || []).map(asset => ({ ...asset, library: 'files', usage: rows.filter(row => row.references.has(asset.id))
    .map(row => ({ id: row.id, title: row.title, kind: row.kind as ContentKind, status: row.status })) }));
  return <FileLibrary initial={library} pendingCleanup={!!pending.data?.length} />;
}
