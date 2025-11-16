// app/holiday-decorating/page.tsx

import Link from 'next/link';
import { ContactLink } from '@/components/ContactLink';

export const dynamic = 'force-dynamic';

export default function HolidayDecoratingPage() {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-b from-emerald-50 via-emerald-100 to-rose-50">
      {/* Decorative Christmas-style glow */}
      <div className="pointer-events-none fixed inset-0 opacity-50 mix-blend-multiply">
        <div className="absolute -top-10 -left-16 h-56 w-56 rounded-full bg-emerald-200 blur-3xl" />
        <div className="absolute top-24 -right-10 h-40 w-40 rounded-full bg-rose-200 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-sky-100 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-10 space-y-8">
        {/* Header */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-900/85 px-4 py-1 text-xs font-medium text-emerald-50 shadow-sm">
            <span className="text-sm">🎄</span>
            <span className="tracking-[0.18em] uppercase">
              Holiday Decorating
            </span>
            <span className="text-sm">❄️</span>
          </div>

          <h1 className="h1 text-2xl md:text-3xl text-emerald-950 flex flex-wrap items-center gap-2">
            <span>Holiday Decorating Contests</span>
          </h1>

          <p className="muted max-w-2xl text-sm md:text-base text-emerald-950/85">
            Cypressdale is launching annual holiday decorating contests,
            starting with the Christmas 2025 contest. The most festive and
            creative homes will be recognized with 1st, 2nd, and 3rd place
            awards and featured on the HOA website and social media.
          </p>

          <p className="text-xs md:text-sm text-emerald-950/70">
            The Christmas contest begins in 2025. A Halloween decorating
            contest will be added starting in 2026, following a similar
            format each year.
          </p>
        </header>

        {/* Overview + How it works */}
        <section className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)] items-start">
          {/* Overview */}
          <div className="card border border-emerald-100/90 bg-white/95 backdrop-blur-sm shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-emerald-900">
              <span className="text-lg">✨</span>
              <h2 className="h2 text-lg">Program overview</h2>
            </div>
            <p className="text-sm text-emerald-950/90">
              The holiday decorating contests are designed to celebrate the
              season, encourage neighborhood spirit, and recognize residents
              who put extra effort into creating memorable decorations.
            </p>
            <ul className="list-disc pl-5 text-sm text-emerald-950/90 space-y-1">
              <li>Open to occupied homes in good standing within Cypressdale.</li>
              <li>Displays are judged from the street (front yards and fronts of homes only).</li>
              <li>No entry fee. Participation is completely voluntary.</li>
              <li>Winners and photos may be shared on the HOA website and social media.</li>
            </ul>
            <p className="text-xs text-emerald-950/70">
              Specific judging dates, times, and any additional rules or prize
              details will be announced in the News section each year.
            </p>
          </div>

          {/* Awards & recognition */}
          <div className="card border border-rose-100/90 bg-rose-50/90 backdrop-blur-sm shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-rose-900">
              <span className="text-lg">🏆</span>
              <h2 className="h2 text-lg">Awards &amp; recognition</h2>
            </div>
            <p className="text-sm text-rose-950/90">
              Each holiday contest recognizes the top three homes:
            </p>
            <ul className="space-y-1.5 text-sm text-rose-950/90">
              <li>
                <span className="font-semibold">1st Place</span> – Best overall
                display
              </li>
              <li>
                <span className="font-semibold">2nd Place</span> – Outstanding
                display
              </li>
              <li>
                <span className="font-semibold">3rd Place</span> – Honorable
                mention
              </li>
            </ul>
            <p className="text-sm text-rose-950/90">
              Prizes are still being determined and may vary by year. All
              winners will be announced in the News section and featured on the
              HOA website and/or social media.
            </p>
            <p className="text-xs text-rose-950/80">
              Once prize details are finalized, they will be added here and
              included in the annual News announcement.
            </p>
          </div>
        </section>

        {/* Two-column: Christmas (primary) & Halloween (coming next year) */}
        <section className="grid gap-6 md:grid-cols-2 items-start">
          {/* Christmas */}
          <div className="card border border-emerald-200 bg-emerald-50/95 backdrop-blur-sm shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-900">
                <span className="text-lg">🎄</span>
                <h2 className="h2 text-lg">Christmas Decorating Contest</h2>
              </div>
              <span className="rounded-full bg-emerald-900/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-900">
                Now starting 2025
              </span>
            </div>
            <p className="text-sm text-emerald-950/90">
              The Christmas decorating contest celebrates bright lights, classic
              holiday charm, and creative winter themes throughout Cypressdale.
              The first contest begins Christmas 2025 and will be held annually.
            </p>
            <ul className="space-y-1.5 text-sm text-emerald-950/90">
              <li>Judging focuses on overall curb appeal from the street.</li>
              <li>Use of lights, garlands, wreaths, and other outdoor decor.</li>
              <li>Creativity, theme, and cohesiveness of the display.</li>
              <li>Safe, neat, and respectful of neighbors and HOA rules.</li>
            </ul>
            <p className="text-xs text-emerald-950/80">
              Each year&apos;s specific judging dates and any additional
              guidelines will be posted in the News section and may be emailed
              or mailed to residents.
            </p>
          </div>

          {/* Halloween */}
          <div className="card border border-slate-200 bg-slate-50/90 backdrop-blur-sm shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-900">
                <span className="text-lg">🎃</span>
                <h2 className="h2 text-lg">Halloween Decorating Contest</h2>
              </div>
              <span className="rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-900">
                Coming 2026
              </span>
            </div>
            <p className="text-sm text-slate-950/90">
              Beginning in 2026, Cypressdale will host a Halloween decorating
              contest, highlighting spooky, fun, and family-friendly displays.
            </p>
            <ul className="space-y-1.5 text-sm text-slate-950/90">
              <li>Judging focuses on creativity and overall nighttime impact.</li>
              <li>Seasonal themes: spooky, whimsical, or classic fall decor.</li>
              <li>Use of lighting, props, and decorations that are safe and secure.</li>
              <li>Displays should be appropriate for a family neighborhood.</li>
            </ul>
            <p className="text-xs text-slate-950/80">
              As with Christmas, detailed dates and judging windows will be
              shared via the HOA website and communications each year.
            </p>
          </div>
        </section>

        {/* How judging works */}
        <section className="card border border-emerald-100/80 bg-white/95 backdrop-blur-sm shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-900">
            <span className="text-lg">👀</span>
            <h2 className="h2 text-lg">How judging works</h2>
          </div>
          <ul className="space-y-1.5 text-sm text-emerald-950/90">
            <li>
              A committee or representatives designated by the HOA will drive
              the neighborhood during the published judging dates.
            </li>
            <li>
              Homes are viewed from the street only; judges do not enter yards
              or walkways.
            </li>
            <li>
              Decorations should be visible during the published judging
              timeframe (typically evening hours for lighting displays).
            </li>
            <li>
              Winners are selected based on overall impression, creativity,
              theme, and neatness.
            </li>
          </ul>
          <p className="text-xs text-emerald-950/70">
            The HOA may update judging procedures, categories, or criteria as
            the program evolves. Any changes will be noted in the annual News
            announcement.
          </p>
        </section>

        {/* FAQ / Questions */}
        <section className="card border border-emerald-100/80 bg-emerald-50/90 backdrop-blur-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-900">
            <span className="text-lg">❓</span>
            <h2 className="h2 text-lg">Questions about holiday contests?</h2>
          </div>
          <p className="text-sm text-emerald-950/90">
            If you have questions about the Christmas or Halloween decorating
            contests, or need clarification on rules, judging, or eligibility,
            please contact the HOA using the general email address:
          </p>
          <p className="text-sm">
            <ContactLink role="general" showIcon />
          </p>
          <p className="text-xs text-emerald-950/70">
            You can also watch the News section of the website for each year&apos;s
            official announcement, judging dates, and prize information.
          </p>
        </section>

        {/* Optional: link back to Yard of the Month */}
        <div className="text-xs text-emerald-950/70">
          Looking for <span className="font-semibold">Yard of the Month</span>?{' '}
          <Link
            href="/yard-of-the-month"
            className="font-medium text-emerald-900 hover:text-emerald-950 hover:underline"
          >
            View the Yard of the Month program →
          </Link>
        </div>
      </div>
    </div>
  );
}
