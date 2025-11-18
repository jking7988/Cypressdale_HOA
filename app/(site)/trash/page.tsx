// app/trash/page.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  Trash2,
  Recycle,
  Leaf,
  AlertTriangle,
  Clock,
  Truck,
  CheckCircle2,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function TrashInfoPage() {
  const searchParams = useSearchParams();
  const signupStatus = searchParams.get('signup');

  return (
  <div className="relative min-h-[calc(100vh-5rem)]">
    {/* FULL-SCREEN BACKGROUND */}
    <div className="fixed inset-0 -z-10">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-50"
        style={{ backgroundImage: "url('/images/bin-background.png')" }}
      />
      <div className="absolute inset-0 bg-emerald-50/60 backdrop-blur-[5px]" />
    </div>
    
    {/* CONTENT */}
    <div className="relative mx-auto max-w-5xl px-4 py-10 space-y-8">
      {/* Signup status banner */}
      {signupStatus === 'ok' && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-md shadow-emerald-900/10">
          You’re signed up for <span className="font-semibold">trash day reminders</span>.
          You’ll get an email the day before collection.
        </div>
      )}

      {signupStatus === 'error' && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-md shadow-red-900/10">
          Something went wrong signing you up. Please check your email address and try
          again.
        </div>
      )}

      {/* Header */}
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-900/90 px-4 py-1 text-xs font-medium text-emerald-50 shadow-md shadow-emerald-900/20">
          <Trash2 className="h-3.5 w-3.5" />
          <span className="tracking-[0.18em] uppercase">
            Trash &amp; Recycling
          </span>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Left: title + intro */}
          <div className="space-y-2">
            <h1 className="h1 text-2xl md:text-3xl text-emerald-950">
              Trash, Recycling &amp; Heavy Trash Information
            </h1>
            <p className="muted max-w-2xl text-sm md:text-base text-emerald-900/80">
              Collection in Cypressdale is provided by{' '}
              <span className="font-semibold">Texas Pride Disposal</span>.
              This page covers container rules, pickup days, heavy trash
              limits, yard waste guidelines, recycling, and helpful links for
              new accounts and questions.
            </p>
          </div>

            {/* Right: Texas Pride logo */}
            <div className="mt-1 md:mt-0">
              <div className="inline-flex items-center gap-3 rounded-xl border border-emerald-100 bg-white px-3 py-2 shadow-lg shadow-emerald-900/10">
                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Serviced by
                </span>
                <Image
                  src="/images/texas-pride-logo.png"
                  alt="Texas Pride Disposal logo"
                  width={160}
                  height={60}
                  className="h-10 w-auto object-contain"
                />
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)]">
          {/* MAIN COLUMN */}
          <div className="space-y-5">
            {/* Combined trash / heavy / yard */}
            <section className="card border border-emerald-200 bg-white shadow-lg shadow-emerald-900/10 backdrop-blur-sm space-y-4">
              <h2 className="h2 text-base md:text-lg text-emerald-950 flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-emerald-700" />
                <span>Trash, heavy trash &amp; yard waste guidelines</span>
              </h2>

              {/* Collection time + schedule */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-emerald-950 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-emerald-700" />
                  <span>Collection days &amp; time</span>
                </h3>
                <p className="text-sm text-emerald-900/90">
                  Texas Pride Disposal collects garbage and recycling in
                  Cypressdale on <span className="font-semibold">Wednesdays</span>{' '}
                  and <span className="font-semibold">Saturdays</span>.
                  Household garbage and recycling are collected on{' '}
                  <span className="font-semibold">Wednesdays</span>, and heavy
                  trash and bulk items are collected on{' '}
                  <span className="font-semibold">both Wednesdays and Saturdays</span>.
                </p>
                <p className="text-sm text-emerald-900/90">
                  Residents should place all waste at the curb no later than{' '}
                  <span className="font-semibold">5:00 AM</span> on their
                  scheduled collection day. Items set out late may not be
                  collected.
                </p>
              </div>

              {/* Household garbage */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-emerald-950 flex items-center gap-1.5">
                  <Trash2 className="h-4 w-4 text-emerald-700" />
                  <span>Household garbage</span>
                </h3>
                <ul className="list-disc pl-5 text-sm text-emerald-900/90 space-y-1.5">
                  <li>
                    Place waste in bags or containers{' '}
                    <span className="font-semibold">
                      no larger than 95 gallons
                    </span>
                    .
                  </li>
                  <li>
                    Cans or bags{' '}
                    <span className="font-semibold">
                      cannot exceed 50 pounds
                    </span>
                    .
                  </li>
                  <li>
                    Containers smaller than 20 gallons or containers not built
                    specifically to be used as a trash can may be disposed of.
                  </li>
                  <li>
                    Drums and barrels are not allowed and will be disposed of.
                  </li>
                </ul>
              </div>

              {/* Heavy trash / bulk */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-emerald-950 flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-emerald-700" />
                  <span>Heavy trash &amp; bulk items</span>
                </h3>
                <p className="text-sm text-emerald-900/90">
                  Up to <span className="font-semibold">two heavy items</span>{' '}
                  are collected on{' '}
                  <span className="font-semibold">
                    both Wednesdays and Saturdays
                  </span>
                  .
                </p>
                <p className="text-sm text-emerald-900/90">
                  Heavy trash/bulk waste includes items not generated on a
                  regular basis, such as:
                </p>
                <ul className="list-disc pl-5 text-sm text-emerald-900/90 space-y-1.5">
                  <li>
                    Furniture (couch, table, mattress, box spring, desk,
                    dresser, etc.).
                  </li>
                  <li>
                    Appliances (washer, dryer, dishwasher, etc.). Refrigerators
                    and freezers must be drained of Freon and have a bill
                    showing the service was performed.
                  </li>
                  <li>Hot water heaters.</li>
                  <li>
                    Fencing, decking, siding (remove nails, cut into lengths
                    4&apos; or less, tied and bundled under 50 lbs; limit eight
                    bundles per service day).
                  </li>
                  <li>
                    Trampolines and basketball goals (broken down; no concrete
                    in bases or poles).
                  </li>
                  <li>
                    Carpeting/flooring (cut into lengths 4&apos; or shorter,
                    tied and bundled under 50 lbs; limit eight bundles per
                    service day).
                  </li>
                </ul>
              </div>

              {/* Yard waste */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-emerald-950 flex items-center gap-1.5">
                  <Leaf className="h-4 w-4 text-emerald-700" />
                  <span>Yard waste</span>
                </h3>
                <ul className="list-disc pl-5 text-sm text-emerald-900/90 space-y-1.5">
                  <li>
                    Place grass clippings in cans or bags under 50 lbs. Limit{' '}
                    <span className="font-semibold">
                      eight bags of yard waste per service day
                    </span>
                    .
                  </li>
                  <li>
                    Branches should be in clear, individual piles measuring no
                    larger than 3&apos; x 3&apos; x 3&apos;, tied and bundled
                    under 50 lbs. Branches should measure no more than 6&quot;
                    in diameter. Limit eight bundles per service day.
                  </li>
                  <li>
                    Excess yard waste (more than eight bags or eight bundles)
                    may be considered a separate, paid pickup. Check with Texas
                    Pride for details.
                  </li>
                </ul>
              </div>

              {/* Not accepted with regular collection */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                  <span>Items not accepted with regular collection</span>
                </h3>
                <p className="text-sm text-amber-900/90">
                  The following items are{' '}
                  <span className="font-semibold">not accepted</span> with
                  standard trash, bulk, or yard waste collection and require
                  special handling or separate disposal:
                </p>
                <ul className="grid gap-1.5 text-sm text-amber-900/90 md:grid-cols-2 list-disc pl-5">
                  <li>Dirt / mulch</li>
                  <li>
                    Waste generated by a private contractor (remodeling,
                    landscaping)
                  </li>
                  <li>Rocks</li>
                  <li>Bricks, tile, concrete</li>
                  <li>Motor oil, cooking oil</li>
                  <li>Pesticides / insecticides, fertilizer</li>
                  <li>Gasoline / kerosene</li>
                  <li>Pool chemicals</li>
                  <li>Medical waste</li>
                  <li>Batteries</li>
                  <li>Paint (liquid)</li>
                  <li>Tires</li>
                  <li>Sod</li>
                  <li>Lawn mowers</li>
                </ul>
                <p className="text-xs text-amber-900/90">
                  For help disposing of these materials safely, please contact
                  Texas Pride Disposal or refer to local hazardous waste and
                  recycling resources.
                </p>
              </div>

              {/* Large loads / quote */}
              <div className="pt-1">
                <p className="text-sm text-emerald-900/90">
                  If you have a larger-than-usual amount of household waste,
                  bulk waste, or yard waste,{' '}
                  <a
                    href="https://www.texaspridedisposal.com/contact"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-800 font-medium underline-offset-2 hover:underline hover:text-emerald-900"
                  >
                    click here
                  </a>{' '}
                  and Texas Pride Disposal can provide you with a quote for
                  pickup or direct you to resources that can properly assist
                  with your disposal needs, or email{' '}
                  <a
                    href="mailto:service@texaspridedisposal.com"
                    className="text-emerald-800 font-medium underline-offset-2 hover:underline hover:text-emerald-900"
                  >
                    service@texaspridedisposal.com
                  </a>
                  .
                </p>
              </div>
            </section>

            {/* Recycling section */}
            <section className="card border border-emerald-200 bg-white shadow-lg shadow-emerald-900/10 backdrop-blur-sm space-y-3">
              <h2 className="h2 text-base md:text-lg text-emerald-950 flex items-center gap-2">
                <Recycle className="h-4 w-4 text-emerald-700" />
                <span>Recycling guidelines &amp; accepted materials</span>
              </h2>

              <p className="text-sm text-emerald-900/90">
                Please place recyclables in your recycling container{' '}
                <span className="font-semibold">dry, clean, and loose</span>.
                Do <span className="font-semibold">not bag</span> recyclables.
                Flatten all cardboard before placing it in the cart.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Paper */}
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-emerald-950">
                    Paper products
                  </h3>
                  <ul className="list-disc pl-5 text-sm text-emerald-900/90 space-y-0.5">
                    <li>Newspaper, magazines, catalogs</li>
                    <li>Junk mail, envelopes, greeting cards</li>
                    <li>Wrapping paper (non-metallic)</li>
                    <li>File folders, computer paper, construction paper</li>
                    <li>Paper grocery bags</li>
                    <li>Soda and beer boxes, shoe boxes</li>
                    <li>Clean pizza boxes and cardboard boxes</li>
                    <li>Waxboard containers (juice boxes)</li>
                    <li>Egg cartons, paper towel rolls, phone books</li>
                  </ul>
                </div>

                {/* Plastics */}
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-emerald-950">
                    Plastics (please rinse)
                  </h3>
                  <ul className="list-disc pl-5 text-sm text-emerald-900/90 space-y-0.5">
                    <li>Plastics #1–#7 (where marked)</li>
                    <li>Milk and juice bottles; soda and water bottles</li>
                    <li>Shampoo, soap, bleach, and detergent containers</li>
                    <li>Household cleaner containers</li>
                    <li>Plastic flower pots; yogurt cups</li>
                    <li>Cups, plates, and plastic dinnerware</li>
                    <li>Prescription pill containers</li>
                    <li>To-go containers (not Styrofoam)</li>
                  </ul>
                </div>

                {/* Metals */}
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-emerald-950">
                    Metals (please rinse)
                  </h3>
                  <ul className="list-disc pl-5 text-sm text-emerald-900/90 space-y-0.5">
                    <li>Soda, juice, and beer cans</li>
                    <li>Canned food and pet food cans</li>
                    <li>Aluminum foil and pie trays</li>
                    <li>Metal jar lids</li>
                    <li>Gutters (less than 5&apos; long)</li>
                    <li>Empty aerosol cans</li>
                  </ul>
                </div>

                {/* Glass */}
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-emerald-950">
                    Glass (please rinse)
                  </h3>
                  <ul className="list-disc pl-5 text-sm text-emerald-900/90 space-y-0.5">
                    <li>Beer, wine, and soda bottles</li>
                    <li>Glass jars</li>
                  </ul>
                </div>
              </div>

              {/* Non-recyclables */}
              <div className="pt-2 space-y-1.5">
                <h3 className="text-sm font-semibold text-emerald-950">
                  Items that are{' '}
                  <span className="text-red-700">not</span> accepted in
                  recycling
                </h3>
                <p className="text-sm text-emerald-900/90">
                  These items should go in your regular household garbage, not
                  recycling:
                </p>
                <ul className="list-disc pl-5 text-sm text-emerald-900/90 space-y-0.5">
                  <li>Styrofoam, microwave dinner trays</li>
                  <li>Windows, mirrors, ceramics</li>
                  <li>
                    Thin plastics and plastic bags (grocery, dry cleaner, mailer
                    bags)
                  </li>
                  <li>Plastic Amazon / mailer bags and bubble wrap</li>
                  <li>Soiled pizza boxes; wet or heavily soiled paper</li>
                  <li>Pots and pans; coat hangers</li>
                  <li>Light bulbs</li>
                  <li>Facial and toilet tissue; paper towels</li>
                  <li>PVC pipe</li>
                  <li>Paint and solvent containers</li>
                </ul>
              </div>
            </section>
          </div>

          {/* SIDEBAR */}
          <aside className="space-y-4">
            {/* Trash reminder signup */}
            <section className="card border border-emerald-200 bg-white backdrop-blur-sm space-y-3 shadow-md shadow-emerald-900/10">
              <h2 className="h2 text-base md:text-lg text-emerald-950">
                Get trash day reminders
              </h2>
              <p className="text-xs md:text-sm text-emerald-900/85">
                Sign up to receive an email reminder the <span className="font-semibold">day before</span>{' '}
                Cypressdale trash and recycling collection.
              </p>

              <form
                className="space-y-2"
                method="POST"
                action="/api/trash-reminders"  // TODO: implement this API route
              >
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-emerald-900/90">
                    Email address
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full rounded-md border border-emerald-200 bg-emerald-50/60 px-2.5 py-1.5 text-sm text-emerald-900 shadow-inner shadow-emerald-900/5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="you@example.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-emerald-900/90">
                    Street (optional)
                  </label>
                  <input
                    type="text"
                    name="street"
                    className="w-full rounded-md border border-emerald-200 bg-emerald-50/60 px-2.5 py-1.5 text-sm text-emerald-900 shadow-inner shadow-emerald-900/5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="e.g., Cypressdale Dr"
                  />
                </div>

                {/* Hidden meta in case you want to use it server-side */}
                <input type="hidden" name="list" value="trash-reminders" />
                <input type="hidden" name="frequency" value="day-before" />

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-emerald-50 shadow-md shadow-emerald-900/20 hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 focus:ring-offset-emerald-50"
                >
                  Sign me up
                </button>

                <p className="text-[0.7rem] text-emerald-900/70">
                  Reminders are sent the afternoon before scheduled collection days
                  (Wednesday and Saturday). You can unsubscribe anytime using the link in
                  the email.
                </p>
              </form>
            </section>

            {/* Texas Pride links */}
            <section className="card border border-emerald-200 bg-white backdrop-blur-sm space-y-2.5 shadow-md shadow-emerald-900/10">
              <h2 className="h2 text-base md:text-lg text-emerald-950">
                Texas Pride Disposal links
              </h2>
              <div className="space-y-1.5 text-sm">
                <p>
                  <a
                    href="https://www.texaspridedisposal.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-900 hover:underline"
                  >
                    <span>Visit Texas Pride Disposal website</span>
                    <span>↗</span>
                  </a>
                </p>
                <p>
                  <a
                    href="https://www.texaspridedisposal.com/contact#new-account-new-move-in"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-900 hover:underline"
                  >
                    <span>New Account / Move-In Setup Form</span>
                    <span>↗</span>
                  </a>
                </p>
                <p>
                  <a
                    href="mailto:service@texaspridedisposal.com"
                    className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-900 hover:underline"
                  >
                    <span>service@texaspridedisposal.com</span>
                  </a>
                </p>
              </div>
              <p className="text-xs text-emerald-900/80">
                For full guidelines, holiday schedules, service days, and pay
                piles, please refer to the official information from Texas Pride
                Disposal.
              </p>
            </section>

            {/* Related pages */}
            <section className="card border border-emerald-200 bg-white backdrop-blur-sm space-y-2 shadow-md shadow-emerald-900/10">
              <h2 className="h2 text-base md:text-lg text-emerald-950">
                Related Cypressdale pages
              </h2>
              <ul className="space-y-1 text-sm text-emerald-900/90">
                <li>
                  <Link
                    href="/new-residents"
                    className="text-emerald-800 underline-offset-2 hover:underline"
                  >
                    New Resident Guide
                  </Link>
                </li>
                <li>
                  <Link
                    href="/news"
                    className="text-emerald-800 underline-offset-2 hover:underline"
                  >
                    News &amp; Announcements
                  </Link>
                </li>
                <li>
                  <Link
                    href="/events"
                    className="text-emerald-800 underline-offset-2 hover:underline"
                  >
                    Events Calendar
                  </Link>
                </li>
              </ul>
            </section>
          </aside>
        </div>

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
