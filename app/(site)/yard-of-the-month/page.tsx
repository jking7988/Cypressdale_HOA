import Link from 'next/link';
import { client } from '@/lib/sanity.client';
import { yardWinnersQuery } from '@/lib/queries';
import { ContactLink } from '@/components/ContactLink';

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

export default async function YardOfTheMonthPage() {
  const winners = await client.fetch<YardWinner[]>(yardWinnersQuery);
  const currentWinner = winners[0] ?? null;
  const pastWinners = winners.slice(1);

  return (
    <div className="relative min-h-[calc(100vh-5rem)]">
      {/* FULL-SCREEN BACKGROUND IMAGE */}
      <div
        className="fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/flower-path.png')",
          // optional: keep the image “fixed” for a subtle parallax feel
          backgroundAttachment: 'fixed',
        }}
      />

      {/* SOFT OVERLAY FOR READABILITY */}
      <div className="fixed inset-0 -z-10 bg-emerald-50/70 backdrop-blur-[2px]" />

      {/* PAGE CONTENT (stays constrained) */}
      <div className="relative mx-auto max-w-5xl px-4 py-10 space-y-8">
        {/* Page header */}
        <header className="space-y-3 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-900/80 px-4 py-1 text-xs font-medium text-emerald-50 shadow-sm">
            <span className="text-sm">🌿</span>
            <span className="tracking-[0.18em] uppercase">
              Yard of the Month
            </span>
            <span className="text-sm">🌸</span>
          </div>

          <h1 className="h1 text-2xl md:text-3xl text-emerald-950 flex items-center gap-2">
            <span>Celebrate beautiful yards</span>
          </h1>

          <p className="muted max-w-2xl text-sm md:text-base text-emerald-900/80">
            Beginning in January 2026, the Yard of the Month program recognizes
            Cypressdale neighbors who go above and beyond with their landscaping,
            curb appeal, and overall care for their homes. It&apos;s a fun way to
            celebrate pride of ownership and keep our community looking vibrant
            and welcoming.
          </p>
        </header>      

        {/* Overview + how it works */}
        <section className="grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)] items-start">
          {/* Left: Overview */}
          <div className="card border border-emerald-100/80 bg-emerald-50/70 backdrop-blur-sm shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-emerald-800">
              <span className="text-lg">🪴</span>
              <h2 className="h2 text-lg">Program overview</h2>
            </div>
            <p className="text-sm text-emerald-900/90">
              Starting in January 2026, each month (season and weather
              permitting), one Cypressdale home will be selected for outstanding
              front yard appearance. The winning yard will be recognized on the
              HOA website and through Cypressdale social media announcements.
            </p>
            <p className="text-sm text-emerald-900/90">
              Selections are made by representatives designated by the HOA. The
              aim isn&apos;t perfection, but neighbors who clearly put care and
              creativity into their landscape.
            </p>
            <ul className="list-disc pl-5 text-sm text-emerald-900/90 space-y-1">
              <li>All occupied homes in good standing are eligible.</li>
              <li>No sign-up is required to be considered.</li>
              <li>Yards are viewed from the street (front yards only).</li>
            </ul>
          </div>

          {/* Right: How it works / criteria */}
          <div className="card border border-lime-100/80 bg-lime-50/80 backdrop-blur-sm shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-emerald-800">
              <span className="text-lg">🌱</span>
              <h2 className="h2 text-lg">How winners are chosen</h2>
            </div>
            <p className="text-sm text-emerald-900/90">
              Exact details may evolve, but selections generally consider:
            </p>
            <ul className="grid gap-2 md:grid-cols-2 text-sm text-emerald-900/90">
              <li className="flex items-start gap-2">
                <span className="mt-[3px] text-emerald-600">•</span>
                <span>
                  <span className="font-semibold">Overall curb appeal</span> – a
                  tidy, inviting yard that enhances the street.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] text-emerald-600">•</span>
                <span>
                  <span className="font-semibold">Maintenance</span> – mowed
                  lawn, trimmed shrubs, and healthy plants.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] text-emerald-600">•</span>
                <span>
                  <span className="font-semibold">Plant selection</span> – use of
                  color, seasonal interest, or thoughtful plant choices.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] text-emerald-600">•</span>
                <span>
                  <span className="font-semibold">Creativity &amp; harmony</span>{' '}
                  – decor and design that fit the home and neighborhood.
                </span>
              </li>
            </ul>
            <p className="text-xs text-emerald-900/70">
              The HOA may adjust criteria, schedule, or recognition details over
              time as the program grows.
            </p>
          </div>
        </section>

        {/* Current winner */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="h2 flex items-center gap-2 text-lg text-emerald-950">
              <span className="text-base">🌼</span>
              <span>Current Yard of the Month</span>
            </h2>
            <span className="text-xs rounded-full bg-emerald-900/10 text-emerald-900 px-3 py-1 border border-emerald-200/80">
              {currentWinner
                ? 'Recognizing this month’s standout yard'
                : 'First selection coming January 2026'}
            </span>
          </div>

          {currentWinner ? (
            <article className="rounded-3xl bg-white/95 border border-emerald-100/90 shadow-md overflow-hidden flex flex-col md:flex-row">
              {currentWinner.photoUrl && (
                <div className="relative h-40 md:h-auto md:w-1/3 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentWinner.photoUrl}
                    alt={currentWinner.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/20 via-transparent to-transparent" />
                </div>
              )}
              <div className="p-5 md:flex-1 space-y-1.5">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1">
                  <span className="text-[13px]">🏆</span>
                  <span>
                    {formatMonth(currentWinner.month) || 'Current winner'}
                  </span>
                </p>
                <h3 className="text-base font-semibold text-emerald-950">
                  {currentWinner.title}
                </h3>
                {currentWinner.streetOrBlock && (
                  <p className="text-xs text-emerald-900/80">
                    {currentWinner.streetOrBlock}
                  </p>
                )}
                {currentWinner.description && (
                  <p className="text-sm text-emerald-900/90 mt-1">
                    {currentWinner.description}
                  </p>
                )}
                <Link
                  href={`/yard-of-the-month/${currentWinner._id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 hover:text-emerald-900 hover:underline mt-2"
                >
                  View photos &amp; details →
                </Link>
              </div>
            </article>
          ) : (
            <div className="rounded-3xl border border-dashed border-emerald-300/70 bg-emerald-50/70 px-4 py-6 text-sm text-emerald-900/80 text-center">
              <p className="font-medium text-emerald-950 mb-1">
                Yard of the Month launching January 2026
              </p>
              <p>
                The program is being finalized. Check back after the first
                selection month to see featured yards from around Cypressdale.
              </p>
            </div>
          )}
        </section>

        {/* Past winners */}
        {pastWinners.length > 0 && (
          <section className="space-y-3">
            <h2 className="h2 text-lg text-emerald-950 flex items-center gap-2">
              <span className="text-base">🌷</span>
              <span>Past winners</span>
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {pastWinners.map((w) => (
                <article
                  key={w._id}
                  className="rounded-3xl bg-white/90 border border-emerald-100/80 shadow-sm overflow-hidden flex flex-col"
                >
                  {w.photoUrl && (
                    <div className="relative h-32 w-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={w.photoUrl}
                        alt={w.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4 space-y-1.5">
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                      {formatMonth(w.month) || 'Past winner'}
                    </p>
                    <h3 className="text-sm font-semibold text-emerald-950">
                      {w.title}
                    </h3>
                    {w.streetOrBlock && (
                      <p className="text-xs text-emerald-900/80">
                        {w.streetOrBlock}
                      </p>
                    )}
                    {w.description && (
                      <p className="text-xs text-emerald-900/90 mt-1 line-clamp-3">
                        {w.description}
                      </p>
                    )}
                    <Link
                      href={`/yard-of-the-month/${w._id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 hover:text-emerald-900 hover:underline mt-2"
                    >
                      View details →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Questions / contact */}
        <section className="card border border-emerald-100/80 bg-emerald-50/80 backdrop-blur-sm space-y-2">
          <h2 className="h2 text-lg text-emerald-950 flex items-center gap-2">
            <span className="text-base">🌻</span>
            <span>Questions about the program?</span>
          </h2>
          <p className="text-sm text-emerald-900/90">
            For general questions about Yard of the Month, please contact the
            HOA using the general email address:
          </p>
          <p className="text-sm">
            <ContactLink role="general" showIcon />
          </p>
        </section>
      </div>
    </div>
  );
}
