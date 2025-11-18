import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NewResidentsPage() {
  return (
    <div className="relative min-h-screen">
      {/* Fullscreen background image */}
      <div
        className="fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/new-resident.png')" }}
      />

      {/* Gradient overlay for readability */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-emerald-50/50 via-sky-50/90 to-emerald-50/50" />

      {/* Page content */}
      <div className="relative mx-auto max-w-5xl px-4 py-10 space-y-8">
        {/* Celebrated welcome banner */}
        <section className="rounded-3xl border border-amber-100 bg-amber-50/90 shadow-sm px-4 py-4 flex gap-3 items-start">
          <span className="text-2xl" aria-hidden="true">
            🎉
          </span>
          <div className="space-y-1">
            <p className="text-sm md:text-base font-semibold text-amber-900">
              Welcome to the neighborhood!
            </p>
            <p className="text-xs md:text-sm text-amber-900/85">
              We&apos;re glad you chose Cypressdale. This guide will walk you through
              the first things to set up so you can settle in quickly and enjoy
              your new home.
            </p>
          </div>
        </section>

        {/* Header */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-900/90 px-4 py-1 text-xs font-medium text-emerald-50 shadow-sm">
            <span>👋</span>
            <span className="tracking-[0.18em] uppercase">
              Welcome to Cypressdale
            </span>
          </div>

          <h1 className="h1 text-2xl md:text-3xl text-emerald-950">
            New Resident Guide
          </h1>

          <p className="muted max-w-2xl text-sm md:text-base text-emerald-900/80">
            Just moved in? This page walks you through the basics of getting
            set up in Cypressdale—utilities, trash and recycling, HOA contact
            info, and where to find important community resources.
          </p>
        </header>

        {/* First steps */}
        <section className="card border border-emerald-100/80 bg-white/90 backdrop-blur-sm space-y-3">
          <h2 className="h2 text-lg text-emerald-950 flex items-center gap-2">
            <span>📝</span>
            <span>First steps after moving in</span>
          </h2>
          <p className="text-sm text-emerald-900/90">
            Before you move in, we recommend taking care of the
            following:
          </p>
          <ol className="list-decimal pl-5 text-sm text-emerald-900/90 space-y-1.5">
            <li>
              Set up your{' '}
              <span className="font-semibold">water service</span> with
              Cypresswood Utility District.
            </li>
            <li>
              Set up{' '}
              <span className="font-semibold">trash and recycling</span> service
              with Texas Pride Disposal.
            </li>
            <li>
              Review the{' '}
              <span className="font-semibold">HOA documents</span> and
              community guidelines.
            </li>
            <li>
              Get connected to our{' '}
              <span className="font-semibold">website</span> and{' '}
              <span className="font-semibold">Facebook group</span> for updates.
            </li>
          </ol>
          <p className="text-xs text-emerald-900/70">
            If you have any questions or are unsure where to start, please
            contact the HOA using the information on the About or Contact page.
          </p>
        </section>

        {/* Water */}
        <section className="card border border-sky-100/80 bg-sky-50/90 backdrop-blur-sm space-y-3">
          <h2 className="h2 text-lg text-sky-950 flex items-center gap-2">
            <span>💧</span>
            <span>Water service – Cypresswood Utility District</span>
          </h2>
          <p className="text-sm text-sky-950/90">
            Water and sewer service for Cypressdale is provided through{' '}
            <span className="font-semibold">Cypresswood Utility District</span>.
            New residents will typically need to set up an account in their
            name and update billing information.
          </p>
          <ul className="list-disc pl-5 text-sm text-sky-950/90 space-y-1">
            <li>Set up or transfer your water/sewer account.</li>
            <li>Update billing and contact information.</li>
            <li>Review procedures for leaks, outages, or emergencies.</li>
          </ul>
          <p className="text-sm text-sky-950/90">
            You can find contact information, forms, and online resources here:
          </p>
          <p className="text-sm">
            <a
              href="https://www.inframark.com/utility-district/cypresswood-utility-district-3/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sky-900 hover:text-sky-950 hover:underline"
            >
              <span>Visit Cypresswood Utility District page</span>
              <span>↗</span>
            </a>
          </p>
          <p className="text-xs text-sky-950/85">
            If you’re unsure which forms you need, you can contact Cypresswood
            Utility District directly or reach out to the HOA for guidance.
          </p>
        </section>

        {/* Trash & Recycling */}
        <section className="card border border-emerald-100/80 bg-emerald-50/90 backdrop-blur-sm space-y-3">
          <h2 className="h2 text-lg text-emerald-950 flex items-center gap-2">
            <span>🗑️</span>
            <span>Trash &amp; recycling – Texas Pride Disposal</span>
          </h2>

          <p className="text-sm text-emerald-900/90">
            Household trash and recycling collection in Cypressdale is provided
            by <span className="font-semibold">Texas Pride Disposal</span>.  
            Service days and specific guidelines may vary, but generally include:
          </p>

          <ul className="list-disc pl-5 text-sm text-emerald-900/90 space-y-1">
            <li>Regular trash pickup on designated days.</li>
            <li>Separate recycling collection for approved materials.</li>
            <li>Information on bulk pickup and holiday schedules.</li>
          </ul>

          <div className="space-y-1">
            <p className="text-sm">
              <a
                href="https://www.texaspridedisposal.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-emerald-900 hover:text-emerald-950 hover:underline"
              >
                <span>Visit Texas Pride Disposal website</span>
                <span>↗</span>
              </a>
            </p>

            <p className="text-sm">
              <a
                href="https://www.texaspridedisposal.com/contact#new-account-new-move-in"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-emerald-900 hover:text-emerald-950 hover:underline"
              >
                <span>New Account / Move-In Setup Form</span>
                <span>↗</span>
              </a>
            </p>
          </div>

          <p className="text-xs text-emerald-950/85">
            Please refer to Texas Pride Disposal&apos;s service guide for Cypressdale for
            the official schedule, list of accepted materials, and how to request new
            carts or report missed pickups.
          </p>
        </section>

        {/* HOA & documents */}
        <section className="card border border-emerald-100/80 bg-white/90 backdrop-blur-sm space-y-3">
          <h2 className="h2 text-lg text-emerald-950 flex items-center gap-2">
            <span>🏡</span>
            <span>HOA information &amp; community rules</span>
          </h2>
          <p className="text-sm text-emerald-900/90">
            Cypressdale is a deed-restricted community. New residents should
            review the governing documents and any current policies so you know
            what&apos;s expected and how to stay in good standing.
          </p>
          <ul className="list-disc pl-5 text-sm text-emerald-900/90 space-y-1">
            <li>
              Visit the{' '}
              <Link
                href="/documents"
                className="text-emerald-900 underline-offset-2 hover:underline"
              >
                Documents
              </Link>{' '}
              page for bylaws, deed restrictions, and other official documents.
            </li>
            <li>
              Check the{' '}
              <Link
                href="/pool"
                className="text-emerald-900 underline-offset-2 hover:underline"
              >
                Pool
              </Link>{' '}
              page for pool rules, access information, and hours.
            </li>
            <li>
              Watch the{' '}
              <Link
                href="/news"
                className="text-emerald-900 underline-offset-2 hover:underline"
              >
                News
              </Link>{' '}
              and{' '}
              <Link
                href="/events"
                className="text-emerald-900 underline-offset-2 hover:underline"
              >
                Events
              </Link>{' '}
              pages for current announcements.
            </li>
          </ul>
        </section>

        {/* Stay connected – light, high-contrast card */}
        <section className="card border border-emerald-100/80 bg-white/95 backdrop-blur-sm space-y-3">
          <h2 className="h2 text-lg flex items-center gap-2 text-emerald-950">
            <span>🌐</span>
            <span>Stay connected</span>
          </h2>

          <p className="text-sm text-emerald-900/95">
            We encourage new residents to stay plugged in so you don&apos;t miss
            important updates or fun community happenings.
          </p>

          <ul className="list-disc pl-5 text-sm text-emerald-900/95 space-y-1">
            <li>
              Bookmark this website and check{' '}
              <Link
                href="/news"
                className="font-semibold text-emerald-900 underline underline-offset-2 hover:text-emerald-950"
              >
                News
              </Link>{' '}
              and{' '}
              <Link
                href="/events"
                className="font-semibold text-emerald-900 underline underline-offset-2 hover:text-emerald-950"
              >
                Events
              </Link>{' '}
              regularly.
            </li>
            <li>
              Join the Cypressdale Facebook group for informal updates and
              neighbor discussions.
            </li>
            <li>
              Reach out to the HOA if you have questions about rules, approvals,
              or anything you&apos;re unsure about.
            </li>
          </ul>
        </section>

        {/* Back link */}
        <div className="text-xs text-emerald-900/80">
          <Link
            href="/"
            className="font-medium text-emerald-800 hover:text-emerald-900 hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
