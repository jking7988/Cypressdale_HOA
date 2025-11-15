// app/pool/page.tsx
import PoolCalendar from '@/components/PoolCalendar';

export const dynamic = 'force-dynamic';

export default function PoolPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="h1">Cypressdale Pool</h1>
        <p className="muted max-w-2xl">
          Check pool hours, open/closed days, and important rules for using the
          Cypressdale community pool.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)]">
        {/* LEFT: Calendar */}
        <PoolCalendar />

        {/* RIGHT: Info cards */}
        <div className="space-y-4">
          <section className="card space-y-2">
            <h2 className="text-lg font-semibold text-brand-800">
              Pool Hours (Weather Permitting)
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
              This calendar is for convenience only. Final hours and access are
              determined by the Association and management company.
            </p>
          </section>

          <section className="card space-y-2">
            <h2 className="text-lg font-semibold text-brand-800">
              Access & Requirements
            </h2>
            <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
              <li>Pool address: 4815 Elmbrook Drive, Spring, TX 77388</li>
              <li>Must be current on all assessments to receive a pool ID card.</li>
              <li>Pool access is for residents/members; guest rules may apply.</li>
              <li>All users must follow posted pool rules at all times.</li>
            </ul>
            <a
              href="https://swimmingpoolpasses.net/cypressdale/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-sm text-accent-700 hover:underline"
            >
              Get or manage your pool pass →
            </a>
          </section>

          <section className="card space-y-2">
            <h2 className="text-lg font-semibold text-brand-800">
              Pool Rules
            </h2>
            <p className="text-sm text-gray-700">
              For everyone&apos;s safety and enjoyment, please review the current
              Cypressdale pool rules before visiting.
            </p>
            <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
              <li>No running or excessive horseplay.</li>
              <li>No glass items in the pool area.</li>
              <li>Children 8 and under must be accompanied by an adult.</li>
              <li>Swimsuits only—no cutoffs or street clothes in the water.</li>
            </ul>
            {/* Replace with your actual file URLs once uploaded to the site */}
            <div className="flex flex-wrap gap-2 mt-2">
              <a
                href="/docs/Pool-Info-Sheet-Cypressdale.pdf"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent-700 hover:underline"
              >
                View Pool Information Sheet (PDF)
              </a>
              <a
                href="/docs/2022-Cypressdale-Pool-Rules.pdf"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent-700 hover:underline"
              >
                View Full Pool Rules (PDF)
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

