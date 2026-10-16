import { notFound, redirect } from 'next/navigation';
import { loadHubPage } from '@/lib/member-hub/pages';
import ContentEditor from '@/components/member-hub/ContentEditor';
import { newContent, type ContentRecord, type MediaAsset } from '@/lib/member-hub/content';
import { programs } from '@/lib/member-hub/programs';
import { holidayPages, winnerHoliday } from '@/lib/member-hub/holidays';
export const metadata = { title: 'Content Editor' };
export default async function EditContent({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const { account, error } = await loadHubPage('admin');
  if (!account) return <p className="hub-message">{error}</p>;
  const { id } = await params;
  if (id === 'settings-newsletter') redirect('/admin/newsletter');
  const [row, media, folders, published] = await Promise.all([
    id === 'new' ? Promise.resolve({ data: { ...newContent('post'), id: 'new' }, error: null }) : account.client.from('hoa_content').select('*').eq('id', id).maybeSingle(),
    account.client.from('hoa_assets').select('id, original_filename, mime_type, object_path, library').order('created_at', { ascending: false }).limit(1000),
    account.client.from('hoa_content').select('id, title').eq('kind', 'documentFolder'),
    id.startsWith('drafts.') ? account.client.from('hoa_content').select('version').eq('id', id.slice(7)).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (row.error || !row.data) notFound();
  if (row.data.id === holidayPages.halloween.id) redirect(holidayPages.halloween.adminPath);
  if (row.data.kind === 'holidayWinner' && winnerHoliday(row.data.settings.holiday) === 'halloween') redirect(`${holidayPages.halloween.adminPath}?winner=${encodeURIComponent(row.data.id)}`);
  for (const info of Object.values(programs)) {
    if (row.data.id === info.id) redirect(info.adminPath);
    if (row.data.kind === info.kind) redirect(`${info.adminPath}?winner=${encodeURIComponent(row.data.id)}`);
  }
  if (['documentFolder', 'documentFile'].includes(row.data.kind)) redirect(`/admin/documents?item=${encodeURIComponent(row.data.id)}`);
  if (media.error || folders.error || published.error) return <p className="hub-message">Unable to load page attachments.</p>;
  const view = (await searchParams).view;
  return <ContentEditor key={row.data.id} initial={row.data as ContentRecord} assets={media.data as MediaAsset[]} folders={folders.data || []} publishedVersion={published.data?.version || null} initialMode={view === 'preview' ? 'preview' : 'edit'} />;
}
