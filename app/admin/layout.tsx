// app/admin/layout.tsx
import type { ReactNode } from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Cypressdale Admin
            </h1>
            <p className="text-sm text-slate-600">
              Internal tools for managing the website and resident data.
            </p>
          </div>
          <nav className="flex items-center gap-3 text-xs md:text-sm">
            <Link
              href="/admin"
              className="text-slate-700 hover:text-slate-900"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/trash-reminders"
              className="text-slate-700 hover:text-slate-900"
            >
              Trash signups
            </Link>
          </nav>
        </header>

        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
