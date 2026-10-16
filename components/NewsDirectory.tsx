'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toPlainText } from '@portabletext/react';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, FileText, LayoutGrid, X } from 'lucide-react';
import { NewsCalendar } from '@/components/NewsCalendar';
import { newsDay, newsForDisplay, type CommunityNews } from '@/lib/member-hub/news-list';

const pageSize = 6;
const iconButton = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50 disabled:opacity-40';

export function NewsDirectory({ posts, now }: { posts: CommunityNews[]; now: string }) {
  const today = newsDay({ _id: '', title: '', _createdAt: now })!;
  const [view, setView] = useState<'grid' | 'calendar'>('grid');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const filtered = newsForDisplay(posts, view === 'calendar' ? selectedDay : null);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const counts: Record<string, number> = {};
  for (const post of posts) {
    const day = newsDay(post);
    if (day) counts[day] = (counts[day] || 0) + 1;
  }

  return <section className="space-y-6" aria-label="Community news directory">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-900/20 pb-4">
      <h2 className="text-xl font-semibold text-emerald-950">{selectedDay && view === 'calendar' ? `News on ${selectedDay}` : 'Latest Updates'}</h2>
      <div className="flex items-center gap-3">
        <span className="text-xs text-emerald-950">Newest first</span>
        <div className="flex gap-1" role="group" aria-label="News view">
          <button type="button" className={`${iconButton} ${view === 'grid' ? 'ring-2 ring-emerald-800' : ''}`} aria-label="Grid view" title="Grid view" aria-pressed={view === 'grid'} onClick={() => { setView('grid'); setSelectedDay(null); setPage(1); }}><LayoutGrid size={18} /></button>
          <button type="button" className={`${iconButton} ${view === 'calendar' ? 'ring-2 ring-emerald-800' : ''}`} aria-label="Calendar view" title="Calendar view" aria-pressed={view === 'calendar'} onClick={() => { setView('calendar'); setPage(1); }}><CalendarDays size={18} /></button>
        </div>
      </div>
    </div>
    {view === 'calendar' && <NewsCalendar month={month} today={today} selectedDay={selectedDay} counts={counts}
      onMonthChange={value => { setMonth(value); setSelectedDay(null); setPage(1); }}
      onSelectDay={day => { setSelectedDay(day === selectedDay ? null : day); setPage(1); }} />}
    {selectedDay && <button type="button" className="inline-flex items-center gap-1 text-sm text-emerald-950 underline" onClick={() => { setSelectedDay(null); setPage(1); }}><X size={15} />Clear date</button>}
    {!filtered.length && <p className="py-8 text-sm text-emerald-950">{selectedDay ? 'No news on this date.' : 'No news posts have been published yet.'}</p>}
    <div className="grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="News cards">
      {filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(post => {
        const href = `/news/${encodeURIComponent(post._id)}`;
        const attachment = post.sections?.find(section => section.fileUrl);
        const imageSection = post.sections?.find(section => section.imageUrl);
        const image = attachment?.fileMime?.startsWith('image/') ? attachment.fileUrl : imageSection?.imageUrl;
        const summary = toPlainText(post.excerpt?.length ? post.excerpt : post.body || []).trim();
        const day = newsDay(post);
        return <article key={post._id} id={post._id} className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-emerald-100 bg-white shadow-sm">
          {image && <Link href={href} className="flex h-44 items-center justify-center border-b border-gray-100 bg-gray-50 p-2"><img src={image} alt={imageSection?.imageAlt || `${post.title} flyer`} className="h-full w-full object-contain" loading="lazy" /></Link>}
          <div className="flex flex-1 flex-col gap-4 p-5">
            {day && <time dateTime={day} className="text-xs text-gray-600">{new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })}</time>}
            <h3 className="break-words text-lg font-semibold leading-snug text-emerald-950"><Link href={href} className="hover:underline">{post.title}</Link></h3>
            {summary && <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">{summary}</p>}
            {attachment?.fileUrl && <a href={attachment.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-emerald-800 hover:underline"><FileText size={16} className="shrink-0" />View flyer</a>}
            <div className="mt-auto border-t border-gray-100 pt-4"><Link href={href} className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:underline">Read update<ArrowRight size={16} /></Link></div>
          </div>
        </article>;
      })}
    </div>
    {pages > 1 && <nav className="flex items-center justify-center gap-4 pt-2" aria-label="News pages">
      <button type="button" className={iconButton} aria-label="Previous news page" title="Previous news page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={18} /></button>
      <span className="text-sm text-emerald-950">Page {currentPage} of {pages}</span>
      <button type="button" className={iconButton} aria-label="Next news page" title="Next news page" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={18} /></button>
    </nav>}
  </section>;
}
