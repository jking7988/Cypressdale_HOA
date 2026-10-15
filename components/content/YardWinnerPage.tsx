import Link from 'next/link';
import ContentText from './ContentText';
import { YardLightbox } from '@/components/YardLightbox';
import { formatWinnerMonth } from '@/lib/member-hub/programs';


export type YardWinner = {
  _id: string;
  title: string;
  month?: string;
  streetOrBlock?: string;
  description?: string;
  photoUrl?: string;
  photoUrls?: string[];
};

function formatMonth(month?: string) {
  return formatWinnerMonth(month);
}


export default function YardWinnerPage({ winner }: { winner: YardWinner }) {
  // ✅ Use multiple photos when available; fall back to single photoUrl
  const photos = (
    winner.photoUrls && winner.photoUrls.length > 0
      ? winner.photoUrls
      : winner.photoUrl
      ? [winner.photoUrl]
      : []
  ).filter(Boolean) as string[];

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-b from-emerald-50 via-lime-50 to-amber-50">
      {/* subtle decorative “blobs” to match main page */}
      <div className="pointer-events-none fixed inset-0 opacity-40 mix-blend-multiply">
        <div className="absolute -top-10 -left-16 h-56 w-56 rounded-full bg-emerald-200 blur-3xl" />
        <div className="absolute top-24 -right-10 h-40 w-40 rounded-full bg-lime-200 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-amber-200 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 py-10 space-y-6">
        <Link
          href="/yard-of-the-month"
          className="inline-flex items-center text-xs font-medium text-emerald-800 hover:text-emerald-950 hover:underline"
        >
          ← Back to Yard of the Month
        </Link>

        <article className="rounded-3xl bg-white/95 border border-emerald-100/90 shadow-md overflow-hidden">
          <div className="p-5 md:p-6 space-y-4">
            <header className="space-y-1.5">
              <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800 uppercase tracking-wide border border-emerald-100">
                <span>🏆</span>
                <span>
                  {formatMonth(winner.month) || 'Yard of the Month'}
                </span>
              </p>
              <h1 className="text-xl md:text-2xl font-semibold text-emerald-950">
                <ContentText>{winner.title}</ContentText>
              </h1>
              {winner.streetOrBlock && (
                <p className="text-sm text-emerald-900/80">
                  <ContentText>{winner.streetOrBlock}</ContentText>
                </p>
              )}
            </header>

            {/* Gallery + lightbox */}
            {photos.length > 0 && (
              <div className="rounded-2xl border border-emerald-100/80 bg-emerald-50/40 p-3 md:p-4">
                <YardLightbox photos={photos} title={winner.title} />
              </div>
            )}

            {winner.description && (
              <p className="text-sm md:text-base text-emerald-900/90 leading-relaxed">
                <ContentText>{winner.description}</ContentText>
              </p>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
