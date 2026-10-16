'use client';

import { useState } from 'react';
import { ArrowRight, CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Download, FileText, LayoutGrid, MapPin, X } from 'lucide-react';
import Link from 'next/link';
import { eventDay, eventRanges, eventsForDisplay, type CommunityEvent } from '@/lib/member-hub/event-list';

const central = 'America/Chicago';
const pageSize = 6;
const iconButton = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50 disabled:opacity-40';

function dateLabel(date: Date) {
  return date.toLocaleString('en-US', { timeZone: central, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function calendarStamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function googleCalendarUrl(event: CommunityEvent) {
  const [range] = eventRanges(event);
  if (!range) return '#';
  return `https://www.google.com/calendar/render?${new URLSearchParams({ action: 'TEMPLATE', text: event.title,
    dates: `${calendarStamp(range.start)}/${calendarStamp(range.end)}`, details: event.description || '', location: event.location || '' })}`;
}

function downloadIcs(event: CommunityEvent) {
  const escape = (text: string) => text.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cypressdale HOA//EN', 'CALSCALE:GREGORIAN',
    ...eventRanges(event).flatMap((range, index) => ['BEGIN:VEVENT', `UID:${event._id}-${index + 1}@cypressdalehoa.com`,
      `DTSTAMP:${calendarStamp(new Date())}`, `DTSTART:${calendarStamp(range.start)}`, `DTEND:${calendarStamp(range.end)}`,
      `SUMMARY:${escape(event.title)}`, `DESCRIPTION:${escape(event.description || '')}`, `LOCATION:${escape(event.location || '')}`, 'END:VEVENT']), 'END:VCALENDAR'];
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `event-${event._id}.ics`;
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

export default function EventsCalendar({ events, now }: { events: CommunityEvent[]; now: string }) {
  const today = eventDay(new Date(now));
  const [period, setPeriod] = useState<'upcoming' | 'past'>('upcoming');
  const [view, setView] = useState<'grid' | 'calendar'>('grid');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ event: CommunityEvent; kind: 'yes' | 'maybe' } | null>(null);
  const [access, setAccess] = useState<{ canRespond: boolean; signedIn: boolean; response: 'yes' | 'maybe' | null } | null>(null);
  const [counts, setCounts] = useState<Record<string, { yes: number; maybe: number }>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const upcoming = eventsForDisplay(events, 'upcoming', new Date(now));
  const past = eventsForDisplay(events, 'past', new Date(now));
  const filtered = eventsForDisplay(events, period, new Date(now), view === 'calendar' ? selectedDay : null);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const [year, monthNumber] = month.split('-').map(Number);
  const monthDate = new Date(Date.UTC(year, monthNumber - 1, 1));
  const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const monthLabel = monthDate.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' });
  const changeMonth = (offset: number) => {
    setMonth(new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7)); setSelectedDay(null); setPage(1);
  };

  async function openRsvp(event: CommunityEvent, kind: 'yes' | 'maybe') {
    setModal({ event, kind }); setAccess(null); setError(''); setBusy(true);
    try {
      const response = await fetch(`/api/rsvp?eventId=${encodeURIComponent(event._id)}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load RSVP.');
      setAccess(result); setCounts(previous => ({ ...previous, [event._id]: result }));
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to load RSVP.'); }
    finally { setBusy(false); }
  }

  async function submitRsvp(response: 'yes' | 'maybe' | null) {
    if (!modal) return;
    setBusy(true); setError('');
    try {
      const request = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: modal.event._id, response }) });
      const result = await request.json();
      if (!request.ok) throw new Error(result.error || 'Unable to save RSVP.');
      setCounts(previous => ({ ...previous, [modal.event._id]: result }));
      window.dispatchEvent(new CustomEvent('hoa-rsvp', { detail: { eventId: modal.event._id, ...result } }));
      setModal(null);
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save RSVP.'); }
    finally { setBusy(false); }
  }

  return <section className="space-y-6" aria-label="Community event directory">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-900/20 pb-4">
      <div className="flex gap-2" role="group" aria-label="Event period">
        {(['upcoming', 'past'] as const).map(value => <button key={value} type="button" aria-pressed={period === value}
          onClick={() => { setPeriod(value); setSelectedDay(null); setPage(1); }}
          className={`rounded-md px-4 py-2 text-sm font-semibold ${period === value ? 'bg-emerald-950 text-white' : 'bg-white/70 text-emerald-950 hover:bg-white'}`}>
          {value === 'upcoming' ? 'Upcoming' : 'Past'} <span className="ml-2 opacity-75">{value === 'upcoming' ? upcoming.length : past.length}</span>
        </button>)}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-emerald-950">Newest first</span>
        <div className="flex gap-1" role="group" aria-label="Event view">
          <button type="button" className={`${iconButton} ${view === 'grid' ? 'ring-2 ring-emerald-800' : ''}`} aria-label="Grid view" title="Grid view" aria-pressed={view === 'grid'} onClick={() => { setView('grid'); setPage(1); }}><LayoutGrid size={18} /></button>
          <button type="button" className={`${iconButton} ${view === 'calendar' ? 'ring-2 ring-emerald-800' : ''}`} aria-label="Calendar view" title="Calendar view" aria-pressed={view === 'calendar'} onClick={() => { setView('calendar'); setPage(1); }}><CalendarDays size={18} /></button>
        </div>
      </div>
    </div>

    {view === 'calendar' && <div className="rounded-lg border border-emerald-200 bg-white p-4 sm:p-6" aria-label="Events calendar">
      <div className="mb-5 flex items-center justify-between gap-3">
        <button className={iconButton} type="button" aria-label="Previous month" title="Previous month" onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></button>
        <h2 className="text-lg font-semibold text-emerald-950">{monthLabel}</h2>
        <button className={iconButton} type="button" aria-label="Next month" title="Next month" onClick={() => changeMonth(1)}><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="pb-2 text-center text-xs text-gray-600">{day}</div>)}
        {Array.from({ length: monthDate.getUTCDay() }, (_, index) => <div key={`blank-${index}`} />)}
        {Array.from({ length: dayCount }, (_, index) => {
          const day = `${month}-${String(index + 1).padStart(2, '0')}`;
          const dayEvents = eventsForDisplay(events, period, new Date(now), day);
          return <button key={day} type="button" aria-label={`${day}, ${dayEvents.length} events`} aria-pressed={selectedDay === day}
            onClick={() => { setSelectedDay(day === selectedDay ? null : day); setPage(1); }}
            className={`flex h-12 flex-col items-center justify-center rounded-md border text-sm sm:h-16 ${selectedDay === day ? 'border-emerald-800 bg-emerald-800 text-white' : dayEvents.length ? 'border-emerald-400 bg-emerald-50 text-emerald-950' : 'border-gray-100 text-gray-600'} ${today === day ? 'font-bold ring-1 ring-emerald-600' : ''}`}>
            {index + 1}<span className="h-2 text-[10px] leading-none">{dayEvents.length > 0 ? `${dayEvents.length}` : ''}</span>
          </button>;
        })}
      </div>
    </div>}

    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold text-emerald-950">{selectedDay && view === 'calendar' ? `Events on ${selectedDay}` : period === 'upcoming' ? 'Upcoming Events' : 'Past Events'}</h2>
      {selectedDay && view === 'calendar' && <button className="inline-flex items-center gap-1 text-sm text-emerald-950 underline" onClick={() => { setSelectedDay(null); setPage(1); }}><X size={15} />Clear date</button>}
    </div>
    {!filtered.length && <p className="py-8 text-sm text-emerald-950">{selectedDay ? 'No events on this date.' : period === 'upcoming' ? 'No upcoming events have been posted.' : 'No past events yet.'}</p>}

    <div className="grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="Event cards">
      {visible.map(event => {
        const ranges = eventRanges(event);
        const [range] = ranges;
        const totals = counts[event._id] || { yes: event.rsvpYes || 0, maybe: event.rsvpMaybe || 0 };
        const attachment = event.sections?.find(section => section.fileUrl);
        const imageSection = event.sections?.find(section => section.imageUrl);
        const fileUrl = event.flyerUrl || attachment?.fileUrl;
        const fileMime = event.flyerUrl ? event.flyerMime : attachment?.fileMime;
        const image = fileMime?.startsWith('image/') ? fileUrl : imageSection?.imageUrl;
        const href = `/events/${encodeURIComponent(event._id)}`;
        return <article key={event._id} id={event._id} className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-emerald-100 bg-white shadow-sm">
          {image && <Link href={href} className="flex h-44 items-center justify-center border-b border-gray-100 bg-gray-50 p-2"><img src={image} alt={imageSection?.imageAlt || `${event.title} flyer`} className="h-full w-full object-contain" loading="lazy" /></Link>}
          <div className="flex flex-1 flex-col gap-4 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-md bg-amber-50 text-amber-950">
                <span className="text-[11px] font-semibold uppercase">{range ? range.start.toLocaleDateString('en-US', { timeZone: central, month: 'short' }) : 'Date'}</span>
                <span className="text-2xl font-bold">{range ? eventDay(range.start).slice(-2) : '--'}</span>
              </div>
              <div className="min-w-0">
                <h3 className="break-words text-lg font-semibold leading-snug text-emerald-950"><Link href={href} className="hover:underline">{event.title}</Link></h3>
                <p className="mt-1 text-xs text-gray-600">{range ? dateLabel(range.start) : 'Date to be announced'}</p>
                {ranges[1] && <p className="mt-1 text-xs text-gray-600">{dateLabel(ranges[1].start)}</p>}
              </div>
            </div>
            {event.location && <p className="flex items-start gap-2 text-sm text-gray-600"><MapPin size={16} className="mt-0.5 shrink-0" /><span className="break-words">{event.location}</span></p>}
            {event.description && <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">{event.description}</p>}
            {fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-emerald-800 hover:underline"><FileText size={16} />View flyer</a>}
            <div className="mt-auto space-y-3 border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-600"><span className="text-emerald-800">{totals.yes} going</span><span className="mx-2">/</span>{totals.maybe} maybe</p>
              {period === 'upcoming' && <div className="flex flex-wrap gap-2">
                <button className="rounded-md border border-emerald-700 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50" onClick={() => openRsvp(event, 'yes')}>I&apos;m going</button>
                <button className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50" onClick={() => openRsvp(event, 'maybe')}>Maybe</button>
              </div>}
              <div className="flex items-center justify-between gap-2">
                <Link href={href} className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:underline">View event<ArrowRight size={16} /></Link>
                {range && <div className="flex gap-1">
                  <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer" className={iconButton} title="Add to Google Calendar" aria-label="Add to Google Calendar"><CalendarPlus size={16} /></a>
                  <button className={iconButton} type="button" title="Download .ics file" aria-label="Download .ics file" onClick={() => downloadIcs(event)}><Download size={16} /></button>
                </div>}
              </div>
            </div>
          </div>
        </article>;
      })}
    </div>

    {pages > 1 && <nav className="flex items-center justify-center gap-4 pt-2" aria-label="Event pages">
      <button type="button" className={iconButton} aria-label="Previous event page" title="Previous event page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={18} /></button>
      <span className="text-sm text-emerald-950">Page {currentPage} of {pages}</span>
      <button type="button" className={iconButton} aria-label="Next event page" title="Next event page" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={18} /></button>
    </nav>}

    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onKeyDown={event => { if (event.key === 'Escape' && !busy) setModal(null); }}>
      <div role="dialog" aria-modal="true" aria-label="RSVP" className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="break-words text-lg font-semibold text-emerald-950">RSVP - {modal.event.title}</h3>
        <p className="mt-2 text-sm text-gray-600">{modal.kind === 'yes' ? "I'm going" : 'Maybe'}</p>
        {busy && !access && <p role="status" className="mt-3 text-sm">Loading...</p>}
        {access && !access.canRespond && <p className="mt-3 text-sm">{access.signedIn ? 'Approved access is required to RSVP.' : <Link href="/admin-sign-in" className="underline">Sign in to RSVP</Link>}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button autoFocus type="button" disabled={busy} onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">Cancel</button>
          <button type="button" disabled={busy || !access?.canRespond} onClick={() => submitRsvp(modal.kind)} className="rounded-md bg-emerald-800 px-3 py-2 text-sm text-white disabled:opacity-50">{busy ? 'Sending...' : 'Submit RSVP'}</button>
          {access?.canRespond && access.response && <button type="button" disabled={busy} onClick={() => submitRsvp(null)} className="px-3 py-2 text-sm text-red-700">Remove RSVP</button>}
        </div>
      </div>
    </div>}
  </section>;
}
