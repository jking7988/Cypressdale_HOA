export const dynamic = 'force-dynamic';

import { client } from '@/lib/sanity.client';
import { postsQuery } from '@/lib/queries';
import { PortableText } from '@portabletext/react';

export default async function NewsPage() {
  const posts = await client.fetch(postsQuery);

  return (
    <div className="space-y-6">
      <h1 className="h1">News & Updates</h1>

      {posts.length === 0 && (
        <p className="muted text-sm">No news posts have been published yet.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {posts.map((p: any) => {
          const created = new Date(p._createdAt);

          return (
            <article key={p._id} className="card">
              <h2 className="text-xl font-semibold mb-1">{p.title}</h2>

              <p className="text-[11px] text-gray-500 mb-1">
                {created.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>

              {p.excerpt && (
                <p className="text-sm text-gray-700 mb-2">{p.excerpt}</p>
              )}

              {p.body && (
                <div className="prose max-w-none">
                  <PortableText value={p.body} />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
