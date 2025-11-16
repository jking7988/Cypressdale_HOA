// app/yard-of-the-month/page.tsx
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
  // ✅ NOTE: this uses yardWinnersQuery, which has NO $id
  const winners = await client.fetch<YardWinner[]>(yardWinnersQuery);

  const currentWinner = winners[0] ?? null;
  const pastWinners = winners.slice(1);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <header className="space-y-2">
        <h1 className="h1">Yard of the Month</h1>
        <p className="muted max-w-2xl">
          The Yard of the Month program recognizes Cypressdale homeowners who
          go above and beyond in maintaining beautiful, welcoming front yards
          and curb appeal.
        </p>
      </header>

      {/* Intro + how it works */}
      <section className="grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)] items-start">
        {/* Left: Overview */}
        <div className="card space-y-3">
          <h2 className="h2 text-lg">Program overview</h2>
          <p className="text-sm text-gray-700">
            Yard of the Month is a friendly community recognition program. Each
            month, one home will be selected for outstanding landscaping,
            overall appearance, and contribution to the charm of Cypressdale.
          </p>
          <p className="text-sm text-gray-700">
            The goal is to celebrate pride of ownership, encourage upkeep, and
            highlight the residents who help make our neighborhood look its
            best.
          </p>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            <li>One winner selected each month (weather and season permitting).</li>
            <li>Winners may receive a small prize and/or recognition sign.</li>
            <li>Selections are made by representatives designated by the HOA.</li>
          </ul>
        </div>

        {/* Right: How it works */}
        <div className="card space-y-3">
          <h2 className="h2 text-lg">How it works</h2>
          <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
            <li>
              <span className="font-semibold">No sign-up required.</span>{' '}
              All occupied homes in good standing are automatically eligible.
            </li>
            <li>
              <span className="font-semibold">Judging is monthly.</span>{' '}
              Yards are viewed from the street; back yards are not considered.
            </li>
            <li>
              <span className="font-semibold">Covenant compliance matters.</span>{' '}
              Homes must be in general compliance with HOA rules to be selected.
            </li>
            <li>
              <span className="font-semibold">Winners are recognized.</span>{' '}
              The HOA may list winners on this website and place a temporary
              Yard of the Month sign at the property.
            </li>
          </ol>
          <p className="text-xs text-gray-500">
            The HOA may adjust criteria, prizes, or schedule over time as the
            program evolves.
          </p>
        </div>
      </section>

      {/* Judging criteria */}
      <section className="card space-y-3">
        <h2 className="h2 text-lg">Judging criteria</h2>
        <p className="text-sm text-gray-700">
          Exact criteria may be adjusted as the program is refined, but
          selections generally consider:
        </p>
        <ul className="grid gap-2 md:grid-cols-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="mt-[3px] text-emerald-600">•</span>
            <span>
              <span className="font-semibold">Overall curb appeal</span> – neat,
              tidy, and inviting appearance from the street.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-[3px] text-emerald-600">•</span>
            <span>
              <span className="font-semibold">Maintenance</span> – mowed lawn,
              trimmed shrubs, and well-cared-for beds.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-[3px] text-emerald-600">•</span>
            <span>
              <span className="font-semibold">Plant selection</span> – use of
              flowers, shrubs, trees, or seasonal color (where practical).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-[3px] text-emerald-600">•</span>
            <span>
              <span className="font-semibold">Creativity</span> – tasteful
              design, accents, or decor that enhance the home and fit the
              neighborhood.
            </span>
          </li>
        </ul>
        <p className="text-xs text-gray-500">
          The HOA reserves the right to modify criteria, pause the program
          during extreme weather, or update rules as needed.
        </p>
      </section>

      {/* Current winner */}
      <section className="card space-y-3">
        <h2 className="h2 text-lg">Current winner</h2>
        {currentWinner ? (
          <article className="rounded-2xl border border-emerald-100 bg-white/90 shadow-md overflow-hidden flex flex-col md:flex-row">
            {currentWinner.photoUrl && (
              <div className="relative h-40 md:h-auto md:w-1/3 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentWinner.photoUrl}
                  alt={currentWinner.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="p-4 space-y-1 md:flex-1">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                {formatMonth(currentWinner.month) || 'Month not set'}
              </p>
              <h3 className="text-sm font-semibold text-emerald-900">
                {currentWinner.title}
              </h3>
              {currentWinner.streetOrBlock && (
                <p className="text-xs text-gray-600">
                  {currentWinner.streetOrBlock}
                </p>
              )}
              {currentWinner.description && (
                <p className="text-xs text-gray-700 mt-1">
                  {currentWinner.description}
                </p>
              )}
              <Link
                href={`/yard-of-the-month/${currentWinner._id}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline mt-2"
              >
                View details &amp; past winners →
              </Link>
            </div>
          </article>
        ) : (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 px-4 py-6 text-sm text-gray-600 text-center">
            <p className="font-medium text-emerald-900 mb-1">
              Winners coming soon
            </p>
            <p>
              The Yard of the Month program is being finalized. Check back after
              the first selection month to see the latest featured yards.
            </p>
          </div>
        )}
      </section>

      {/* Past winners */}
      {pastWinners.length > 0 && (
        <section className="card space-y-3">
          <h2 className="h2 text-lg">Past winners</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pastWinners.map((w) => (
              <article
                key={w._id}
                className="rounded-2xl border border-emerald-100 bg-white/90 shadow-md overflow-hidden flex flex-col"
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
                <div className="p-4 space-y-1">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                    {formatMonth(w.month) || 'Month not set'}
                  </p>
                  <h3 className="text-sm font-semibold text-emerald-900">
                    {w.title}
                  </h3>
                  {w.streetOrBlock && (
                    <p className="text-xs text-gray-600">{w.streetOrBlock}</p>
                  )}
                  {w.description && (
                    <p className="text-xs text-gray-700 mt-1 line-clamp-3">
                      {w.description}
                    </p>
                  )}
                  <Link
                    href={`/yard-of-the-month/${w._id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline mt-2"
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
      <section className="card space-y-2">
        <h2 className="h2 text-lg">Questions about the program?</h2>
        <p className="text-sm text-gray-700">
          For general questions about Yard of the Month, please contact the HOA
          using the general email address:
        </p>
        <p className="text-sm">
          <ContactLink role="general" showIcon />
        </p>
      </section>
    </div>
  );
}
