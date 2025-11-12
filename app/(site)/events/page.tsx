import { client } from '@/lib/sanity.client';
import { eventsQuery } from '@/lib/queries';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const events = await client.fetch(eventsQuery);
  return (
    <div className="space-y-6">
      <h1 className="h1">Events</h1>
      <div className="grid gap-4">
        {events.map((e: any) => (
          <div key={e._id} className="card">
            <h2 className="text-xl font-semibold">{e.title}</h2>
            <p className="muted">{format(new Date(e.start), 'PPP p')} {e.end ? `– ${format(new Date(e.end), 'p')}` : ''}</p>
            {e.location && <p>{e.location}</p>}
            {e.description && <p className="mt-2">{e.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
