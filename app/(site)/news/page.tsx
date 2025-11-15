export const dynamic = 'force-dynamic';

import { client } from '@/lib/sanity.client';
import { postsQuery } from '@/lib/queries';
import { PortableText } from '@portabletext/react';

export default async function NewsPage() {
  const posts = await client.fetch(postsQuery);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
        <div>
          <h1 className="h1 flex items-center gap-2">
            <span>News &amp; Updates</span>
            {posts.length > 0 && (
              <span className="text-[11px] rounded-full bg-sky-100 text-sky-800 px-2 py-0.5">
                {posts.length} post{posts.length === 1 ? '' : 's'}
              </span>
            )}
          </h1>
          <p className="muted text-sm mt-1">
            Official announcements, reminders, and updates from your Cypressdale HOA.
          </p>
        </div>
      </header>

      {posts.length === 0 && (
        <p className="muted text-sm">No news posts have been published yet.</p>
      )}

      {posts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((p: any) => {
            const created = new Date(p._createdAt);

            return (
              <article
                key={p._id}
                className="card flex flex-col gap-2 border border-emerald-50 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md hover:border-emerald-100"
              >
                {/* Title + date */}
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-brand-900 mb-0.5 flex items-center gap-1.5">
                    <span>🗞️</span>
                    <span>{p.title}</span>
                  </h2>

                  <p className="text-[11px] text-gray-500">
                    {created.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                {/* Excerpt */}
                {p.excerpt && (
                  <p className="text-sm text-gray-700">
                    {p.excerpt}
                  </p>
                )}

                {/* Body */}
                {p.body && (
                  <div className="prose max-w-none prose-sm mt-1">
                    <PortableText value={p.body} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
