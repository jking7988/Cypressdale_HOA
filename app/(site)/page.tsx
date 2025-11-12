import { client } from '@/lib/sanity.client';
import { homeQuery } from '@/lib/queries';
import Link from 'next/link';

export default async function HomePage() {
  const data = await client.fetch(homeQuery);
  const { posts = [], events = [] } = data ?? {};

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="h1">Welcome to Cypressdale HOA</h1>
        <p className="muted">Stay informed with news, events, and documents.</p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="h2">Latest News</h2>
          <Link href="/news" className="text-brand-600 hover:text-brand-700">View all</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {posts.map((p: any) => (
            <article key={p._id} className="card">
              <h3 className="font-semibold text-lg">{p.title}</h3>
              <p className="muted line-clamp-3">{p.excerpt}</p>
              <Link href={`/news#${p._id}`} className="text-blue-600 mt-2 inline-block">Read</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="h2">Upcoming Events</h2>
          <Link href="/events" className="text-brand-600 hover:text-brand-700">View calendar</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((e: any) => (
            <div key={e._id} className="card">
              <h3 className="font-semibold text-lg">{e.title}</h3>
              <p className="muted">{new Date(e.start).toLocaleString()}</p>
              {e.location && <p>{e.location}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
