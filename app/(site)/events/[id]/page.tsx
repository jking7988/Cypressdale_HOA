// app/(site)/events/[id]/page.tsx (or similar)
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { groq } from 'next-sanity';
import { client } from '@/lib/sanity.client';
import { CalendarDays, MapPin, Users, FileText } from 'lucide-react';

const eventByIdQuery = groq`
  *[_type == "event" && _id == $id][0]{
    _id,
    title,
    description,
    location,
    startDate,
    endDate,
    rsvpYes,
    rsvpMaybe,
    "flyerUrl": flyer.asset->url,
    "flyerMime": flyer.asset->mimeType,
    "flyerName": flyer.asset->originalFilename
  }
`;

type Event = {
  _id: string;
  title: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  rsvpYes?: number;
  rsvpMaybe?: number;
  flyerUrl?: string;
  flyerMime?: string;
  flyerName?: string;
};

// params is a Promise in this Next.js version
type Props = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateRange(start?: string, end?: string) {
  if (!start) return 'Date TBA';
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return 'Date TBA';

  const startStr = s.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  if (!end) return startStr;

  const e = new Date(end);
  if (Number.isNaN(e.getTime())) return startStr;

  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate();

  const endStr = e.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return sameDay ? `${startStr} – ${endStr}` : `${startStr} → ${e.toLocaleString()}`;
}

export default async function EventDetailPage(props: Props) {
  const { id } = await props.params;

  if (!id) {
    return notFound();
  }

  const event: Event | null = await client.fetch(eventByIdQuery, {
    id,
  });

  if (!event) {
    return notFound();
  }

  const dateLabel = formatDateRange(event.startDate, event.endDate);
  const goingCount = event.rsvpYes ?? 0;
  const maybeCount = event.rsvpMaybe ?? 0;

  return (
    <div className="relative min-h-[calc(100vh-5rem)] bg-gradient-to-b from-emerald-50 via-sky-50 to-emerald-50">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 opacity-40 mix-blend-multiply">
        <div className="absolute -top-12 -left-10 h-40 w-40 rounded-full bg-emerald-200 blur-3xl" />
        <div className="absolute top-24 -right-10 h-36 w-36 rounded-full bg-sky-200 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-lime-200 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 py-10 space-y-4">
        {/* Back link */}
        <div className="mb-1">
          <Link
            href="/events"
            className="inline-flex items-center gap-1 text-xs text-emerald-800 hover:text-emerald-900 hover:underline"
          >
            <span>←</span>
            <span>Back to all events</span>
          </Link>
        </div>

        <article className="rounded-3xl bg-white/95 border border-emerald-100 shadow-[0_20px_50px_rgba(15,118,110,0.2)] backdrop-blur-sm px-5 py-6 md:px-8 md:py-7 space-y-6">
          {/* Header / masthead */}
          <header className="space-y-3 border-b border-emerald-100 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-900/90 px-3 py-1 text-[11px] font-semibold text-emerald-50 uppercase tracking-[0.18em] shadow-sm">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>Community Event</span>
                </div>
                <h1 className="text-xl md:text-2xl font-semibold leading-snug text-emerald-950">
                  {event.title}
                </h1>
              </div>

            {/* Meta pill row */}
            <div className="flex flex-col items-start md:items-end gap-1 text-[11px] md:text-xs">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-emerald-900">
                <CalendarDays className="h-3.5 w-3.5 text-emerald-700" />
                <span className="font-medium">{dateLabel}</span>
              </div>
              {event.location && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-100 px-3 py-1 text-sky-900">
                  <MapPin className="h-3.5 w-3.5 text-sky-700" />
                  <span className="font-medium">{event.location}</span>
                </div>
              )}
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-emerald-900">
                <Users className="h-3.5 w-3.5 text-emerald-700" />
                <span>
                  <span className="font-semibold">{goingCount}</span> going ·{' '}
                  <span className="font-semibold">{maybeCount}</span> maybe
                </span>
              </div>
            </div>
            </div>
          </header>

          {/* Flyer (large) */}
          {event.flyerUrl && (
            <section className="space-y-2">
              <h2 className="text-sm md:text-base font-semibold text-emerald-950 flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-700" />
                <span>Event flyer</span>
              </h2>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 shadow-sm p-3">
                {event.flyerMime?.startsWith('image/') ? (
                  <div className="relative w-full max-h-[600px] overflow-hidden rounded-xl bg-emerald-900/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={event.flyerUrl}
                      alt={event.flyerName || `${event.title} flyer`}
                      className="w-full h-full object-contain transition-transform duration-200 hover:scale-[1.02]"
                    />
                  </div>
                ) : event.flyerMime === 'application/pdf' ? (
                  <div className="space-y-2">
                    <div className="rounded-xl overflow-hidden border border-emerald-100 bg-white">
                      <iframe
                        src={event.flyerUrl}
                        title={event.flyerName || `${event.title} flyer`}
                        className="w-full h-[600px]"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900/80">
                      <span>
                        {event.flyerName || 'Event flyer'} (PDF)
                      </span>
                      <a
                        href={event.flyerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-800 hover:bg-emerald-100"
                      >
                        <span>Open in new tab</span>
                        <span>↗</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 text-xs text-emerald-900/85">
                    <span>
                      {event.flyerName
                        ? `Event file: ${event.flyerName}`
                        : 'Event file'}
                    </span>
                    <a
                      href={event.flyerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-800 hover:bg-emerald-100"
                    >
                      <span>View file</span>
                      <span>↗</span>
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Description */}
          {event.description && (
            <section className="space-y-2">
              <h2 className="text-sm md:text-base font-semibold text-emerald-950 flex items-center gap-2">
                <span className="text-base">📋</span>
                <span>About this event</span>
              </h2>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm md:text-[15px] text-emerald-900 leading-relaxed">
                {event.description.split('\n').map((line, idx) => (
                  <p key={idx} className={idx > 0 ? 'mt-2' : undefined}>
                    {line}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* Footer / meta */}
          <footer className="pt-4 border-t border-emerald-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-900/70">
            <span>Prepared by the Cypressdale HOA Events team.</span>
            <Link
              href="/events"
              className="inline-flex items-center gap-1 font-medium text-emerald-800 hover:text-emerald-900 hover:underline"
            >
              <span>←</span>
              <span>Back to all events</span>
            </Link>
          </footer>
        </article>
      </div>
    </div>
  );
}
