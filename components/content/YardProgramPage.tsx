'use client';
import ContentText from './ContentText';

import { useId, useState } from 'react';
import WinnerYearTabs from './WinnerYearTabs';
import { assetUrl } from '@/lib/member-hub/content';
import { formatWinnerMonth, type YardSettings } from '@/lib/member-hub/programs';
﻿import Link from 'next/link';
import { ContactLink } from '@/components/ContactLink';
import { Leaf, Flower2, Sprout, Trophy, ArrowRight } from 'lucide-react';


export type YardWinner = {
  _id: string;
  title: string;
  month?: string;
  streetOrBlock?: string;
  description?: string;
  photoUrl?: string;
  photoUrls?: string[];
};

const formatMonth = formatWinnerMonth;

export default function YardProgramPage({ winners, config }: { winners: YardWinner[]; config: YardSettings }) {
  const yearOf = (winner: YardWinner) => winner.month?.match(/^(\d{4})-/)?.[1] || 'undated';
  const years = Array.from(new Set(winners.map(yearOf))).sort((a, b) => a === 'undated' ? 1 : b === 'undated' ? -1 : Number(b) - Number(a));
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const selected = selectedYear && years.includes(selectedYear) ? selectedYear : years[0] || '';
  const yearWinners = winners.filter(winner => yearOf(winner) === selected).sort((a, b) => String(b.month || '').localeCompare(String(a.month || '')));
  const currentWinner = yearWinners[0] ?? null;
  const pastWinners = yearWinners.slice(1);
  const yearTabsId = useId();

  return (
    <div className="relative min-h-[calc(100vh-5rem)] [overflow-wrap:anywhere]">
      {/* Full-screen garden image */}
      <div
        className="fixed inset-0 -z-30 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url("${assetUrl(config.backgroundImage) || "/images/flower-path.png"}")`,
          backgroundAttachment: 'fixed',
        }}
      />

      {/* Tighter radial spotlight, focused a bit above center (nice for hero section) */}
      <div
        className="fixed inset-0 -z-20 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(
              circle at center,
              rgba(98, 136, 103, 0.97) 0%,
              rgba(141, 140, 224, 0.94) 18%,
              rgba(223, 201, 142, 0.88) 30%,
              rgba(204, 202, 167, 0.7) 45%,
              rgba(255,255,255,0.40) 60%,
              rgba(255,255,255,0.12) 78%,
              rgba(255,255,255,0.04) 90%,
              rgba(255,255,255,0.00) 100%
            )
          `,
        }}
      />

      {/* Gentle vertical gradient + slight blur for readability */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-white/75 via-white/55 to-white/75 backdrop-blur-[1.5px]" />

      {/* Page content */}
      <div className={`relative mx-auto w-full ${config.pageWidth === "narrow" ? "max-w-3xl" : config.pageWidth === "wide" ? "max-w-6xl" : "max-w-5xl"} px-4 py-8 md:py-10 space-y-6 md:space-y-8`}>
        {/* Corner â€œvineâ€ accents instead of a full border */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          {/* top-left vine */}
          <div className="absolute -top-4 -left-3 md:-top-6 md:-left-4 h-14 w-16 md:h-20 md:w-24 bg-gradient-to-br from-emerald-300/75 via-emerald-200/0 to-transparent blur-md" />
          {/* top-right vine */}
          <div className="absolute -top-4 -right-3 md:-top-6 md:-right-4 h-14 w-16 md:h-20 md:w-24 bg-gradient-to-bl from-emerald-300/75 via-emerald-200/0 to-transparent blur-md" />
          {/* bottom-left vine */}
          <div className="absolute -bottom-4 -left-3 md:-bottom-6 md:-left-4 h-14 w-16 md:h-20 md:w-24 bg-gradient-to-tr from-amber-300/70 via-emerald-200/0 to-transparent blur-md" />
          {/* bottom-right vine */}
          <div className="absolute -bottom-4 -right-3 md:-bottom-6 md:-right-4 h-14 w-16 md:h-20 md:w-24 bg-gradient-to-tl from-amber-300/70 via-emerald-200/0 to-transparent blur-md" />
        </div>

        {/* Page header */}
        <header className="space-y-3 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-900/80 px-4 py-1 text-xs font-medium text-emerald-50 shadow-sm">
            <Leaf size={16} />
            <span className="tracking-[0.18em] uppercase">
              Yard of the Month
            </span>
            <Flower2 size={16} />
          </div>

          <h1 className="h1 text-2xl md:text-3xl text-emerald-950 flex items-center gap-2">
            <span><ContentText>{config.pageTitle}</ContentText></span>
          </h1>

          <p className="muted max-w-2xl text-sm md:text-base text-emerald-900/95">
            <ContentText>{config.introduction}</ContentText>
          </p>
        </header>

        {/* Overview + how it works */}
        {(config.showOverview || config.showCriteria) && <section className={`grid gap-6 ${config.showOverview && config.showCriteria ? "md:grid-cols-2" : ""} items-start`}>
          {/* Left: Overview */}
          {config.showOverview && <div className="card border border-emerald-100/80 bg-emerald-50/80 backdrop-blur-sm shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-emerald-800">
              <Sprout size={18} />
              <h2 className="h2 text-lg"><ContentText>{config.overviewTitle}</ContentText></h2>
            </div>
            <p className="text-sm text-emerald-900/90">
              <ContentText>{config.overviewIntro}</ContentText>
            </p>
            <p className="text-sm text-emerald-900/90">
              <ContentText>{config.overviewSelection}</ContentText>
            </p>
            <ul className="list-disc pl-5 text-sm text-emerald-900/90 space-y-1">
              {config.eligibility.map((rule, index) => <li key={index}><ContentText>{rule}</ContentText></li>)}
            </ul>
          </div>}

          {/* Right: How it works / criteria */}
          {config.showCriteria && <div className="card border border-lime-100/80 bg-lime-50/85 backdrop-blur-sm shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-emerald-800">
              <Leaf size={18} />
              <h2 className="h2 text-lg"><ContentText>{config.criteriaTitle}</ContentText></h2>
            </div>
            <p className="text-sm text-emerald-900/90">
              <ContentText>{config.criteriaIntro}</ContentText>
            </p>
            <ul className="grid gap-2 md:grid-cols-2 text-sm text-emerald-900/90">
              {config.criteria.map((criterion, index) => <li className="flex items-start gap-2" key={index}><span className="mt-[3px] text-emerald-600">{"\u2022"}</span><span><span className="font-semibold"><ContentText>{criterion.title}</ContentText></span>{" \u2013 "}<ContentText>{criterion.description}</ContentText></span></li>)}
            </ul>
            <p className="text-xs text-emerald-900/70">
              <ContentText>{config.criteriaNote}</ContentText>
            </p>
          </div>}
        </section>}

        {/* Current winner */}
        <WinnerYearTabs years={years} selected={selected} onSelect={setSelectedYear} id={yearTabsId} />
        <div role={years.length ? 'tabpanel' : undefined} id={`${yearTabsId}-panel`} aria-labelledby={years.length ? `${yearTabsId}-${selected}` : undefined} className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="h2 flex items-center gap-2 text-lg text-emerald-950">
              <Trophy size={18} />
              <span><ContentText>{selected === years[0] ? config.currentTitle : `${selected === 'undated' ? 'Other' : selected} Winners`}</ContentText></span>
            </h2>
            <span className="text-xs rounded-full bg-white/85 text-emerald-900 px-3 py-1 border border-emerald-200/90">
              {currentWinner
                ? selected === years[0] ? "Recognizing this month's standout yard" : 'Previous results'
                : config.emptyBadge}
            </span>
          </div>

          {currentWinner ? (
            <article className="rounded-3xl bg-white/95 border border-emerald-100/90 shadow-md overflow-hidden flex flex-col md:flex-row">
              {currentWinner.photoUrl && (
                <div className="relative aspect-[4/3] w-full md:w-1/3 shrink-0 self-start bg-white/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentWinner.photoUrl}
                    alt={currentWinner.title}
                    className="h-full w-full object-contain"
                  />
                </div>
              )}
              <div className="p-5 md:flex-1 space-y-1.5">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1">
                  <Trophy size={14} />
                  <span>
                    {formatMonth(currentWinner.month) || 'Current winner'}
                  </span>
                </p>
                <h3 className="text-base font-semibold text-emerald-950">
                  <ContentText>{currentWinner.title}</ContentText>
                </h3>
                {currentWinner.streetOrBlock && (
                  <p className="text-xs text-emerald-900/80">
                    <ContentText>{currentWinner.streetOrBlock}</ContentText>
                  </p>
                )}
                {currentWinner.description && (
                  <p className="text-sm text-emerald-900/90 mt-1">
                    <ContentText>{currentWinner.description}</ContentText>
                  </p>
                )}
                <Link
                  href={`/yard-of-the-month/${currentWinner._id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 hover:text-emerald-900 hover:underline mt-2"
                >
                  View photos &amp; details <ArrowRight size={14} />
                </Link>
              </div>
            </article>
          ) : (
            <div className="rounded-3xl border border-dashed border-emerald-300/80 bg-emerald-50/90 px-4 py-6 text-sm text-emerald-900/85 text-center backdrop-blur-[1px]">
              <p className="font-medium text-emerald-950 mb-1">
                <ContentText>{config.emptyTitle}</ContentText>
              </p>
              <p>
                <ContentText>{config.emptyCopy}</ContentText>
              </p>
            </div>
          )}
        </section>

        {/* Past winners */}
        {config.showPast && pastWinners.length > 0 && (
          <section className="space-y-3">
            <h2 className="h2 text-lg text-emerald-950 flex items-center gap-2">
              <Trophy size={18} />
              <span><ContentText>{config.pastTitle}</ContentText></span>
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {pastWinners.map((w) => (
                <article
                  key={w._id}
                  className="rounded-3xl bg-white/92 border border-emerald-100/85 shadow-sm overflow-hidden flex flex-col"
                >
                  {w.photoUrl && (
                    <div className="relative aspect-[4/3] w-full bg-white/60">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={w.photoUrl}
                        alt={w.title}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  )}
                  <div className="p-4 space-y-1.5">
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                      {formatMonth(w.month) || 'Past winner'}
                    </p>
                    <h3 className="text-sm font-semibold text-emerald-950">
                      <ContentText>{w.title}</ContentText>
                    </h3>
                    {w.streetOrBlock && (
                      <p className="text-xs text-emerald-900/80">
                        <ContentText>{w.streetOrBlock}</ContentText>
                      </p>
                    )}
                    {w.description && (
                      <p className="text-xs text-emerald-900/90 mt-1">
                        <ContentText>{w.description}</ContentText>
                      </p>
                    )}
                    <Link
                      href={`/yard-of-the-month/${w._id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 hover:text-emerald-900 hover:underline mt-2"
                    >
                      View details <ArrowRight size={14} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        </div>
        {/* Questions / contact */}
        {config.showContact && <section className="card border border-emerald-100/80 bg-emerald-50/85 backdrop-blur-sm space-y-2">
          <h2 className="h2 text-lg text-emerald-950 flex items-center gap-2">
            <Flower2 size={18} />
            <span><ContentText>{config.contactTitle}</ContentText></span>
          </h2>
          <p className="text-sm text-emerald-900/90">
            <ContentText>{config.contactCopy}</ContentText>
          </p>
          <p className="text-sm">
            <ContactLink role="general" showIcon />
          </p>
        </section>}
      </div>
    </div>
  );
}
