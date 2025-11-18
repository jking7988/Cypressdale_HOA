// app/admin/page.tsx
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">
          Admin Dashboard
        </h2>
        <p className="text-sm text-slate-600">
          Quick access to internal tools for the Cypressdale HOA website.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/trash-reminders"
          className="group block rounded-xl border border-emerald-100 bg-white p-4 shadow-sm hover:border-emerald-300 hover:shadow-md"
        >
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            Trash Reminder Signups
          </h3>
          <p className="text-xs text-slate-600 mb-2">
            View all emails subscribed to trash and recycling reminders.
          </p>
          <span className="text-xs font-medium text-emerald-700 group-hover:underline">
            Open &rarr;
          </span>
        </Link>

        {/* future admin cards */}
      </div>
    </div>
  );
}
