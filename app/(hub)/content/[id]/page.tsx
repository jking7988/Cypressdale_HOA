import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createHubSessionClient } from '@/lib/member-hub/server';
import ContentView from '@/components/member-hub/ContentView';
import type { ContentRecord, MediaAsset } from '@/lib/member-hub/content';
import { programs } from '@/lib/member-hub/programs';
import { holidayPages } from '@/lib/member-hub/holidays';

export default async function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createHubSessionClient();
  const { data, error } = await client.from('hoa_content').select('*').eq('id', id).maybeSingle();
  if (error || !data) notFound();
  if (data.id === holidayPages.halloween.id) redirect(holidayPages.halloween.publicPath);
  const program = Object.values(programs).find(info => info.id === data.id);
  if (program) redirect(program.publicPath);
  const [assets, comments] = await Promise.all([
    client.from('hoa_assets').select('id, original_filename, mime_type, object_path').limit(1000),
    client.from('hoa_comments').select('id, parent_id, display_name, message').eq('content_id', id).order('created_at'),
  ]);
  return <><Link className="hub-back" href="/members">Member Hub</Link><ContentView content={data as ContentRecord} assets={assets.data as MediaAsset[] || []} />
    {!!comments.data?.length && <section className="hub-section"><h2>Comments</h2>{comments.data.map(comment => <div className={`hub-legacy-comment ${comment.parent_id ? 'hub-comment-reply' : ''}`} key={comment.id}><strong>{comment.display_name}</strong><p>{comment.message}</p></div>)}</section>}
  </>;
}
