'use client';

import Link from 'next/link';
import PoolCalendar, { getPoolInfo } from '@/components/PoolCalendar';
import {
  Waves,
  SunMedium,
  CalendarDays,
  Clock,
  KeyRound,
  Ruler,
  CreditCard,
  FolderOpen,
  Info,
  Droplets,
  Ban,
  Users,
  Baby,
  CheckCircle2,
  XCircle,
  Cloudy,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function PoolPage() {
  const now = new Date();
  const month = now.getMonth(); // 0–11
  const inPoolSeason = month >= 4 && month <= 8; // May–Sept

  const todayInfo = getPoolInfo(now);

  const todayPillText = !todayInfo.inSeason
    ? 'Pool is closed today (outside pool season).'
    : todayInfo.isOpen
    ? `Open today${todayInfo.hours ? ` · ${todayInfo.hours}` : ''}`
    : 'Closed today (see calendar for next open day).';

  const todayPillClasses = !todayInfo.inSeason
    ? 'border-gray-200 bg-gray-50 text-gray-700'
    : todayInfo.isOpen
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border-rose-200 bg-rose-50 text-rose-800';

  const TodayIcon = !todayInfo.inSeason
    ? CalendarDays
    : todayInfo.isOpen
    ? CheckCircle2
    : XCircle;

  const SeasonIcon = inPoolSeason ? SunMedium : Cloudy;

  return (
    <>
      <div className="relative min-h-screen">
        {/* FULL-SCREEN BACKGROUND IMAGE */}
        <div
          className="fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/pool.jpg')",
            backgroundAttachment: 'fixed',
          }}
        />
        {/* Slightly dark overlay so text pops */}
        <div className="fixed inset-0 -z-10 bg-black/25 backdrop-blur-sm" />

        {/* Page content */}
        <div className="relative space-y-8 px-4 md:px-6 py-6">
          {/* Header with gradient & hero feel */}
          <header className="space-y-4 rounded-2xl bg-gradient-to-r from-sky-50/95 via-cyan-50/95 to-emerald-50/95 border border-sky-100 px-4 py-6 md:px-8 md:py-8 shadow-sm text-center flex flex-col items-center hover:-translate-y-0.5 hover:shadow-md transition">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/90 text-accent-700 border border-accent-200 px-4 py-1.5 text-[12px] md:text-xs font-semibold uppercase tracking-[0.18em] shadow-sm">
              <Waves className="w-3.5 h-3.5" />
              <span>Community Pool</span>
            </div>

            <h1 className="h1 flex flex-wrap items-center justify-center gap-3 text-3xl md:text-4xl leading-tight">
              <span>Cypressdale Pool</span>
              <SunMedium className="w-8 h-8 md:w-10 md:h-10 animate-float-slow text-amber-500" />
            </h1>

            <p className="muted max-w-2xl text-[15px] md:text-base">
              Relax, cool off, and connect with your neighbors at the
              Cypressdale community pool. Check the calendar, review the rules,
              and get ready for a great day in the sun.
            </p>

            {/* Seasonal status banner */}
            <div
              className={`flex items-center gap-2 text-[13px] md:text-sm font-medium rounded-xl px-4 py-2 max-w-xl ${
                inPoolSeason
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-gray-50 text-gray-600 border border-gray-200'
              }`}
            >
              <SeasonIcon className="w-4 h-4" />
              <span>
                {inPoolSeason
                  ? 'Pool season is currently active. Check the calendar for open days and hours.'
                  : 'The pool is currently closed for the season. Check back closer to summer for updated dates.'}
              </span>
            </div>

            {/* Today at the pool pill */}
            <div className="mt-1">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] md:text-sm font-medium ${todayPillClasses}`}
              >
                <TodayIcon className="w-4 h-4" />
                <span>{todayPillText}</span>
              </span>
            </div>
          </header>

          {/* Know before you go strip */}
          <section className="grid gap-3 md:grid-cols-3">
            <div className="card flex flex-col gap-2 hover:-translate-y-0.5 hover:shadow-md transition">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-700" />
                <span className="text-base md:text-lg font-semibold text-brand-800">
                  Who can use the pool?
                </span>
              </div>
              <p className="text-sm md:text-[15px] text-gray-600">
                Cypressdale residents and their guests with a valid pool pass
                and current assessments.
              </p>
            </div>

            <div className="card flex flex-col gap-2 hover:-translate-y-0.5 hover:shadow-md transition">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-700" />
                <span className="text-base md:text-lg font-semibold text-brand-800">
                  What should I bring?
                </span>
              </div>
              <ul className="text-sm md:text-[15px] text-gray-600 space-y-1">
                <li className="flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-brand-700" />
                  <span>Pool pass or access card</span>
                </li>
                <li className="flex items-center gap-2">
                  <SunMedium className="w-3.5 h-3.5 text-amber-500" />
                  <span>Sunscreen</span>
                </li>
                <li className="flex items-center gap-2">
                  <Droplets className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Swimsuit & towel</span>
                </li>
                <li className="flex items-center gap-2">
                  <Ban className="w-3.5 h-3.5 text-rose-500" />
                  <span>No glass or alcohol</span>
                </li>
              </ul>
            </div>

            <div className="card flex flex-col gap-2 hover:-translate-y-0.5 hover:shadow-md transition">
              <div className="flex items-center gap-2">
                <Baby className="w-4 h-4 text-brand-700" />
                <span className="text-base md:text-lg font-semibold text-brand-800">
                  Little swimmers
                </span>
              </div>
              <p className="text-sm md:text-[15px] text-gray-600">
                Children 8 and under must be accompanied by an adult. Coast
                Guard–approved flotation devices only.
              </p>
            </div>
          </section>

          <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)] items-start">
            {/* LEFT: Calendar, wrapped in a card */}
            <section className="card space-y-3 border border-emerald-100 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-emerald-800" />
                  <h2 className="text-base md:text-lg font-semibold text-emerald-900">
                    Pool schedule & status
                  </h2>
                </div>
                <p className="text-[11px] md:text-xs text-gray-500">
                  Weather & maintenance may affect availability.
                </p>
              </div>

              <div className="border-t border-emerald-100 pt-3">
                <PoolCalendar />
              </div>
            </section>

            {/* RIGHT: Info cards (unchanged) */}
            <div className="space-y-4">
              {/* Hours */}
              <section className="card space-y-2 border border-emerald-50 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-800" />
                  <h2 className="text-lg md:text-xl font-semibold text-brand-800">
                    Pool Hours (Weather Permitting)
                  </h2>
                </div>
                <p className="text-sm md:text-[15px] text-gray-700">
                  Hours may vary by season. Please refer to your most recent
                  pool notice for exact dates and times.
                </p>
                <ul className="text-sm md:text-[15px] text-gray-700 list-disc list-inside space-y-1">
                  <li>
                    Closed on Mondays for cleaning (except certain holidays).
                  </li>
                  <li>Open most days between late May and early September.</li>
                  <li>
                    Pool will close during thunder or lightning in the area.
                  </li>
                </ul>
                <p className="text-xs md:text-[13px] text-gray-500 mt-2">
                  This calendar is for convenience only. Final hours and access
                  are determined by the Association and management company.
                </p>
              </section>

              {/* Access & requirements */}
              <section className="card space-y-2 border border-emerald-50 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-brand-800" />
                  <h2 className="text-lg md:text-xl font-semibold text-brand-800">
                    Access & Requirements
                  </h2>
                </div>
                <ul className="text-sm md:text-[15px] text-gray-700 list-disc list-inside space-y-1">
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
                  className="inline-flex items-center text-sm md:text-[15px] text-accent-700 hover:underline gap-1 mt-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Get or manage your pool pass</span>
                  <span>→</span>
                </a>
              </section>

              {/* Rules + link to documents page */}
              <section className="card space-y-2 border border-emerald-50 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition">
                <div className="flex items-center gap-2">
                  <Ruler className="w-5 h-5 text-brand-800" />
                  <h2 className="text-lg md:text-xl font-semibold text-brand-800">
                    Pool Rules
                  </h2>
                </div>
                <p className="text-sm md:text-[15px] text-gray-700">
                  We want the pool to be fun, relaxing, and safe for everyone.
                  Please help us by following these guidelines while you enjoy
                  the water.
                </p>
                <ul className="text-sm md:text-[15px] text-gray-700 list-disc list-inside space-y-1">
                  <li>No running or excessive horseplay.</li>
                  <li>No glass items in the pool area.</li>
                  <li>Children 8 and under must be accompanied by an adult.</li>
                  <li>Swimsuits only—no cutoffs or street clothes in the water.</li>
                </ul>
                <div className="mt-3">
                  <Link
                    href="/documents"
                    className="text-xs md:text-[13px] text-accent-700 hover:underline inline-flex items-center gap-1"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>View all pool documents on the Documents page</span>
                    <span>→</span>
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* Custom animation for subtle float on the sun icon */}
      <style jsx global>{`
        @keyframes float-slow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        .animate-float-slow {
          animation: float-slow 6s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
