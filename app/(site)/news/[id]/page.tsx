// app/(site)/news/[id]/page.tsx
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { groq } from 'next-sanity';
import { client } from '@/lib/sanity.client';
import { PortableText } from '@portabletext/react';

type Post = {
  _id: string;
  title: string;
  excerpt?: any;      // Portable Text array
  body?: any;
  _createdAt?: string;
};

const postByIdQuery = groq`*[_type == "post" && _id == $id][0]{
  _id,
  title,
  excerpt,
  body,
  _createdAt
}`;

// params is a Promise in this Next.js version
type Props = {
  params: Promise<{ id: string }>;
};

export default async function NewsDetailPage(props: Props) {
  const { id } = await props.params;

  if (!id) {
    return notFound();
  }

  const post = await client.fetch<Post | null>(postByIdQuery, { id });

  if (!post) {
    return notFound();
  }

  const created = post._createdAt ? new Date(post._createdAt) : null;

  return (
    <div className="space-y-4">
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

      <header className="space-y-1">
        <p className="text-xs text-gray-500 uppercase tracking-[0.18em]">
          News &amp; Updates
        </p>
        <h1 className="h1">{post.title}</h1>
        {created && (
          <p className="text-xs text-gray-500">
            {created.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        )}
      </header>

      {post.excerpt && (
        <div className="text-sm text-gray-700 bg-brand-50/60 border border-brand-100 rounded-xl px-4 py-3">
          <PortableText value={post.excerpt} />
        </div>
      )}

      {post.body && (
        <div className="prose max-w-none prose-sm md:prose-base">
          <PortableText value={post.body} />
        </div>
      )}
    </div>
  );
}
