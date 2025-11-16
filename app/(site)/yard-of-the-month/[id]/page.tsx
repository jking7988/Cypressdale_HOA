// app/yard-of-the-month/[id]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { client } from '@/lib/sanity.client';
import { yardWinnersQuery } from '@/lib/queries';
import { YardLightbox } from '@/components/YardLightbox';

export const dynamic = 'force-dynamic';

type YardWinner = {
  _id: string;
  title: string;
  month?: string;
  streetOrBlock?: string;
  description?: string;
  photoUrl?: string;
  photoUrls?: string[];
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
  params: Promise<{ id: string }>;
};

export default async function YardWinnerDetailPage(props: PageProps) {
  const { id } = await props.params;

  const winners = await client.fetch<YardWinner[]>(yardWinnersQuery);
  const winner = winners.find((w) => w._id === id) ?? null;

  if (!winner) {
    return notFound();
  }

  const photos = (winner.photoUrls ?? []).filter(Boolean);

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

      {/* 🔥 New gallery + lightbox */}
      {photos.length > 0 && (
        <YardLightbox photos={photos} title={winner.title} />
      )}

      {winner.description && (
        <p className="text-sm text-gray-700">{winner.description}</p>
      )}
    </article>
  </div>
);
}
