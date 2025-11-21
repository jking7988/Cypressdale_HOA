// app/(site)/news/page.tsx
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { client, previewClient } from '@/lib/sanity.client';
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

// 👇 Next 16 passes searchParams as a Promise
type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewsPage(props: Props) {
  const searchParams = await props.searchParams;
  const isDraft = searchParams?.draft === '1';

  // Use previewClient when ?draft=1, otherwise normal client
  const sanity = isDraft ? previewClient : client;

  const posts = await sanity.fetch<Post[]>(postsQuery);

  // Lead story = first post (postsQuery should already return newest first)
  const leadStory = posts[0] ?? null;
  const remainingPosts = leadStory ? posts.slice(1) : posts;

  // Group remaining posts by date key: YYYY-MM-DD
  const postsByDate = new Map<string, Post[]>();
  for (const p of remainingPosts) {
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
    <div className="relative min-h-[calc(100vh-5rem)] bg-gradient-to-b from-emerald-50 via-sky-50 to-emerald-50">
      {/* Soft newspaper texture */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-75"
        style={{
          backgroundImage: "url('/images/newsletter-bg.png')",
          backgroundSize: '512px 512px',
          backgroundRepeat: 'repeat',
          backgroundAttachment: 'fixed',
        }}
      />

      {/* Light center glow so cards are extra readable */}
      <div className="pointer-events-none fixed inset-0 -z-5 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.92),_rgba(255,255,255,0))]" />

      {/* Page content */}
      <div className="relative mx-auto w-full max-w-5xl px-4 py-8 space-y-6">
        {/* Masthead / front-page header */}
        <header className="space-y-3 border-b border-emerald-50 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="text-lg">🗞️</span>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
                Cypressdale HOA — News &amp; Updates
              </p>
            </div>

            {posts.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-emerald-50/80 border border-emerald-100 px-3 py-1 text-[11px] font-medium text-emerald-800">
                {posts.length} active update{posts.length === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-brand-900 leading-tight">
              Community News &amp; Official Announcements
            </h1>
            <p className="muted text-sm md:text-[15px] mt-1 max-w-2xl">
              Stay informed about elections, meetings, maintenance, and neighborhood
              happenings in Cypressdale. This page is your front page for HOA news.
            </p>
          </div>
        </header>

        {posts.length === 0 && (
          <p className="muted text-sm">
            No news posts have been published yet.
          </p>
        )}

        {posts.length > 0 && (
          <section className="grid gap-6 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1.1fr)] items-start">
            {/* LEFT COLUMN: Lead story + more updates */}
            <div className="space-y-6">
              {/* Lead story */}
              {leadStory && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-emerald-700">
                      Lead Story
                    </h2>
                    <Link
                      href={`/news/${leadStory._id}`}
                      className="text-[11px] text-emerald-700 hover:underline"
                    >
                      View full article →
                    </Link>
                  </div>

                  <Link href={`/news/${leadStory._id}`} className="group block">
                    <article className="rounded-3xl border border-emerald-50 bg-white/95 shadow-sm px-4 py-4 md:px-5 md:py-5 transition hover:-translate-y-[1px] hover:shadow-md hover:border-emerald-100 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg md:text-xl font-semibold text-brand-900">
                          {leadStory.title}
                        </h3>
                        {leadStory._createdAt && (
                          <p className="text-[11px] text-gray-500 whitespace-nowrap">
                            {new Date(leadStory._createdAt).toLocaleDateString(
                              undefined,
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              },
                            )}
                          </p>
                        )}
                      </div>

                      {leadStory.excerpt && (
                        <div className="text-sm text-gray-700 mt-1 line-clamp-4">
                          <PortableText value={leadStory.excerpt} />
                        </div>
                      )}

                      <p className="mt-2 text-[11px] font-medium text-emerald-700 group-hover:underline">
                        Read full update →
                      </p>
                    </article>
                  </Link>
                </section>
              )}

              {/* More updates by date */}
              {postsByDate.size > 0 && (
                <section className="space-y-4">
                  <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-gray-600">
                    More Updates
                  </h2>

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
                          <div key={dateKey} className="space-y-2">
                            <h3
                              id={`news-${dateKey}`}
                              className="scroll-mt-24 text-[11px] font-semibold text-gray-500 uppercase tracking-[0.18em]"
                            >
                              {heading}
                            </h3>

                            <div className="grid gap-3">
                              {dayPosts.map((p) => {
                                const created = p._createdAt
                                  ? new Date(p._createdAt)
                                  : null;
                                const href = `/news/${p._id}`;

                                return (
                                  <Link key={p._id} href={href} className="group">
                                    <article className="card flex flex-col gap-2 border border-emerald-50 shadow-sm bg-white/95 transition hover:-translate-y-[1px] hover:shadow-md hover:border-emerald-100">
                                      <div>
                                        <h4 className="text-sm md:text-base font-semibold text-brand-900 mb-0.5 flex items-center gap-1.5">
                                          <span>📌</span>
                                          <span>{p.title}</span>
                                        </h4>
                                        {created && (
                                          <p className="text-[11px] text-gray-500">
                                            {created.toLocaleDateString(
                                              undefined,
                                              {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                                hour: 'numeric',
                                                minute: '2-digit',
                                              },
                                            )}
                                          </p>
                                        )}
                                      </div>

                                      {p.excerpt && (
                                        <div className="text-[13px] text-gray-700 mt-1 line-clamp-3">
                                          <PortableText value={p.excerpt} />
                                        </div>
                                      )}

                                      <p className="mt-1 text-[11px] font-medium text-emerald-700 group-hover:underline">
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
                </section>
              )}
            </div>

            {/* RIGHT COLUMN: calendar + newsletter signup */}
            <div className="space-y-4">
              <div className="card border border-emerald-50 bg-white/95 shadow-sm">
                <NewsCalendar
                  baseDateIso={baseDateIso}
                  dateKeysWithPosts={dateKeysWithPosts}
                  postsForDate={postsForDate}
                />
              </div>

              <div className="card border border-emerald-50 bg-white/95 shadow-sm">
                <NewsLetterSignup />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
