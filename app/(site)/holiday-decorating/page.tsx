// app/holiday-decorating/page.tsx

import Link from "next/link";
import { draftMode } from "next/headers";
import { ContactLink } from "@/components/ContactLink";
import { client, previewClient } from "@/lib/sanity.client";
import { holidayWinnersQuery } from "@/lib/queries";
import { YardLightbox } from "@/components/YardLightbox";

export const dynamic = "force-dynamic";

type HolidayWinner = {
  _id: string;
  title: string;
  holiday?: "christmas" | "halloween" | string;
  year?: number;
  place?: string;
  section?: string;
  streetOrBlock?: string;
  description?: string;
  photoUrl?: string;
  photoUrls?: string[];
};

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function getDraftEnabled(): Promise<boolean> {
  try {
    const dm: any = (draftMode as any)();
    const resolved = dm && typeof dm.then === "function" ? await dm : dm;
    return !!resolved?.isEnabled;
  } catch {
    return false;
  }
}

function placeLabel(place?: string) {
  switch (normalizePlace(place)) {
    case "1":
      return "1st Place";
    case "2":
      return "2nd Place";
    case "3":
      return "3rd Place";
    case "4":
      return "4th Place";
    default:
      return "Winner";
  }
}

function placeIcon(place?: string) {
  switch (normalizePlace(place)) {
    case "1":
      return "🥇";
    case "2":
      return "🥈";
    case "3":
      return "🥉";
    case "4":
      return "🏅";
    default:
      return "🏅";
  }
}

function placeRank(place?: string) {
  const n = Number(normalizePlace(place));
  return Number.isNaN(n) ? 99 : n;
}

function placePrize(place?: string) {
  switch (normalizePlace(place)) {
    case "1":
      return "$75 prize";
    case "2":
      return "$50 prize";
    case "3":
    case "4":
      return "$25 prize";
    default:
      return null;
  }
}

function normalizeHoliday(holiday?: string) {
  const h = String(holiday || "").trim().toLowerCase();
  if (!h) return "";
  if (h === "xmas") return "christmas";
  if (h.includes("christmas")) return "christmas";
  if (h.includes("halloween")) return "halloween";
  return h;
}

function normalizePlace(place?: string) {
  const p = String(place || "").trim().toLowerCase();
  if (!p) return "";
  if (p === "first" || p === "1st") return "1";
  if (p === "second" || p === "2nd") return "2";
  if (p === "third" || p === "3rd") return "3";
  if (p === "fourth" || p === "4th") return "4";
  if (p === "shoutout" || p === "shout-out" || p === "shout out" || p.includes("shout")) return "shoutout";
  if (p === "hm" || p.includes("honorable") || p.includes("honourable")) return "hm";
  return p;
}

const layoutSections = [
  { id: "section-1", label: "Section 1", description: "", src: "/images/holiday-layout-section-1.png" },
  { id: "section-2", label: "Section 2", description: "", src: "/images/holiday-layout-section-2.png" },
  { id: "section-3", label: "Section 3", description: "", src: "/images/holiday-layout-section-3.png" },
  { id: "section-4", label: "Section 4", description: "", src: "/images/holiday-layout-section-4.png" },
];

// merge main + additional photos, filter blanks, de-dupe
function mergedPhotos(w: HolidayWinner): string[] {
  return [w.photoUrl, ...(w.photoUrls ?? [])]
    .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    .filter((u, i, arr) => arr.indexOf(u) === i);
}

export default async function HolidayDecoratingPage(props: Props) {
  const dmEnabled = await getDraftEnabled();

  // optional manual override: ?draft=1
  let draftQueryFlag = false;
  if (props.searchParams) {
    const sp = await props.searchParams;
    const draftParam = sp?.draft;
    draftQueryFlag =
      typeof draftParam === "string"
        ? draftParam === "1"
        : Array.isArray(draftParam)
        ? draftParam[0] === "1"
        : false;
  }

  const usePreview = (dmEnabled || draftQueryFlag) && !!process.env.SANITY_API_READ_TOKEN;
  const sanity = usePreview ? previewClient : client;

  const winners = await sanity.fetch<HolidayWinner[]>(holidayWinnersQuery);

  const christmasWinners = winners.filter((w) => normalizeHoliday(w.holiday) === "christmas");
  const sourceWinners = christmasWinners.length > 0 ? christmasWinners : winners;

  let currentChristmas: HolidayWinner[] = [];
  let currentYearLabel: string | null = null;

  if (sourceWinners.length > 0) {
    const years = sourceWinners
      .map((w) => w.year)
      .filter((y): y is number => typeof y === "number");

    if (years.length > 0) {
      const uniqueYears = Array.from(new Set(years)).sort((a, b) => b - a);
      const hasWinnerCategory = (w: HolidayWinner) => {
        const p = normalizePlace(w.place);
        return p === "1" || p === "2" || p === "3" || p === "4" || p === "shoutout" || p === "hm";
      };

      let chosenYear = uniqueYears[0];
      for (const year of uniqueYears) {
        const group = sourceWinners.filter((w) => w.year === year);
        if (group.some(hasWinnerCategory)) {
          chosenYear = year;
          break;
        }
      }

      currentYearLabel = String(chosenYear);
      currentChristmas = sourceWinners.filter((w) => w.year === chosenYear);
    } else {
      currentChristmas = sourceWinners;
    }
  }

  const rankedPlaceSet = new Set(["1", "2", "3", "4"]);
  const rankedChristmas = currentChristmas
    .filter((w) => rankedPlaceSet.has(normalizePlace(w.place)))
    .sort((a, b) => placeRank(a.place) - placeRank(b.place));

  const shoutouts = currentChristmas.filter((w) => {
    const p = normalizePlace(w.place);
    return p === "shoutout" || p === "hm";
  });
  const otherCurrentWinners = currentChristmas.filter((w) => {
    const p = normalizePlace(w.place);
    return !rankedPlaceSet.has(p) && p !== "shoutout" && p !== "hm";
  });
  const featuredWinners =
    rankedChristmas.length > 0 ? rankedChristmas : otherCurrentWinners;

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen min-h-[calc(100vh-5rem)] bg-gradient-to-b from-emerald-900 via-emerald-800 to-rose-900 text-emerald-50">
      {/* Festive glow */}
      <div className="pointer-events-none fixed inset-0 opacity-50 mix-blend-screen z-0">
        <div className="absolute -top-10 -left-16 h-56 w-56 rounded-full bg-emerald-400/40 blur-3xl" />
        <div className="absolute top-24 -right-10 h-40 w-40 rounded-full bg-rose-400/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-amber-300/35 blur-3xl" />
      </div>

      {/* Snow texture */}
      <div className="pointer-events-none fixed inset-0 opacity-25 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.28),transparent_55%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.18),transparent_55%)] z-0" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 space-y-8">
        {/* Header */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-950/80 px-4 py-1 text-xs font-medium text-emerald-50 shadow-lg shadow-black/30">
            <span className="text-sm">🎄</span>
            <span className="tracking-[0.18em] uppercase">Holiday Decorating</span>
            <span className="text-sm">❄️</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-semibold text-emerald-50">
            Christmas &amp; Holiday Decorating Contests
          </h1>

          <p className="max-w-2xl text-sm md:text-base text-emerald-50/85">
            Cypressdale is launching annual holiday decorating contests, starting with the Christmas 2025 contest.
            The most festive and creative homes will be recognized with awards and featured on the HOA website.
          </p>

          <p className="text-xs md:text-sm text-emerald-100/75">
            The Christmas contest begins in 2025. A Halloween decorating contest will be added starting in 2026.
          </p>
        </header>

        {/* Winners */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-emerald-50 flex items-center gap-2">
              <span>🎁</span>
              <span>{currentYearLabel ? `Christmas ${currentYearLabel} Winners` : "Christmas Winners"}</span>
            </h2>
            <span className="rounded-full bg-emerald-100/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-50">
              {featuredWinners.length > 0 ? "Latest results" : "First winners coming soon"}
            </span>
          </div>

          {featuredWinners.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {featuredWinners.map((winner) => {
                const photos = mergedPhotos(winner);

                return (
                  <article
                    key={winner._id}
                    className="rounded-3xl border border-emerald-200/60 bg-emerald-950/40 backdrop-blur-md shadow-lg shadow-black/30 p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{placeIcon(winner.place)}</span>
                          <span className="text-sm font-semibold">{placeLabel(winner.place)}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {winner.section && (
                            <span className="text-[11px] font-medium text-emerald-100/90">
                              Section {winner.section} winner
                            </span>
                          )}
                          {placePrize(winner.place) && (
                            <span className="text-[11px] font-semibold text-emerald-50/95">
                              {placePrize(winner.place)}
                            </span>
                          )}
                        </div>
                      </div>

                      {winner.year && <span className="text-[11px] text-emerald-100/80">{winner.year}</span>}
                    </div>

                    <h3 className="text-sm font-semibold text-emerald-50">{winner.title}</h3>

                    {winner.streetOrBlock && <p className="text-xs text-emerald-100/85">{winner.streetOrBlock}</p>}

                    {photos.length > 0 && (
                      <div className="mt-2 rounded-2xl border border-emerald-200/40 bg-black/20 p-2">
                        <YardLightbox photos={photos} title={winner.title} />
                      </div>
                    )}

                    {winner.description && (
                      <p className="text-xs text-emerald-100/90 mt-1 line-clamp-4">{winner.description}</p>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-emerald-200/60 bg-emerald-950/30 px-4 py-5 text-sm text-emerald-50/85 text-center">
              <p className="font-medium mb-1">Christmas decorating winners will be posted here.</p>
              <p className="text-xs text-emerald-100/80">
                After judging, 1st–4th place homes will be announced and featured on this page.
              </p>
            </div>
          )}
        </section>

        {/* Shout-outs */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-emerald-50 flex items-center gap-2">
              <span>🌟</span>
              <span>Shout-outs: Great Decorations</span>
            </h2>
            <span className="rounded-full bg-emerald-100/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-50">
              Just missed the podium
            </span>
          </div>

          {shoutouts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {shoutouts.map((home) => {
                const photos = mergedPhotos(home);

                return (
                  <article
                    key={home._id}
                    className="rounded-3xl border border-emerald-200/60 bg-emerald-950/30 backdrop-blur-md shadow-lg shadow-black/25 p-4 flex flex-col gap-2"
                  >
                    <h3 className="text-sm font-semibold text-emerald-50">{home.title}</h3>

                    {home.streetOrBlock && <p className="text-xs text-emerald-100/85">{home.streetOrBlock}</p>}

                    {photos.length > 0 && (
                      <div className="mt-2 rounded-2xl border border-emerald-200/40 bg-black/20 p-2">
                        <YardLightbox photos={photos} title={home.title} />
                      </div>
                    )}

                    {home.description && (
                      <p className="text-xs text-emerald-100/90 mt-2 whitespace-pre-line">{home.description}</p>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-emerald-200/40 bg-emerald-950/20 px-4 py-5 text-sm text-emerald-50/80">
              <p className="font-medium">Want to feature more homes?</p>
              <p className="text-xs text-emerald-100/80 mt-1">
                Add a Holiday Winner entry in Sanity and set <span className="font-semibold">place</span> to{" "}
                <span className="font-semibold">"shoutout"</span> (or <span className="font-semibold">"hm"</span>)
                for the current year.
              </p>
            </div>
          )}
        </section>

        {/* Maps */}
        <section className="rounded-3xl border border-emerald-200/60 bg-emerald-950/40 backdrop-blur-md shadow-lg shadow-black/30 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-50">
              <span className="text-lg">🗺️</span>
              <h2 className="text-lg font-semibold">Neighborhood judging sections</h2>
            </div>
            <span className="text-[11px] rounded-full bg-emerald-100/15 px-3 py-1 font-semibold uppercase tracking-wide text-emerald-50">
              4 sections for judging
            </span>
          </div>

          <p className="text-sm text-emerald-50/90">
            Cypressdale is divided into four sections so judging can be organized and every home is considered.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {layoutSections.map((section) => (
              <figure
                key={section.id}
                className="flex flex-col gap-2 rounded-2xl border border-emerald-200/50 bg-black/25 p-3 shadow-md shadow-black/30"
              >
                <div className="rounded-xl border border-emerald-200/40 bg-black/40 p-2">
                  <YardLightbox photos={[section.src]} title={section.label} />
                </div>
                <figcaption className="space-y-1">
                  <p className="text-sm font-semibold text-emerald-50">{section.label}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Questions */}
        <section className="rounded-3xl border border-emerald-200/50 bg-emerald-900/50 backdrop-blur-md shadow-lg shadow-black/30 p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-50">
            <span className="text-lg">❓</span>
            <h2 className="text-lg font-semibold">Questions about holiday contests?</h2>
          </div>
          <p className="text-sm text-emerald-50/90">
            If you have questions about the contest or need clarification, please contact the HOA:
          </p>
          <p className="text-sm">
            <ContactLink role="general" showIcon />
          </p>
        </section>

        <div className="text-xs text-emerald-100/85">
          Looking for <span className="font-semibold">Yard of the Month</span>?{" "}
          <Link href="/yard-of-the-month" className="font-medium text-emerald-50 hover:underline">
            View the Yard of the Month program →
          </Link>
        </div>
      </div>
    </div>
  );
}
