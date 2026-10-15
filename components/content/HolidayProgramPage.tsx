'use client';
import ContentText from './ContentText';

import { useId, useState } from 'react';
import WinnerYearTabs from './WinnerYearTabs';
import { assetUrl } from '@/lib/member-hub/content';
import { type HolidaySettings } from '@/lib/member-hub/programs';

import Link from "next/link";
import { ContactLink } from "@/components/ContactLink";
import { YardLightbox } from "@/components/YardLightbox";
import { Trophy } from 'lucide-react';
import { winnerHoliday, type Holiday } from '@/lib/member-hub/holidays';


export type HolidayWinner = {
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
    case "shoutout":
      return "Shout-out";
    case "hm":
      return "Honorable Mention";
    default:
      return "Winner";
  }
}

function placeRank(place?: string) {
  const n = Number(normalizePlace(place));
  return Number.isNaN(n) ? 99 : n;
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

function WinnerCard({ winner, prize, featured = false }: { winner: HolidayWinner; prize?: string | null; featured?: boolean }) {
  const photos = mergedPhotos(winner);
  return <article className={`overflow-hidden rounded-lg border border-emerald-100 bg-white/95 text-emerald-950 shadow-md ${featured ? 'md:col-span-2 md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center' : 'flex flex-col'}`}>
    {photos.length > 0 && <YardLightbox photos={photos} title={winner.title} layout="card" />}
    <div className={`min-w-0 space-y-3 p-5 md:p-6 ${featured && !photos.length ? 'md:col-span-2' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"><Trophy size={18} />{placeLabel(winner.place)}</span>
        {winner.year && <span className="text-sm text-emerald-800">{winner.year}</span>}
      </div>
      <h3 className="text-xl font-semibold text-emerald-950"><ContentText>{winner.title}</ContentText></h3>
      {winner.streetOrBlock && <p className="text-sm text-emerald-900"><ContentText>{winner.streetOrBlock}</ContentText></p>}
      {(winner.section || prize) && <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-emerald-800">
        {winner.section && <span>Section {winner.section} winner</span>}{prize && <span className="font-semibold">{prize}</span>}
      </div>}
      {winner.description && <p className="whitespace-pre-line text-sm leading-relaxed text-emerald-900"><ContentText>{winner.description}</ContentText></p>}
    </div>
  </article>;
}

export default function HolidayProgramPage({ winners, config, holiday = config.displayHoliday }: {
  winners: HolidayWinner[]; config: HolidaySettings; holiday?: Holiday;
}) {
  const holidayLabel = holiday === "halloween" ? "Halloween" : "Christmas";
  const sourceWinners = winners.filter(winner => winnerHoliday(winner.holiday) === holiday);

  const yearOf = (winner: HolidayWinner) => winner.year ? String(winner.year) : 'undated';
  const years = Array.from(new Set(sourceWinners.map(yearOf))).sort((a, b) => a === 'undated' ? 1 : b === 'undated' ? -1 : Number(b) - Number(a));
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const selected = selectedYear && years.includes(selectedYear) ? selectedYear : years[0] || '';
  const currentWinners = sourceWinners.filter(winner => yearOf(winner) === selected);
  const currentYearLabel = selected === 'undated' ? null : selected;
  const yearTabsId = useId();

  const prize = (place?: string) => {
    const index = Number(normalizePlace(place)) - 1, amount = config.prizes[index];
    return amount > 0 ? `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount)} prize` : null;
  };
  const rankedPlaceSet = new Set(["1", "2", "3", "4"]);
  const rankedWinners = currentWinners
    .filter((w) => rankedPlaceSet.has(normalizePlace(w.place)))
    .sort((a, b) => placeRank(a.place) - placeRank(b.place));

  const shoutouts = currentWinners.filter((w) => {
    const p = normalizePlace(w.place);
    return p === "shoutout" || p === "hm";
  });
  const otherCurrentWinners = currentWinners.filter((w) => {
    const p = normalizePlace(w.place);
    return !rankedPlaceSet.has(p) && p !== "shoutout" && p !== "hm";
  });
  const featuredWinners =
    rankedWinners.length > 0 ? rankedWinners : otherCurrentWinners;

  return (
    <div className={`relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen min-h-[calc(100vh-5rem)] bg-gradient-to-b ${holiday === 'halloween' ? 'from-orange-900 via-zinc-950 to-purple-950' : 'from-emerald-900 via-emerald-800 to-rose-900'} text-emerald-50 [overflow-wrap:anywhere]`}>

      {/* Snow texture */}
      <div className="pointer-events-none fixed inset-0 opacity-25 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.28),transparent_55%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.18),transparent_55%)] z-0" />

      {assetUrl(config.backgroundImage) && <div className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url("${assetUrl(config.backgroundImage)}")` }} />}
      <div className={`relative z-10 mx-auto ${config.pageWidth === "narrow" ? "max-w-3xl" : config.pageWidth === "wide" ? "max-w-6xl" : "max-w-5xl"} px-4 py-10 space-y-8`}>
        {/* Header */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-950/80 px-4 py-1 text-xs font-medium text-emerald-50 shadow-lg shadow-black/30">
            <span className="text-sm" aria-hidden="true">{holiday === 'halloween' ? '\u{1F383}' : '\u{1F384}'}</span>
            <span className="tracking-[0.18em] uppercase">Holiday Decorating</span>
            {holiday === 'christmas' && <span className="text-sm" aria-hidden="true">❄️</span>}
          </div>

          <h1 className="text-2xl md:text-3xl font-semibold text-emerald-50">
            <ContentText>{config.pageTitle}</ContentText>
          </h1>

          <p className="max-w-2xl text-sm md:text-base text-emerald-50/85">
            <ContentText>{config.introduction}</ContentText>
          </p>

          <p className="text-xs md:text-sm text-emerald-100/75">
            <ContentText>{config.scheduleCopy}</ContentText>
          </p>
        </header>

        {/* Winners */}
        <WinnerYearTabs years={years} selected={selected} onSelect={setSelectedYear} id={yearTabsId} dark />
        <div role={years.length ? 'tabpanel' : undefined} id={`${yearTabsId}-panel`} aria-labelledby={years.length ? `${yearTabsId}-${selected}` : undefined} className="space-y-8">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-emerald-50 flex items-center gap-2">
              <span aria-hidden="true">{holiday === 'halloween' ? '\u{1F383}' : '\u{1F381}'}</span>
              <span>{currentYearLabel ? `${holidayLabel} ${currentYearLabel} Winners` : `${holidayLabel} Winners`}</span>
            </h2>
            <span className="rounded-full bg-emerald-100/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-50">
              {featuredWinners.length > 0 ? selected === years[0] ? "Latest results" : "Previous results" : "First winners coming soon"}
            </span>
          </div>

          {featuredWinners.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {featuredWinners.map((winner, index) => <WinnerCard key={winner._id} winner={winner} prize={prize(winner.place)} featured={index === 0} />)}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-emerald-200/60 bg-emerald-950/30 px-4 py-5 text-sm text-emerald-50/85 text-center">
              <p className="font-medium mb-1"><ContentText>{config.emptyTitle}</ContentText></p>
              <p className="text-xs text-emerald-100/80">
                <ContentText>{config.emptyCopy}</ContentText>
              </p>
            </div>
          )}
        </section>

        {/* Shout-outs */}
        {config.showShoutouts && <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-emerald-50 flex items-center gap-2">
              <span>🌟</span>
              <span><ContentText>{config.shoutoutsTitle}</ContentText></span>
            </h2>
            <span className="rounded-full bg-emerald-100/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-50">
              Just missed the podium
            </span>
          </div>

          {shoutouts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {shoutouts.map(home => <WinnerCard key={home._id} winner={home} />)}
            </div>
          ) : (
            <div className="rounded-3xl border border-emerald-200/40 bg-emerald-950/20 px-4 py-5 text-sm text-emerald-50/80">
              <p className="text-xs text-emerald-100/80">No additional homes have been recognized yet.</p>
            </div>
          )}
        </section>}

        </div>
        {/* Maps */}
        {config.showMaps && <section className="rounded-3xl border border-emerald-200/60 bg-emerald-950/40 backdrop-blur-md shadow-lg shadow-black/30 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-50">
              <span className="text-lg">🗺️</span>
              <h2 className="text-lg font-semibold"><ContentText>{config.mapsTitle}</ContentText></h2>
            </div>
            <span className="text-[11px] rounded-full bg-emerald-100/15 px-3 py-1 font-semibold uppercase tracking-wide text-emerald-50">
              4 sections for judging
            </span>
          </div>

          <p className="text-sm text-emerald-50/90">
            <ContentText>{config.mapsCopy}</ContentText>
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {layoutSections.map((original, index) => { const section = { ...original, label: config.mapLabels[index], src: assetUrl(config.mapImages[index]) || original.src }; return (
              <figure
                key={section.id}
                className="flex flex-col gap-2 rounded-2xl border border-emerald-200/50 bg-black/25 p-3 shadow-md shadow-black/30"
              >
                <div className="rounded-xl border border-emerald-200/40 bg-black/40 p-2">
                  <YardLightbox photos={[section.src]} title={section.label} />
                </div>
                <figcaption className="space-y-1">
                  <p className="text-sm font-semibold text-emerald-50"><ContentText>{section.label}</ContentText></p>
                </figcaption>
              </figure>
            ); })}
          </div>
        </section>}

        {/* Questions */}
        {config.showContact && <section className="rounded-3xl border border-emerald-200/50 bg-emerald-900/50 backdrop-blur-md shadow-lg shadow-black/30 p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-50">
            <span className="text-lg">❓</span>
            <h2 className="text-lg font-semibold"><ContentText>{config.contactTitle}</ContentText></h2>
          </div>
          <p className="text-sm text-emerald-50/90">
            <ContentText>{config.contactCopy}</ContentText>
          </p>
          <p className="text-sm">
            <ContactLink role="general" showIcon />
          </p>
        </section>}

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
