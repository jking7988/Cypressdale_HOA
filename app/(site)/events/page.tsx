import { client } from '@/lib/sanity.client';
import { eventsQuery } from '@/lib/queries';
import EventsCalendar from '@/components/EventsCalendar';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const events = await client.fetch(eventsQuery);

  return (
    <div className="space-y-6">
      <h1 className="h1">Community Events</h1>
      <EventsCalendar events={events} />
    </div>
  );
}