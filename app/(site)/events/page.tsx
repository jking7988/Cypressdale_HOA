// app/(site)/events/page.tsx
export const dynamic = 'force-dynamic';

import { getPublicContent } from '@/lib/member-hub/public-content';
import EventsCalendar from '@/components/EventsCalendar';
import { NewsLetterSignup } from '@/components/NewsLetterSignup';
import type { CommunityEvent } from '@/lib/member-hub/event-list';

export default async function EventsPage() {
  const events = await getPublicContent<CommunityEvent>('event');

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
        <div>
          <h1 className="h1 flex items-center gap-2">
            <span>Community Events</span>
            {events.length > 0 && (
              <span className="text-[11px] rounded-full bg-sky-100 text-sky-800 px-2 py-0.5">
                {events.length} event{events.length === 1 ? '' : 's'}
              </span>
            )}
          </h1>
          <p className="muted text-sm mt-1">
            Neighborhood gatherings, HOA meetings, and special activities happening in
            Cypressdale.
          </p>
        </div>
      </header>

      <EventsCalendar events={events} now={new Date().toISOString()} />
      <section className="border-t border-emerald-900/20 pt-8">
        <div className="max-w-xl"><NewsLetterSignup /></div>
      </section>
    </div>
  );
}
