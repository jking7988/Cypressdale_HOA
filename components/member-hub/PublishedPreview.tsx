'use client';

import PagePreviewFrame from './PagePreviewFrame';
import EventPage from '@/components/content/EventPage';
import NewsPage from '@/components/content/NewsPage';
import YardWinnerPage from '@/components/content/YardWinnerPage';
import { projectContent } from '@/lib/member-hub/content-projection';
import type { ContentRecord, MediaAsset } from '@/lib/member-hub/content';
import ContentView from './ContentView';

export default function PublishedPreview({ content, assets }: { content: ContentRecord; assets: MediaAsset[] }) {
  const projected = projectContent(content, new Map(assets.map(asset => [asset.id, asset])), new Map());
  let page;
  if (content.kind === 'post') page = <NewsPage post={projected} preview />;
  else if (content.kind === 'event') page = <EventPage event={projected} preview />;
  else if (content.kind === 'yardWinner') page = <YardWinnerPage winner={projected} />;
  else page = <div className="hub-root p-4"><ContentView content={content} assets={assets} /></div>;
  return <PagePreviewFrame>
      {content.visibility === 'members' && <p className="bg-white px-4 py-2 text-xs text-emerald-900">Members Only</p>}
      {page}
  </PagePreviewFrame>;
}
