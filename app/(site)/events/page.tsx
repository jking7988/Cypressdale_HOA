// app/(site)/events/page.tsx
export const dynamic = 'force-dynamic';

import { client } from '@/lib/sanity.client';
import { eventsQuery } from '@/lib/queries';
import EventsCalendar from '@/components/EventsCalendar';
import { NewsLetterSignup } from '@/components/NewsLetterSignup';

export default async function EventsPage() {
  const events = await client.fetch(eventsQuery);

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

      {/* Main layout: left = calendar + upcoming, right = newsletter */}
      <section className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)] items-start">
        {/* LEFT: always show the calendar (with its built-in upcoming list) */}
        <div>
          <EventsCalendar events={events} />
        </div>

        {/* RIGHT: newsletter signup, like on the News page */}
        <div className="space-y-4">
          <NewsLetterSignup />
        </div>
      </section>
    </div>
  );
}
