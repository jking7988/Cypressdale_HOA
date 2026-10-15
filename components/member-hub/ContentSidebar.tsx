import Link from 'next/link';
import { NewsLetterSignup } from '@/components/NewsLetterSignup';
import { sidebarOptions, type SidebarSettings } from '@/lib/member-hub/sidebar';

export default function ContentSidebar({ kind, settings, className = '' }: {
  kind: string; settings: SidebarSettings; className?: string;
}) {
  const options = sidebarOptions(kind, settings);
  if (!Object.values(options).some(Boolean)) return null;
  return <aside className={`space-y-4 ${className}`}>
    {options.community && <section className="border border-emerald-100 bg-white/95 p-4 rounded-lg">
      <h2 className="text-sm font-semibold text-emerald-900">Community</h2>
      <nav aria-label="Community" className="mt-3 grid gap-3 text-sm text-emerald-800">
        <Link href="/events">Upcoming Events</Link>
        <Link href="/documents">HOA Documents</Link>
        <Link href="/pool">Pool Information</Link>
        <Link href="/homeowners">Homeowners</Link>
      </nav>
    </section>}
    {options.calendar && <section className="border border-emerald-100 bg-white/95 p-4 rounded-lg shadow-sm">
      <h2 className="text-sm font-semibold text-emerald-900">Calendar</h2>
      <p className="mt-2 text-xs text-emerald-800/80">Browse all upcoming events in the full community calendar.</p>
      <Link href="/events" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-800 hover:underline">Open events calendar <span aria-hidden="true">{'->'}</span></Link>
    </section>}
    {options.newsletter && <NewsLetterSignup />}
  </aside>;
}
