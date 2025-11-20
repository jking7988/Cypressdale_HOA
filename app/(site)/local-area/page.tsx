// app/local-area/page.tsx
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { MapPin, Utensils, Trees, ShoppingBag, Info } from 'lucide-react';

export default function LocalAreaPage() {
  return (
    <div className="relative min-h-[calc(100vh-5rem)] bg-gradient-to-b from-emerald-50 via-sky-50 to-emerald-50">
      {/* Soft decorative blobs */}
      <div className="pointer-events-none fixed inset-0 opacity-40 mix-blend-multiply">
        <div className="absolute -top-12 -left-10 h-40 w-40 rounded-full bg-emerald-200 blur-3xl" />
        <div className="absolute top-32 -right-10 h-36 w-36 rounded-full bg-sky-200 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-lime-200 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-10 space-y-8">
        {/* Header */}
        <header className="space-y-3 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-900/90 px-4 py-1 text-xs font-semibold text-emerald-50 uppercase tracking-[0.18em] shadow-sm">
            <MapPin className="h-3.5 w-3.5" />
            <span>Explore the Area</span>
          </div>

          <h1 className="h1 text-2xl md:text-3xl text-emerald-950">
            Neighborhood map & nearby places
          </h1>

          <p className="muted max-w-2xl text-sm md:text-base text-emerald-900/80">
            See where Cypressdale sits in Spring, TX and get a quick overview of
            nearby restaurants, parks, and everyday essentials along the
            Cypresswood and I-45 corridor.
          </p>
        </header>

        {/* Map + intro blurb */}
        <section className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)] items-start">
          {/* Map card */}
          <div className="rounded-3xl bg-white/95 border border-emerald-100 shadow-[0_20px_50px_rgba(15,118,110,0.18)] backdrop-blur-sm overflow-hidden">
            <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100">
                  <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                </span>
                <div className="text-left">
                  <h2 className="text-sm font-semibold text-emerald-950">
                    Interactive neighborhood map
                  </h2>
                  <p className="text-[11px] text-emerald-900/80">
                    Pan and zoom to explore the Cypressdale area in satellite
                    view.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative w-full h-64 md:h-80 border-t border-emerald-100">
              <iframe
                title="Cypressdale neighborhood map"
                src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d7253.287432251687!2d-95.48146289845731!3d30.04081149481949!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sen!2sus!4v1763605266842!5m2!1sen!2sus"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>

            <div className="px-4 py-3 border-t border-emerald-100 text-[11px] md:text-xs text-emerald-900/80">
              Tip: Tap the map title or “View larger map” (on desktop) to open
              the area directly in Google Maps for driving directions.
            </div>
          </div>

          {/* Quick reference sidebar */}
          <aside className="space-y-4">
            <div className="card border border-emerald-100 bg-white/95 shadow-sm space-y-2">
              <h2 className="text-sm md:text-base font-semibold text-emerald-950 flex items-center gap-2">
                <Info className="h-4 w-4 text-emerald-700" />
                <span>Where is Cypressdale?</span>
              </h2>
              <p className="text-xs md:text-[13px] text-emerald-900/85">
                Cypressdale is a residential neighborhood in Spring, Texas,
                near Cypresswood Drive with convenient access to I-45, Klein
                schools, parks, shopping, and dining options in Spring and The
                Woodlands.
              </p>
            </div>

            <div className="card border border-emerald-100 bg-white/95 shadow-sm space-y-2">
              <h2 className="text-sm md:text-base font-semibold text-emerald-950 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-emerald-700" />
                <span>Helpful links</span>
              </h2>
              <ul className="space-y-1 text-xs md:text-[13px] text-emerald-900/85">
                <li>
                  <Link
                    href="/new-residents"
                    className="text-emerald-800 hover:text-emerald-900 hover:underline"
                  >
                    New Resident Guide
                  </Link>
                </li>
                <li>
                  <Link
                    href="/trash"
                    className="text-emerald-800 hover:text-emerald-900 hover:underline"
                  >
                    Trash, Recycling &amp; Heavy Trash
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pool"
                    className="text-emerald-800 hover:text-emerald-900 hover:underline"
                  >
                    Community Pool Information
                  </Link>
                </li>
              </ul>
            </div>
          </aside>
        </section>

        {/* Nearby sections */}
        <section className="grid gap-6 md:grid-cols-3 items-start">
          {/* Restaurants – grouped + drive times */}
          <div className="card border border-emerald-100 bg-white/95 shadow-md shadow-emerald-900/10 space-y-3">
            <h2 className="text-sm md:text-base font-semibold text-emerald-950 flex items-center gap-2">
              <Utensils className="h-4 w-4 text-emerald-700" />
              <span>Nearby restaurants</span>
            </h2>
            <p className="text-xs md:text-[13px] text-emerald-900/85">
              A few well-known options within a short drive of Cypressdale
              (times are approximate from the neighborhood by car):
            </p>

            {/* BBQ & Texas fare */}
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                BBQ &amp; Texas Fare
              </p>
              <ul className="list-disc pl-4 text-xs md:text-[13px] text-emerald-900/90 space-y-1.5">
                <li>
                  <span className="font-semibold">CorkScrew BBQ</span>{' '}
                  <span className="text-[11px] text-emerald-800">
                    • ~10–15 min drive
                  </span>
                  <br />
                  Award-winning barbecue in Spring, known for brisket, ribs,
                  and long but worthwhile lines.
                </li>
                <li>
                  <span className="font-semibold">The Republic Grille</span>{' '}
                  <span className="text-[11px] text-emerald-800">
                    • ~15–20 min drive
                  </span>
                  <br />
                  Texas-style comfort food and American favorites in a cozy,
                  Hill Country–inspired setting.
                </li>
                <li>
                  <span className="font-semibold">
                    Wunsche Brothers Café &amp; Saloon
                  </span>{' '}
                  <span className="text-[11px] text-emerald-800">
                    • ~10–15 min drive
                  </span>
                  <br />
                  Historic Old Town Spring restaurant with classic Southern
                  dishes and saloon vibes.
                </li>
              </ul>
            </div>

            {/* Italian & Mediterranean */}
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Italian &amp; Mediterranean
              </p>
              <ul className="list-disc pl-4 text-xs md:text-[13px] text-emerald-900/90 space-y-1.5">
                <li>
                  <span className="font-semibold">
                    Adriatic Cafe Italian Grill
                  </span>{' '}
                  <span className="text-[11px] text-emerald-800">
                    • ~10–15 min drive
                  </span>
                  <br />
                  Casual, family-run Italian spot with pastas, pizza, and
                  house-made bread.
                </li>
                <li>
                  <span className="font-semibold">
                    The Olive Oil Greek Restaurant
                  </span>{' '}
                  <span className="text-[11px] text-emerald-800">
                    • ~15–20 min drive
                  </span>
                  <br />
                  Greek and Mediterranean dishes in the nearby Sawdust/Spring
                  area.
                </li>
              </ul>
            </div>

            {/* Diners & casual */}
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Diners &amp; Casual
              </p>
              <ul className="list-disc pl-4 text-xs md:text-[13px] text-emerald-900/90 space-y-1.5">
                <li>
                  <span className="font-semibold">I-45 Diner</span>{' '}
                  <span className="text-[11px] text-emerald-800">
                    • ~10–15 min drive
                  </span>
                  <br />
                  Classic diner fare along the freeway: breakfast plates,
                  burgers, and comfort food.
                </li>
              </ul>
            </div>

            <p className="text-[11px] text-emerald-900/75">
              This list isn&apos;t exhaustive—search &quot;restaurants near
              Cypresswood &amp; I-45&quot; in Google Maps to see more nearby
              options and the most current hours.
            </p>
          </div>

          {/* Parks & recreation */}
          <div className="card border border-emerald-100 bg-white/95 shadow-md shadow-emerald-900/10 space-y-2">
            <h2 className="text-sm md:text-base font-semibold text-emerald-950 flex items-center gap-2">
              <Trees className="h-4 w-4 text-emerald-700" />
              <span>Parks &amp; things to do</span>
            </h2>
            <p className="text-xs md:text-[13px] text-emerald-900/85">
              Around Cypressdale and Spring you’ll find:
            </p>
            <ul className="list-disc pl-4 text-xs md:text-[13px] text-emerald-900/90 space-y-1">
              <li>Neighborhood playgrounds and green spaces</li>
              <li>
                Nearby regional parks, walking trails, and nature areas
              </li>
              <li>
                Old Town Spring with local shops, dining, and seasonal events
              </li>
              <li>
                Larger attractions in The Woodlands and along the I-45 corridor
              </li>
            </ul>
            <p className="text-[11px] text-emerald-900/75 mt-1">
              Check event listings on the HOA site and local city / county
              websites for current activities.
            </p>
          </div>

          {/* Everyday essentials */}
          <div className="card border border-emerald-100 bg-white/95 shadow-md shadow-emerald-900/10 space-y-2">
            <h2 className="text-sm md:text-base font-semibold text-emerald-950 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-emerald-700" />
              <span>Everyday essentials</span>
            </h2>
            <p className="text-xs md:text-[13px] text-emerald-900/85">
              Within a short drive from Cypressdale you can reach:
            </p>
            <ul className="list-disc pl-4 text-xs md:text-[13px] text-emerald-900/90 space-y-1">
              <li>Grocery stores, pharmacies, and convenience stores</li>
              <li>Gas stations along Cypresswood and nearby major roads</li>
              <li>Banking, postal, and package shipping locations</li>
              <li>Medical offices, clinics, and urgent care centers</li>
            </ul>
            <p className="text-[11px] text-emerald-900/75 mt-1">
              For emergencies, please call 911. For non-emergencies, refer to
              local law enforcement and county resources.
            </p>
          </div>
        </section>

        {/* Back link */}
        <div className="text-xs text-emerald-900/80">
          <Link
            href="/"
            className="font-medium text-emerald-800 hover:text-emerald-900 hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
