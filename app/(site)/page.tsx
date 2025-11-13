import Link from 'next/link';
import Image from 'next/image';
import { client } from '@/lib/sanity.client';
import { homeQuery } from '@/lib/queries';

type Post = {
  _id: string;
  title: string;
  excerpt?: string;
  body?: string;
  _createdAt?: string;
};

type Event = {
  _id: string;
  title: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
};

type HomeData = {
  posts: Post[];
  events: Event[];
};

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function HomePage() {
  const { posts, events } = await client.fetch<HomeData>(homeQuery);

  const nextEvent = events?.[0];
  const moreEvents = (events || []).slice(1, 4);
  const latestPosts = (posts || []).slice(0, 3);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 text-white">
        {/* Background photo overlay – replace /images/hero.jpg with your own */}
        <div className="absolute inset-0 opacity-25">
          <Image
            src="/images/hero.jpg"
            alt="Cypressdale neighborhood"
            fill
            className="object-cover"
          />
        </div>

        <div className="relative px-6 py-10 md:px-10 md:py-16 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/90 mb-2">
              Cypressdale Homeowners Association
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold mb-3">
              Welcome to Cypressdale
            </h1>
            <p className="text-sm md:text-base text-emerald-50/90 mb-6">
              Your central hub for neighborhood news, events, documents, and board
              information. Stay up to date and get involved in our community.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/events"
                className="inline-flex items-center rounded-full bg-white text-emerald-800 text-sm font-medium px-4 py-2 shadow-sm hover:bg-emerald-50"
              >
                View community events
              </Link>

              <Link
                href="/documents"
                className="inline-flex items-center rounded-full border border-emerald-200/80 text-emerald-50 text-sm font-medium px-4 py-2 hover:bg-emerald-700/60"
              >
                Access HOA documents
              </Link>

              <a
                href="https://www.facebook.com/groups/943724017657884"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-emerald-100/80 bg-emerald-900/40 text-emerald-50 text-sm font-medium px-4 py-2 hover:bg-emerald-800/70"
              >
                Join our Facebook group
              </a>
            </div>
          </div>

          {/* Quick "highlight" card */}
          <div className="bg-white/95 text-emerald-900 rounded-2xl shadow-md p-4 w-full md:w-80">
            <p className="text-xs font-semibold text-emerald-600 mb-1">
              Next community event
            </p>
            {nextEvent ? (
              <>
                <p className="text-sm font-semibold">{nextEvent.title}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {formatDate(nextEvent.startDate)}
                  {nextEvent.location ? ` • ${nextEvent.location}` : ''}
                </p>
                {nextEvent.description && (
                  <p className="text-xs text-gray-700 mt-2 line-clamp-3">
                    {nextEvent.description}
                  </p>
                )}
                <Link
                  href="/events"
                  className="inline-flex items-center mt-3 text-xs font-medium text-emerald-700 hover:underline"
                >
                  View full calendar →
                </Link>
              </>
            ) : (
              <p className="text-xs text-gray-600">
                No events have been scheduled yet. Check back soon!
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section>
        <h2 className="h2 mb-3">Quick links</h2>
        <p className="muted mb-3 text-sm">
          Jump straight to the most commonly used areas of the Cypressdale site.
        </p>

        <div className="grid gap-3 md:grid-cols-5">
          <Link href="/events" className="card hover:bg-brand-50 transition-colors">
            <div className="text-xs font-semibold text-brand-600 mb-1">
              Events & Calendar
            </div>
            <div className="text-sm text-brand-900">
              See upcoming neighborhood gatherings, meetings, and community activities.
            </div>
          </Link>

          <Link href="/news" className="card hover:bg-brand-50 transition-colors">
            <div className="text-xs font-semibold text-brand-600 mb-1">
              News & Announcements
            </div>
            <div className="text-sm text-brand-900">
              Read recent updates from the board and important community notices.
            </div>
          </Link>

          <Link href="/documents" className="card hover:bg-brand-50 transition-colors">
            <div className="text-xs font-semibold text-brand-600 mb-1">
              Documents & Forms
            </div>
            <div className="text-sm text-brand-900">
              Access bylaws, ACC forms, policies, and other official HOA documents.
            </div>
          </Link>

          <Link href="/contact" className="card hover:bg-brand-50 transition-colors">
            <div className="text-xs font-semibold text-brand-600 mb-1">
              Contact & Board
            </div>
            <div className="text-sm text-brand-900">
              Reach the HOA board or management company with questions or requests.
            </div>
          </Link>

          <a
            href="https://www.facebook.com/groups/943724017657884"
            target="_blank"
            rel="noreferrer"
            className="card hover:bg-brand-50 transition-colors"
          >
            <div className="text-xs font-semibold text-brand-600 mb-1">
              Facebook Community Group
            </div>
            <div className="text-sm text-brand-900">
              Connect with neighbors, see photos, and get informal updates in our
              residents-only Facebook group.
            </div>
          </a>
        </div>
      </section>

      {/* Upcoming Events Preview */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="h2">Upcoming events</h2>
          <Link href="/events" className="text-xs text-brand-700 hover:underline">
            View all events →
          </Link>
        </div>
        {events && events.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {events.slice(0, 4).map((e) => (
              <div key={e._id} className="card">
                <div className="text-xs font-semibold text-brand-600 mb-1">
                  {formatDate(e.startDate)}
                </div>
                <div className="font-semibold text-brand-900 text-sm mb-0.5">
                  {e.title}
                </div>
                <div className="text-xs text-gray-600 mb-1">
                  {e.location}
                </div>
                {e.description && (
                  <p className="text-xs text-gray-700 line-clamp-3">
                    {e.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted text-sm">No events have been added yet.</p>
        )}
      </section>

      {/* Latest News */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="h2">Latest news</h2>
          <Link href="/news" className="text-xs text-brand-700 hover:underline">
            View all news →
          </Link>
        </div>
        {latestPosts && latestPosts.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-3">
            {latestPosts.map((p) => (
              <article key={p._id} className="card flex flex-col">
                <h3 className="text-sm font-semibold text-brand-900 mb-1">
                  {p.title}
                </h3>
                {p._createdAt && (
                  <p className="text-[11px] text-gray-500 mb-1">
                    {formatDate(p._createdAt)}
                  </p>
                )}
                {p.excerpt && (
                  <p className="text-xs text-gray-700 line-clamp-4 mb-3">
                    {p.excerpt}
                  </p>
                )}
                <Link
                  href="/news"
                  className="mt-auto text-[11px] font-medium text-brand-700 hover:underline"
                >
                  View in news →
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted text-sm">No news posts have been published yet.</p>
        )}
      </section>

      {/* About / Community Info */}
      <section className="grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)] items-start">
        <div className="card">
          <h2 className="h2 mb-2">About Cypressdale</h2>
          <p className="text-sm text-gray-700 mb-2">
            Cypressdale is a deed-restricted community dedicated to keeping our
            neighborhood safe, clean, and welcoming for all residents. The HOA
            coordinates maintenance of shared areas, enforces community standards,
            and communicates important updates to homeowners.
          </p>
          <p className="text-sm text-gray-700 mb-2">
            This website is designed to make it easy to stay informed, access
            documents, and participate in community events. If you have questions
            or suggestions, please reach out to the HOA board or our management
            company through the contact page.
          </p>
        </div>

        {/* Photo grid – swap these with real neighborhood photos */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative h-32 md:h-40 rounded-2xl overflow-hidden">
            <Image
              src="/images/pool.jpg"
              alt="Community pool"
              fill
              className="object-cover"
            />
          </div>
          <div className="relative h-32 md:h-40 rounded-2xl overflow-hidden">
            <Image
              src="/images/park.jpg"
              alt="Neighborhood park"
              fill
              className="object-cover"
            />
          </div>
          <div className="relative h-32 md:h-40 rounded-2xl overflow-hidden">
            <Image
              src="/images/entrance.jpg"
              alt="Cypressdale entrance"
              fill
              className="object-cover"
            />
          </div>
          <div className="relative h-32 md:h-40 rounded-2xl overflow-hidden">
            <Image
              src="/images/trees.jpg"
              alt="Tree-lined street"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
