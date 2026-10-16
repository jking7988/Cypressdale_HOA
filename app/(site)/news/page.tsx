export const dynamic = 'force-dynamic';

import { getPublicContent } from '@/lib/member-hub/public-content';
import { NewsDirectory } from '@/components/NewsDirectory';
import { NewsLetterSignup } from '@/components/NewsLetterSignup';
import type { CommunityNews } from '@/lib/member-hub/news-list';

export default async function NewsPage() {
  const posts = await getPublicContent<CommunityNews>('post');

  return <div className="space-y-6">
    <header>
      <h1 className="h1 flex flex-wrap items-center gap-2">
        Community News
        {posts.length > 0 && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] text-sky-800">
          {posts.length} update{posts.length === 1 ? '' : 's'}
        </span>}
      </h1>
      <p className="muted mt-1 text-sm">Neighborhood news, HOA announcements, and updates from Cypressdale.</p>
    </header>
    <NewsDirectory posts={posts} now={new Date().toISOString()} />
    <section className="border-t border-emerald-900/20 pt-8">
      <div className="max-w-xl"><NewsLetterSignup /></div>
    </section>
  </div>;
}
