import 'server-only';
import { type ContentKind, type ContentRecord } from './content';
import { projectContent } from './content-projection';
import { createHubSessionClient, createHubUserClient } from './server';

type StoredContent = ContentRecord & { created_at: string; updated_at: string };
type Asset = { id: string; mime_type: string; original_filename: string };

function compare(a: any, b: any, kind: ContentKind) {
  const ascending = (x: unknown, y: unknown) => String(x ?? '').localeCompare(String(y ?? ''));
  if (kind === 'event') return ascending(a.startDate, b.startDate);
  if (kind === 'post') return ascending(b.newsDate ?? b.publishedAt ?? b._createdAt, a.newsDate ?? a.publishedAt ?? a._createdAt);
  if (kind === 'yardWinner') return ascending(b.month, a.month);
  if (kind === 'holidayWinner') return Number(b.year ?? 0) - Number(a.year ?? 0) || ascending(a.holiday, b.holiday)
    || ([1, 2, 3, 4].includes(Number(a.place)) ? Number(a.place) : 99) - ([1, 2, 3, 4].includes(Number(b.place)) ? Number(b.place) : 99)
    || ascending(a.title, b.title);
  if (kind === 'documentFile') return Number(a.folderOrder ?? 9999) - Number(b.folderOrder ?? 9999)
    || ascending(a.folderTitle, b.folderTitle) || ascending(b.uploadedAt, a.uploadedAt) || ascending(a.title, b.title);
  return ascending(a.title, b.title);
}

async function load(kind: ContentKind, id?: string) {
  // Anonymous listings stay public even when the visitor has an admin session.
  const client = id ? await createHubSessionClient() : createHubUserClient();
  let query = client.from('hoa_content').select('*').eq('kind', kind).eq('status', 'published');
  query = id ? query.eq('id', id) : query.eq('visibility', 'public');
  const { data, error } = await query;
  if (error) throw new Error('Unable to load community content.');
  const rows = (data ?? []) as StoredContent[];
  if (!rows.length) return [];
  const [assetResult, folderResult] = await Promise.all([
    client.from('hoa_assets').select('id, mime_type, original_filename'),
    client.from('hoa_content').select('*').eq('kind', 'documentFolder').eq('status', 'published').eq('visibility', 'public'),
  ]);
  if (assetResult.error || folderResult.error) throw new Error('Unable to load community files.');
  const assets = new Map((assetResult.data ?? []).map(asset => [asset.id, asset as Asset]));
  const folders = new Map((folderResult.data ?? []).map(folder => [folder.id, folder as StoredContent]));
  const projected = rows.map(row => projectContent(row, assets, folders));
  if (kind === 'event') for (const event of projected) {
    const result = await client.rpc('hoa_rsvp_summary', { event_id: event._id });
    if (result.error) throw new Error('Unable to load RSVP totals.');
    event.rsvpYes = result.data.yes; event.rsvpMaybe = result.data.maybe;
  }
  return projected.sort((a, b) => compare(a, b, kind));
}

export async function getPublicContent<T extends { _id: string }>(kind: ContentKind): Promise<T[]> {
  return await load(kind) as unknown as T[];
}

export async function getPublishedContent<T extends { _id: string }>(kind: ContentKind, id: string): Promise<T | null> {
  return (await load(kind, id))[0] as unknown as T ?? null;
}
