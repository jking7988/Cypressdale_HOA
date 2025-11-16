// app/yard-of-the-month/[id]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { client } from '@/lib/sanity.client';
import { yardWinnerByIdQuery } from '@/lib/queries';

export const dynamic = 'force-dynamic';

type YardWinner = {
  _id: string;
  title: string;
  month?: string;
  streetOrBlock?: string;
  description?: string;
  photoUrl?: string;
};

function formatMonth(month?: string) {
  if (!month) return '';
  const d = new Date(month);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

type PageProps = {
  params: { id: string };
};

export default async function YardWinnerDetailPage({ params }: PageProps) {
  const winner = await client.fetch<YardWinner | null>(yardWinnerByIdQuery, {
    id: params.id, // ✅ this satisfies $id
  });

  if (!winner) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/yard-of-the-month"
        className="text-xs text-emerald-700 hover:underline"
      >
        ← Back to Yard of the Month
      </Link>

      <article className="card space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
            {formatMonth(winner.month) || 'Yard of the Month'}
          </p>
          <h1 className="h1 text-xl md:text-2xl">{winner.title}</h1>
          {winner.streetOrBlock && (
            <p className="text-sm text-gray-600">{winner.streetOrBlock}</p>
          )}
        </header>

        {winner.photoUrl && (
          <div className="relative w-full max-h-[380px] overflow-hidden rounded-2xl border border-emerald-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={winner.photoUrl}
              alt={winner.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {winner.description && (
          <p className="text-sm text-gray-700">{winner.description}</p>
        )}
      </article>
    </div>
  );
}
