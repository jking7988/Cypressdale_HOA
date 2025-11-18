export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { client } from '@/lib/sanity.client';
import { postsQuery } from '@/lib/queries';
import { PortableText } from '@portabletext/react';
import { NewsCalendar } from '@/components/NewsCalendar';
import { NewsLetterSignup } from '@/components/NewsLetterSignup';

type Post = {
  _id: string;
  title: string;
  excerpt?: any;
  body?: any;
  _createdAt?: string;
  publishedAt?: string;
  newsDate?: string;
};

// pick the “effective” date for calendar/linking
function getEffectiveDate(p: Post): string | null {
  return p.newsDate ?? p.publishedAt ?? p._createdAt ?? null;
}

// turn a datetime into a date key YYYY-MM-DD (string only, no Date math)
function toDateKey(dateStr: string | null): string | null {
  if (!dateStr) return null;
  // Sanity sends ISO like "2025-11-24T17:00:00.000Z"
  return dateStr.slice(0, 10); // "2025-11-24"
}

export default async function NewsPage() {
  const posts = await client.fetch<Post[]>(postsQuery);

  // Group posts by date key: YYYY-MM-DD
  const postsByDate = new Map<string, Post[]>();
  for (const p of posts) {
    const key = toDateKey(getEffectiveDate(p));
    if (!key) continue;
    if (!postsByDate.has(key)) postsByDate.set(key, []);
    postsByDate.get(key)!.push(p);
  }

  // Mini map used by the calendar: dateKey -> [{id,title}]
  const postsForDate: Record<string, { id: string; title: string }[]> = {};
  for (const [dateKey, dayPosts] of postsByDate.entries()) {
    postsForDate[dateKey] = dayPosts.map((p) => ({
      id: p._id,
      title: p.title,
    }));
  }

  const todayKey = new Date().toISOString().slice(0, 10);

  const dateKeys = Array.from(postsByDate.keys()).sort(); // ascending
  const baseDateKey = dateKeys.length ? dateKeys[dateKeys.length - 1] : todayKey;

  // feed the calendar a datetime in the middle of that day so TZ can't shift it
  const baseDateIso = `${baseDateKey}T12:00:00.000Z`;
  const dateKeysWithPosts = dateKeys;

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
        <section className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)] items-start">
          {/* LEFT: posts grouped by date */}
          <div className="space-y-4">
            {Array.from(postsByDate.entries())
              .sort(([a], [b]) => (a < b ? 1 : -1)) // newest date first
              .map(([dateKey, dayPosts]) => {
                const d = new Date(`${dateKey}T12:00:00.000Z`);
                const heading = d.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <div key={dateKey} className="space-y-3">
                    <h2
                      id={`news-${dateKey}`}
                      className="scroll-mt-24 text-xs font-semibold text-gray-500 uppercase tracking-[0.18em]"
                    >
                      {heading}
                    </h2>

                    <div className="grid gap-4">
                      {dayPosts.map((p) => {
                        const created = p._createdAt
                          ? new Date(p._createdAt)
                          : null;
                        const href = `/news/${p._id}`;

                        return (
                          <Link key={p._id} href={href} className="group">
                            <article className="card flex flex-col gap-2 border border-emerald-50 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md hover:border-emerald-100">
                              <div>
                                <h3 className="text-base md:text-lg font-semibold text-brand-900 mb-0.5 flex items-center gap-1.5">
                                  <span>🗞️</span>
                                  <span>{p.title}</span>
                                </h3>
                                {created && (
                                  <p className="text-[11px] text-gray-500">
                                    {created.toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                )}
                              </div>

                              {p.excerpt && (
                                <div className="text-sm text-gray-700 mt-2 line-clamp-3">
                                  <PortableText value={p.excerpt} />
                                </div>
                              )}

                              <p className="mt-2 text-[11px] font-medium text-emerald-700 group-hover:underline">
                                Read full update →
                              </p>
                            </article>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* RIGHT: calendar + newsletter signup */}
          <div className="space-y-4">
            <NewsCalendar
              baseDateIso={baseDateIso}
              dateKeysWithPosts={dateKeysWithPosts}
              postsForDate={postsForDate}
            />

            <NewsLetterSignup />
          </div>
        </section>
      )}
    </div>
  );
}
