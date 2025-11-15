// app/pool/page.tsx
import Link from 'next/link';
import PoolCalendar from '@/components/PoolCalendar';

export const dynamic = 'force-dynamic';

export default function PoolPage() {
  const now = new Date();
  const month = now.getMonth(); // 0–11
  const inPoolSeason = month >= 4 && month <= 8; // May–Sept

  return (
    <div className="relative min-h-screen">
      {/* FULL-SCREEN BACKGROUND IMAGE */}
      <div
        className="fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/pool.jpg')",
          backgroundAttachment: 'fixed',
        }}
      />
      {/* Soft overlay so text stays readable */}
      <div className="fixed inset-0 -z-10 bg-white/80 backdrop-blur-sm" />

      {/* Page content (stays inside your normal layout width) */}
      <div className="relative space-y-8 px-4 md:px-6 py-6">
        {/* Header with gradient & hero feel */}
        <header className="space-y-4 rounded-2xl bg-gradient-to-r from-sky-50 via-cyan-50 to-emerald-50 border border-sky-100 px-4 py-5 md:px-6 md:py-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 text-accent-700 border border-accent-200 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] shadow-sm">
            <span>🌊</span>
            <span>Community Pool</span>
          </div>

          <h1 className="h1 flex flex-wrap items-center gap-2">
            <span>Cypressdale Pool</span>
            <span className="text-2xl md:text-3xl">☀️</span>
          </h1>

          <p className="muted max-w-2xl text-sm">
            Relax, cool off, and connect with your neighbors at the Cypressdale
            community pool. Check the calendar, review the rules, and get ready
            for a great day in the sun.
          </p>

          {/* Seasonal status banner */}
          <div
            className={`flex items-center gap-2 text-xs font-medium rounded-xl px-3 py-2 max-w-xl ${
              inPoolSeason
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-gray-50 text-gray-600 border border-gray-200'
            }`}
          >
            <span>{inPoolSeason ? '🏊‍♀️' : '🍂'}</span>
            <span>
              {inPoolSeason
                ? 'Pool season is currently active. Check the calendar for open days and hours.'
                : 'The pool is currently closed for the season. Check back closer to summer for updated dates.'}
            </span>
          </div>
        </header>

        {/* Know before you go strip */}
        <section className="grid gap-3 md:grid-cols-3">
          <div className="card flex flex-col gap-1">
            <span className="text-sm font-semibold text-brand-800">
              Who can use the pool?
            </span>
            <p className="text-xs text-gray-600">
              Cypressdale residents and their guests with a valid pool pass and
              current assessments.
            </p>
          </div>
          <div className="card flex flex-col gap-1">
            <span className="text-sm font-semibold text-brand-800">
              What should I bring?
            </span>
            <p className="text-xs text-gray-600">
              Pool pass or access card, towels, and sunscreen. Please leave
              glass and alcohol at home.
            </p>
          </div>
          <div className="card flex flex-col gap-1">
            <span className="text-sm font-semibold text-brand-800">
              Little swimmers
            </span>
            <p className="text-xs text-gray-600">
              Children 8 and under must be accompanied by an adult. Coast
              Guard–approved flotation devices only.
            </p>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)] items-start">
          {/* LEFT: Calendar, wrapped in a card */}
          <section className="card space-y-3 border border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
                <span>📅</span>
                <span>Pool schedule & status</span>
              </h2>
              <p className="text-[11px] text-gray-500">
                Weather & maintenance may affect availability.
              </p>
            </div>

            <div className="border-t border-emerald-100 pt-3">
              <PoolCalendar />
            </div>
          </section>

          {/* RIGHT: Info cards */}
          <div className="space-y-4">
            {/* Hours */}
            <section className="card space-y-2 border border-emerald-50 shadow-sm">
              <h2 className="text-lg font-semibold text-brand-800 flex items-center gap-2">
                <span>🕒</span>
                <span>Pool Hours (Weather Permitting)</span>
              </h2>
              <p className="text-sm text-gray-700">
                Hours may vary by season. Please refer to your most recent pool
                notice for exact dates and times.
              </p>
              <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                <li>Closed on Mondays for cleaning (except certain holidays).</li>
                <li>Open most days between late May and early September.</li>
                <li>Pool will close during thunder or lightning in the area.</li>
              </ul>
              <p className="text-xs text-gray-500 mt-2">
                This calendar is for convenience only. Final hours and access
                are determined by the Association and management company.
              </p>
            </section>

            {/* Access & requirements */}
            <section className="card space-y-2 border border-emerald-50 shadow-sm">
              <h2 className="text-lg font-semibold text-brand-800 flex items-center gap-2">
                <span>🔑</span>
                <span>Access & Requirements</span>
              </h2>
              <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                <li>
                  Pool address:{' '}
                  <span className="font-medium">
                    4815 Elmbrook Drive, Spring, TX 77388
                  </span>
                </li>
                <li>
                  Must be current on all assessments to receive a pool ID card
                  or access device.
                </li>
                <li>
                  A pool access card/device is required to enter the facility
                  and will not allow access when the pool is scheduled closed.
                </li>
                <li>
                  Pool access is for residents/members; guest rules may apply.
                </li>
                <li>All users must follow posted pool rules at all times.</li>
              </ul>
              <a
                href="https://swimmingpoolpasses.net/cypressdale/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-sm text-accent-700 hover:underline gap-1 mt-2"
              >
                <span>💳</span>
                <span>Get or manage your pool pass</span>
                <span>→</span>
              </a>
            </section>

            {/* Rules + link to documents page */}
            <section className="card space-y-2 border border-emerald-50 shadow-sm">
              <h2 className="text-lg font-semibold text-brand-800 flex items-center gap-2">
                <span>📏</span>
                <span>Pool Rules</span>
              </h2>
              <p className="text-sm text-gray-700">
                We want the pool to be fun, relaxing, and safe for everyone.
                Please help us by following these guidelines while you enjoy
                the water.
              </p>
              <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                <li>No running or excessive horseplay.</li>
                <li>No glass items in the pool area.</li>
                <li>Children 8 and under must be accompanied by an adult.</li>
                <li>Swimsuits only—no cutoffs or street clothes in the water.</li>
              </ul>
              <div className="mt-3">
                <Link
                  href="/documents"
                  className="text-xs text-accent-700 hover:underline inline-flex items-center gap-1"
                >
                  <span>📂</span>
                  <span>View all pool documents on the Documents page</span>
                  <span>→</span>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
