import { client } from '@/lib/sanity.client';
import { postsQuery } from '@/lib/queries';
import { PortableText } from '@portabletext/react';

export const dynamic = 'force-dynamic';

export default async function NewsPage() {
  const posts = await client.fetch(postsQuery);

  return (
    <div className="space-y-6">
      <h1 className="h1">News & Updates</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {posts.map((p: any) => {
          const created = new Date(p._createdAt);

          return (
            <article id={p._id} key={p._id} className="card">
              <h2 className="text-xl font-semibold">{p.title}</h2>
              <p className="muted">
                {created.toLocaleString()}  {/* ← date + time */}
              </p>
              <p className="mt-2">{p.excerpt}</p>
              {p.body && (
                <div className="prose max-w-none mt-3">
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
