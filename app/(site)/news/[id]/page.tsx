// app/(site)/news/[id]/page.tsx
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { groq } from 'next-sanity';
import { client } from '@/lib/sanity.client';
import { PortableText } from '@portabletext/react';
import { portableTextComponents } from '@/components/portableTextComponents';
import React from 'react';

type Post = {
  _id: string;
  title: string;
  topic?: string;
  excerpt?: any;
  body?: any;
  _createdAt?: string;
};

// Match on _id only, because your list page links with _id
const postByIdQuery = groq`*[_type == "post" && _id == $id][0]{
  _id,
  title,
  topic,
  excerpt,
  body,
  _createdAt
}`;

const topicInfo: Record<
  string,
  { icon: string; label: string; color: string }
> = {
  elections: {
    icon: '🗳️',
    label: 'Elections',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  pool: {
    icon: '🌊',
    label: 'Pool Update',
    color: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  events: {
    icon: '📅',
    label: 'Community Event',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  maintenance: {
    icon: '🛠️',
    label: 'Maintenance',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  general: {
    icon: '📢',
    label: 'General Update',
    color: 'bg-brand-100 text-brand-800 border-brand-200',
  },
};

const ImportantDateBox = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 flex items-start gap-2">
    <span className="text-lg">⏰</span>
    <div>{children}</div>
  </div>
);

// 👇 params is a Promise with the new Next behavior
type Props = {
  params: Promise<{ id: string }>;
};

export default async function NewsDetailPage(props: Props) {
  // Unwrap the params Promise
  const { id } = await props.params;
  if (!id) return notFound();

  const post = await client.fetch<Post | null>(postByIdQuery, { id });
  if (!post) return notFound();

  const created = post._createdAt ? new Date(post._createdAt) : null;
  const topic =
    (post.topic && topicInfo[post.topic]) || topicInfo['general'];

  return (
    <div className="relative min-h-[calc(100vh-5rem)]">
      {/* Newspaper-style background */}
      <div
        className="fixed inset-0 -z-30 bg-center bg-repeat opacity-[0.72]"
        style={{
          backgroundImage: "url('/images/newsletter-bg.png')",
          backgroundSize: '512px 512px',
          backgroundAttachment: 'fixed',
        }}
      />
      {/* Soft overlay so content stays readable */}
      <div className="fixed inset-0 -z-20 bg-white/92 backdrop-blur-[1.5px]" />

      {/* Page content container */}
      <div className="relative mx-auto max-w-3xl px-4 py-6 md:py-8 space-y-4">
        {/* Back link */}
        <div className="mb-1">
          <Link
            href="/news"
            className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline"
          >
            <span>←</span>
            <span>Back to all news</span>
          </Link>
        </div>

        <article className="rounded-3xl border border-emerald-50 bg-white/95 shadow-sm backdrop-blur-[1px] px-5 py-6 md:px-8 md:py-8 space-y-6">
          {/* Masthead */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-50 pb-3">
            <div className="flex items-center gap-3">
              <span className="text-lg">{topic.icon}</span>

              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
                Cypressdale HOA — News &amp; Updates
              </p>
            </div>

            {created && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50/80 px-3 py-1 text-[11px] font-medium text-emerald-800">
                <span className="text-[12px]">🗓️</span>
                {created.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>

          {/* Topic badge */}
          <div
            className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1 border rounded-full w-fit mb-1 shadow-sm ${topic.color}`}
          >
            <span>{topic.icon}</span>
            <span>{topic.label}</span>
          </div>

          {/* Title */}
          <h1 className="text-xl md:text-2xl font-semibold leading-snug text-brand-900">
            {post.title}
          </h1>

          {/* Important Dates Callout (from excerpt) */}
          {post.excerpt && (
            <ImportantDateBox>
              <PortableText
                value={post.excerpt}
                components={portableTextComponents}
              />
            </ImportantDateBox>
          )}

          {/* Body */}
          {post.body && (
            <section className="text-sm md:text-[15px] leading-relaxed text-gray-800">
              <div className="md:border-l md:border-emerald-100 md:pl-6 space-y-3">
                <PortableText
                  value={post.body}
                  components={portableTextComponents}
                />
              </div>
            </section>
          )}

          {/* Footer */}
          <footer className="mt-4 pt-4 border-t border-emerald-50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
            <span>Prepared by the Cypressdale HOA Board of Directors</span>
            {created && (
              <span>
                Published{' '}
                {created.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
          </footer>
        </article>
      </div>
    </div>
  );
}
