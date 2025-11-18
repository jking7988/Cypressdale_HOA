export const dynamic = 'force-dynamic';

import { PortableText } from '@portabletext/react';
import Link from 'next/link';
import Image from 'next/image';
import { client } from '@/lib/sanity.client';
import { postsQuery, eventsQuery } from '@/lib/queries';
import {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudLightning,
  Snowflake,
  AlertCircle,
} from 'lucide-react';

type Post = {
  _id: string;
  title: string;
  excerpt?: any; // Portable Text array
  body?: any;
  _createdAt?: string;
};

type Event = {
  _id: string;
  title: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  flyerUrl?: string;
  flyerMime?: string;
  flyerName?: string;
};

type DailyForecast = {
  date: string;
  min: number;
  max: number;
  phrase: string;
};

type AccuWeatherResponse = {
  DailyForecasts: {
    Date: string;
    Temperature: {
      Minimum: { Value: number; Unit: string };
      Maximum: { Value: number; Unit: string };
    };
    Day: { IconPhrase: string };
  }[];
};

type HourlyForecast = {
  dateTime: string;
  temp: number;
  phrase: string;
};

type AccuWeatherHourlyResponse = {
  DateTime: string;
  Temperature: { Value: number; Unit: string };
  IconPhrase: string;
}[];

async function getSevenDayForecast(): Promise<DailyForecast[]> {
  const apiKey = process.env.ACCUWEATHER_API_KEY;
  const locationKey = process.env.ACCUWEATHER_LOCATION_KEY; // set this in .env.local

  if (!apiKey || !locationKey) {
    console.warn(
      'Weather: missing ACCUWEATHER_API_KEY or ACCUWEATHER_LOCATION_KEY. apiKey?',
      !!apiKey,
      'locationKey?',
      !!locationKey,
    );
    return [];
  }

  // 5 day forecast, Fahrenheit
  const url = `https://dataservice.accuweather.com/forecasts/v1/daily/5day/${locationKey}?apikey=${apiKey}&metric=false`;

  try {
    const res = await fetch(url, {
      // cache for 30 minutes
      next: { revalidate: 60 * 30 },
    });

    if (!res.ok) {
      console.warn('Weather: failed to fetch forecast', res.status, res.statusText);
      return [];
    }

    const data = (await res.json()) as AccuWeatherResponse;

    if (!data?.DailyForecasts?.length) {
      console.warn('Weather: no DailyForecasts returned from API');
      return [];
    }

    return data.DailyForecasts.map((d) => ({
      date: d.Date,
      min: d.Temperature.Minimum.Value,
      max: d.Temperature.Maximum.Value,
      phrase: d.Day.IconPhrase,
    }));
  } catch (err) {
    console.error('Weather: error calling AccuWeather', err);
    return [];
  }
}

async function getTwelveHourForecast(): Promise<HourlyForecast[]> {
  const apiKey = process.env.ACCUWEATHER_API_KEY;
  const locationKey = process.env.ACCUWEATHER_LOCATION_KEY;

  if (!apiKey || !locationKey) {
    console.warn(
      'Weather (12hr): missing ACCUWEATHER_API_KEY or ACCUWEATHER_LOCATION_KEY. apiKey?',
      !!apiKey,
      'locationKey?',
      !!locationKey,
    );
    return [];
  }

  // 12-hour hourly forecast, Fahrenheit
  const url = `https://dataservice.accuweather.com/forecasts/v1/hourly/12hour/${locationKey}?apikey=${apiKey}&metric=false`;

  try {
    const res = await fetch(url, {
      // cache for 15 minutes
      next: { revalidate: 60 * 15 },
    });

    if (!res.ok) {
      console.warn('Weather (12hr): failed to fetch forecast', res.status, res.statusText);
      return [];
    }

    const data = (await res.json()) as AccuWeatherHourlyResponse;

    if (!data?.length) {
      console.warn('Weather (12hr): no data returned from API');
      return [];
    }

    return data.map((h) => ({
      dateTime: h.DateTime,
      temp: h.Temperature.Value,
      phrase: h.IconPhrase,
    }));
  } catch (err) {
    console.error('Weather (12hr): error calling AccuWeather', err);
    return [];
  }
}

export default async function HomePage() {
  const [posts, events, dailyForecast, hourlyForecast] = await Promise.all([
    client.fetch<Post[]>(postsQuery),
    client.fetch<Event[]>(eventsQuery),
    getSevenDayForecast(),
    getTwelveHourForecast(),
  ]);

  const [today, ...otherDays] = dailyForecast;

  // Sort events
  const sortedEvents = events
    .filter((e) => e.startDate)
    .sort((a, b) => {
      const da = new Date(eSafeDate(a.startDate)).getTime();
      const db = new Date(eSafeDate(b.startDate)).getTime();
      return da - db;
    });

  const upcomingEvents = sortedEvents;
  const nextEvent = upcomingEvents[0] ?? null;
  const latestPosts = posts.slice(0, 3);
  const latestPost = latestPosts[0] ?? null;

  console.log(
    'HOME events count:',
    events.length,
    'sorted/upcoming:',
    upcomingEvents.length,
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Full-screen background */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-emerald-300 via-emerald-100 to-sky-200" />

      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8 md:space-y-10">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 text-white shadow-[0_28px_70px_rgba(15,118,110,0.6)] border border-emerald-900/40">
          {/* Background photo overlay */}
          <div className="absolute inset-0 opacity-25">
            <Image
              src="/images/hero.jpg"
              alt="Cypressdale neighborhood"
              fill
              className="object-cover"
            />
          </div>

          {/* Subtle vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

          <div className="relative px-6 py-10 md:px-10 md:py-16 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="max-w-xl space-y-4">
              {/* Status pill */}
              <div className="inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-60 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-100" />
                </span>
                <span className="text-emerald-50/90">
                  Cypressdale Community Portal
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-semibold mb-1">
                Welcome to Cypressdale
              </h1>
              <p className="text-sm md:text-base text-emerald-50/90">
                Your central hub for neighborhood news, events, documents, and
                board information. Stay up to date and get involved in the
                community.
              </p>

              {/* CTA row */}
              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  href="/events"
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-900/40 text-emerald-50 text-sm font-medium px-4 py-2 hover:bg-emerald-800/70 hover:-translate-y-[1px] transition"
                >
                  <span>View community events</span>
                  <span>📅</span>
                </Link>

                <Link
                  href="/news"
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-900/40 text-emerald-50 text-sm font-medium px-4 py-2 hover:bg-emerald-800/70 hover:-translate-y-[1px] transition"
                >
                  <span>View community news</span>
                  <span>📰</span>
                </Link>

                <Link
                  href="/pool"
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-900/40 text-emerald-50 text-sm font-medium px-4 py-2 hover:bg-emerald-800/70 hover:-translate-y-[1px] transition"
                >
                  <span>View pool information</span>
                  <span>🏊‍♂️</span>
                </Link>

                <Link
                  href="/documents"
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-900/40 text-emerald-50 text-sm font-medium px-4 py-2 hover:bg-emerald-800/70 hover:-translate-y-[1px] transition"
                >
                  <span>Access HOA documents</span>
                  <span>📄</span>
                </Link>

                <a
                  href="https://www.facebook.com/groups/943724017657884"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-900/40 text-emerald-50 text-sm font-medium px-4 py-2 hover:bg-emerald-800/70 hover:-translate-y-[1px] transition"
                >
                  <span>Join our Facebook group</span>
                  <span>💬</span>
                </a>
              </div>
            </div>

            {/* Quick "highlight" card */}
            <div className="bg-white/95 text-emerald-900 rounded-2xl shadow-md p-4 w-full md:w-80 border border-emerald-50">
              <p className="text-xs font-semibold text-emerald-600 mb-1 flex items-center gap-1">
                <span className="text-[10px]">⭐</span>
                <span>Next community event</span>
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

                  {/* Latest news teaser under next community event */}
                  {latestPost && (
                    <div className="mt-4 border-t border-emerald-100 pt-3">
                      <p className="text-[11px] font-semibold text-emerald-600 mb-1 flex items-center gap-1">
                        <span>🗞️</span>
                        <span>Latest news</span>
                      </p>
                      <p className="text-xs font-medium text-emerald-900 line-clamp-2">
                        {latestPost.title}
                      </p>
                      {latestPost._createdAt && (
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {formatDate(latestPost._createdAt)}
                        </p>
                      )}
                      <Link
                        href="/news"
                        className="inline-flex items-center mt-2 text-[11px] font-medium text-emerald-700 hover:underline"
                      >
                        Read all news →
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-600 mb-2">
                    No events have been scheduled yet. Check back soon!
                  </p>

                  {/* Still show latest news even if no event */}
                  {latestPost && (
                    <div className="mt-2 border-t border-emerald-100 pt-3">
                      <p className="text-[11px] font-semibold text-emerald-600 mb-1 flex items-center gap-1">
                        <span>🗞️</span>
                        <span>Latest news</span>
                      </p>
                      <p className="text-xs font-medium text-emerald-900 line-clamp-2">
                        {latestPost.title}
                      </p>
                      {latestPost._createdAt && (
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {formatDate(latestPost._createdAt)}
                        </p>
                      )}
                      <Link
                        href="/news"
                        className="inline-flex items-center mt-2 text-[11px] font-medium text-emerald-700 hover:underline"
                      >
                        Read all news →
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* Floating stack under hero */}
        <div className="-mt-6 space-y-6 md:space-y-7 relative z-10">
          {/* Site under development notice */}
          <section className="rounded-2xl border border-amber-200/90 bg-white/95 text-amber-900 flex gap-3 items-start text-sm shadow-[0_16px_40px_rgba(15,118,110,0.18)] backdrop-blur px-4 py-3 md:px-5 md:py-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                Site Under Development
              </p>
              <p className="mt-1">
                This website is currently under active development. You may
                notice periodic changes; if something is not working, please
                bear with us.
              </p>
            </div>
          </section>

          {/* Neighborhood Weather */}
          <section className="px-3 sm:px-4 py-5 md:px-6 md:py-6 space-y-3 flex flex-col items-center text-center">
            <h2 className="h2">Neighborhood weather</h2>
            <p className="muted text-sm">
              5-day and 12-hour forecast for Cypressdale (powered by AccuWeather).
            </p>

            {dailyForecast.length > 0 ? (
              <div className="w-full">
                {/* TODAY card (big, with 12-hour forecast inside) */}
                {today && (() => {
                  const meta = getWeatherMeta(today.phrase);
                  const Icon = meta.Icon;
                  return (
                    <div
                      className={`card group w-full text-center py-4 px-4 transition-transform duration-150 hover:-translate-y-1 hover:shadow-md ${meta.cardBg} ring-1 ${meta.ringClass}`}
                    >
                      <p className="text-xs font-semibold text-emerald-950 mb-1">
                        {formatWeatherDayLabel(today.date, 0)}
                      </p>

                      <div className="flex justify-center mb-2">
                        <Icon
                          className={`h-9 w-9 ${meta.iconClass} transition-transform duration-150 group-hover:scale-110`}
                          strokeWidth={1.5}
                        />
                      </div>

                      <p className="text-lg font-semibold text-emerald-950">
                        {Math.round(today.max)}°
                        <span className="text-xs text-slate-800 font-normal">
                          {' '}
                          / {Math.round(today.min)}°
                        </span>
                      </p>

                      <p className="text-[11px] text-slate-900 mt-1">
                        {today.phrase}
                      </p>

                      {/* 12-hour forecast inside TODAY */}
                      {hourlyForecast.length > 0 && (
                        <div className="mt-3 border-t border-emerald-200 pt-2 text-center">
                        <p className="text-[11px] font-semibold text-emerald-950 mb-1">
                          Next 12 hours
                        </p>
                        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                          {hourlyForecast.map((h) => (
                            <div
                              key={h.dateTime}
                              className="min-w-[70px] rounded-lg bg-white/90 border border-slate-200 px-1.5 py-1"
                            >
                              <p className="text-[10px] font-medium text-slate-900">
                                {formatHourLabel(h.dateTime)}
                              </p>
                              <p className="text-xs font-semibold text-slate-900">
                                {Math.round(h.temp)}°
                              </p>
                              <p className="text-[10px] text-slate-800 line-clamp-2">
                                {h.phrase}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                      )}
                    </div>
                  );
                })()}

                {/* Remaining 4 days under Today */}
                {otherDays.length > 0 && (
                  <div className="mt-3 overflow-x-auto pb-2 px-1 sm:px-2">
                    <div className="flex gap-3 justify-center w-max mx-auto">
                      {otherDays.map((day, idx) => {
                        const meta = getWeatherMeta(day.phrase);
                        const Icon = meta.Icon;
                        const indexForLabel = idx + 1; // so Tomorrow label still works

                        return (
                          <div
                            key={day.date}
                            className={`card group min-w-[120px] text-center flex-shrink-0 py-3 transition-transform duration-150 hover:-translate-y-1 hover:shadow-md ${meta.cardBg} ring-1 ${meta.ringClass}`}
                          >
                            <p className="text-xs font-semibold text-emerald-950 mb-1">
                              {formatWeatherDayLabel(day.date, indexForLabel)}
                            </p>

                            <div className="flex justify-center mb-2">
                              <Icon
                                className={`h-7 w-7 ${meta.iconClass} transition-transform duration-150 group-hover:scale-110`}
                                strokeWidth={1.5}
                              />
                            </div>

                            <p className="text-sm font-semibold text-emerald-950">
                              {Math.round(day.max)}°
                              <span className="text-xs text-slate-800 font-normal">
                                {' '}
                                / {Math.round(day.min)}°
                              </span>
                            </p>

                            <p className="text-[11px] text-slate-900 mt-1 line-clamp-2">
                              {day.phrase}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="muted text-sm">
                Weather forecast is temporarily unavailable while we update our data
                provider.
              </p>
            )}

          </section>

          {/* Upcoming Events Preview */}
          <section className="rounded-3xl bg-white/95 border border-emerald-50 shadow-[0_18px_50px_rgba(15,118,110,0.22)] backdrop-blur px-4 py-5 md:px-6 md:py-6 space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="h2">
                Upcoming events
              </h2>
              <Link
                href="/events"
                className="text-xs text-brand-700 hover:underline flex items-center gap-1"
              >
                <span>View all events</span>
                <span>→</span>
              </Link>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {upcomingEvents.slice(0, 4).map((e) => (
                  <div
                    key={e._id}
                    className="card relative overflow-hidden transition hover:-translate-y-[1px] hover:shadow-md"
                  >
                    {/* subtle accent bar on left */}
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-500 to-emerald-300" />

                    <div className="pl-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="text-[11px] font-semibold text-brand-600 flex items-center gap-1">
                          <span>📅</span>
                          <span>{formatDate(e.startDate)}</span>
                        </div>
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

                      {e.flyerUrl && (
                        <div className="mt-2 flex justify-center">
                          <div className="w-full max-w-[260px]">
                            {e.flyerMime?.startsWith('image/') ? (
                              <a
                                href={e.flyerUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block"
                              >
                                <img
                                  src={e.flyerUrl}
                                  alt={e.flyerName || `${e.title} flyer`}
                                  className="w-full rounded-lg border border-brand-100 shadow-sm"
                                />
                              </a>
                            ) : e.flyerMime === 'application/pdf' ? (
                              <div className="rounded-lg border border-brand-100 overflow-hidden">
                                <iframe
                                  src={e.flyerUrl}
                                  title={e.flyerName || `${e.title} flyer`}
                                  className="w-full h-40"
                                />
                              </div>
                            ) : (
                              <a
                                href={e.flyerUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-accent-700 hover:underline"
                              >
                                View event file
                                {e.flyerName ? ` (${e.flyerName})` : ''}
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted text-sm">
                No upcoming events have been added yet.
              </p>
            )}
          </section>

          {/* Latest News */}
          <section className="rounded-3xl bg-white/95 border border-emerald-50 shadow-[0_18px_50px_rgba(15,118,110,0.22)] backdrop-blur px-4 py-5 md:px-6 md:py-6 space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="h2">
                Latest news
              </h2>
              <Link
                href="/news"
                className="text-xs text-brand-700 hover:underline flex items-center gap-1"
              >
                <span>View all news</span>
                <span>→</span>
              </Link>
            </div>
            {latestPosts && latestPosts.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-3">
                {latestPosts.map((p) => (
                  <Link
                    key={p._id}
                    href={`/news/${p._id}`}
                    className="card flex flex-col transition hover:-translate-y-[1px] hover:shadow-md hover:border-brand-100"
                  >
                    <h3 className="text-sm font-semibold text-brand-900 mb-1 line-clamp-2">
                      {p.title}
                    </h3>
                    {p._createdAt && (
                      <p className="text-[11px] text-gray-500 mb-1 flex items-center gap-1">
                        <span>🗞️</span>
                        <span>{formatDate(p._createdAt)}</span>
                      </p>
                    )}
                    {p.excerpt && (
                      <div className="text-xs text-gray-700 line-clamp-4">
                        <PortableText value={p.excerpt} />
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted text-sm">
                No news posts have been published yet.
              </p>
            )}
          </section>

          {/* About / Community Info */}
          <section className="rounded-3xl bg-white/95 border border-emerald-50 shadow-[0_18px_50px_rgba(15,118,110,0.22)] backdrop-blur px-4 py-5 md:px-6 md:py-6 grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)] items-start">
            <div className="card border-none shadow-none p-0">
              <h2 className="h2 mb-2">About Cypressdale</h2>
              <p className="text-sm text-gray-700 mb-2">
                Cypressdale is a deed-restricted community dedicated to keeping
                our neighborhood safe, clean, and welcoming for all residents.
                The HOA coordinates maintenance of shared areas, enforces
                community standards, and communicates important updates to
                homeowners.
              </p>
              <p className="text-sm text-gray-700 mb-2">
                This website is designed to make it easy to stay informed,
                access documents, and participate in community events. If you
                have questions or suggestions, please reach out to the HOA board
                or our management company through the contact page.
              </p>
            </div>

            {/* Photo grid */}
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
      </div>
    </div>
  );
}

// helper so TS doesn’t freak out & we avoid invalid dates
function eSafeDate(dateStr?: string) {
  return dateStr ?? '';
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatWeatherDayLabel(dateStr: string, index: number) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';

  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';

  return d.toLocaleDateString(undefined, {
    weekday: 'short',
  });
}

function getWeatherMeta(phrase: string) {
  const p = phrase.toLowerCase();

  // Stormy / thunder
  if (p.includes('storm') || p.includes('thunder')) {
    return {
      Icon: CloudLightning,
      iconClass: 'text-yellow-700',
      cardBg:
        'bg-white/90 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent)]',
      ringClass: 'ring-amber-200/70',
    };
  }

  // Rainy
  if (p.includes('rain') || p.includes('shower') || p.includes('drizzle')) {
    return {
      Icon: CloudRain,
      iconClass: 'text-sky-700',
      cardBg:
        'bg-white/90 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent)]',
      ringClass: 'ring-sky-200/70',
    };
  }

  // Snow
  if (p.includes('snow') || p.includes('flurries')) {
    return {
      Icon: Snowflake,
      iconClass: 'text-blue-600',
      cardBg:
        'bg-white/90 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.20),_transparent)]',
      ringClass: 'ring-slate-200/70',
    };
  }

  // Cloudy / overcast
  if (p.includes('cloud') || p.includes('overcast')) {
    return {
      Icon: Cloud,
      iconClass: 'text-slate-700',
      cardBg:
        'bg-white/90 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.18),_transparent)]',
      ringClass: 'ring-slate-200/70',
    };
  }

  // Sunny / clear
  if (p.includes('sun') || p.includes('clear')) {
    return {
      Icon: Sun,
      iconClass: 'text-amber-500',
      cardBg:
        'bg-white/90 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.20),_transparent)]',
      ringClass: 'ring-amber-200/70',
    };
  }

  // Default: partly cloudy
  return {
    Icon: CloudSun,
    iconClass: 'text-emerald-700',
    cardBg:
      'bg-white/90 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.18),_transparent)]',
    ringClass: 'ring-emerald-200/70',
  };
}

function formatHourLabel(dateTimeStr: string) {
  const d = new Date(dateTimeStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
  });
}
