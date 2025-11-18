'use client';

import { useMemo, useState } from 'react';
import { CalendarPlus, Download } from 'lucide-react';

type Event = {
  _id: string;
  title: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  rsvpYes?: number;
  rsvpMaybe?: number;
  flyerUrl?: string;
  flyerMime?: string;
  flyerName?: string;
  recentRsvps?: {
    status?: 'yes' | 'maybe';
    createdAt?: string;
  }[];
};

type Props = {
  events: Event[];
};

type RsvpKind = 'yes' | 'maybe';

function formatDateForCalendar(dateStr?: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const iso = d.toISOString();
  return iso.replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function buildGoogleCalendarUrl(e: Event) {
  const start = formatDateForCalendar(e.startDate);
  const end = formatDateForCalendar(e.endDate || e.startDate);
  if (!start || !end) return '#';

  const base = 'https://www.google.com/calendar/render?action=TEMPLATE';
  const params = new URLSearchParams({
    text: e.title || 'Event',
    dates: `${start}/${end}`,
    details: e.description || '',
    location: e.location || '',
  });

  return `${base}&${params.toString()}`;
}

function downloadIcs(e: Event) {
  const start = formatDateForCalendar(e.startDate);
  const end = formatDateForCalendar(e.endDate || e.startDate);
  if (!start || !end) return;

  const now = new Date();
  const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const escapeText = (text: string) =>
    text.replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cypressdale HOA//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e._id}@cypressdalehoa.com`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeText(e.title || 'Event')}`,
    e.description ? `DESCRIPTION:${escapeText(e.description)}` : '',
    e.location ? `LOCATION:${escapeText(e.location)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  const icsContent = lines.join('\r\n');
  const blob = new Blob([icsContent], {
    type: 'text/calendar;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `event-${e._id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function normalizeDate(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function EventsCalendar({ events }: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();

    events.forEach((e) => {
      if (!e.startDate) return;
      const d = new Date(e.startDate);
      if (isNaN(d.getTime())) return;

      const key = normalizeDate(d).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });

    return map;
  }, [events]);

  // RSVP state
  const [rsvpState, setRsvpState] = useState(() =>
    Object.fromEntries(
      events.map((e) => [
        e._id,
        {
          yes: e.rsvpYes ?? 0,
          maybe: e.rsvpMaybe ?? 0,
        },
      ]),
    ),
  );

  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEvent, setModalEvent] = useState<Event | null>(null);
  const [modalKind, setModalKind] = useState<RsvpKind>('yes');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function openRsvpModal(event: Event, kind: RsvpKind) {
    setModalEvent(event);
    setModalKind(kind);
    setFormName('');
    setFormEmail('');
    setErrorMsg(null);
    setSuccessMsg(null);
    setModalOpen(true);
  }

  function closeRsvpModal() {
    setModalOpen(false);
    setModalEvent(null);
    setPendingEventId(null);
  }

  async function submitRsvpForm() {
    if (!modalEvent) return;

    try {
      setSubmitting(true);
      setPendingEventId(modalEvent._id);
      setErrorMsg(null);

      // optimistic update
      setRsvpState((prev) => {
        const current = prev[modalEvent._id] || { yes: 0, maybe: 0 };
        return {
          ...prev,
          [modalEvent._id]: {
            yes: current.yes + (modalKind === 'yes' ? 1 : 0),
            maybe: current.maybe + (modalKind === 'maybe' ? 1 : 0),
          },
        };
      });

      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: modalEvent._id,
          response: modalKind,
          name: formName,
          email: formEmail,
        }),
      });

      if (!res.ok) {
        throw new Error('RSVP failed');
      }

      setSuccessMsg('RSVP received, thank you!');
      setTimeout(() => {
        closeRsvpModal();
      }, 800);
    } catch (err) {
      console.error(err);
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
      setPendingEventId(null);
    }
  }

  // Calendar computation
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startWeekDay = firstDayOfMonth.getDay(); // 0-6 (Sun-Sat)
  const daysInMonth = lastDayOfMonth.getDate();

  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];

  for (let i = 0; i < startWeekDay; i++) {
    currentWeek.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(new Date(year, month, day));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  const selectedKey =
    selectedDate != null
      ? normalizeDate(selectedDate).toISOString().slice(0, 10)
      : null;

  const selectedEvents =
    selectedKey && eventsByDay.has(selectedKey)
      ? eventsByDay.get(selectedKey)
      : [];

  const monthLabel = currentMonth.toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const goPrevMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
    setSelectedDate(null);
  };

  const goNextMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
    setSelectedDate(null);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Calendar + selected-day events */}
        <div className="space-y-4">
          {/* Calendar card */}
          <div className="card shadow-sm border border-emerald-100">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={goPrevMonth}
                className="px-2 py-1 rounded-lg border border-emerald-100 text-emerald-800 text-sm hover:bg-emerald-50 hover:-translate-y-[1px] transition"
              >
                ‹
              </button>
              <div className="text-sm font-semibold text-emerald-900 flex items_center gap-2">
                <span>{monthLabel}</span>
                <span className="text-[10px] rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5">
                  Calendar
                </span>
              </div>
              <button
                type="button"
                onClick={goNextMonth}
                className="px-2 py-1 rounded-lg border border-emerald-100 text-emerald-800 text-sm hover:bg-emerald-50 hover:-translate-y-[1px] transition"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 text-[11px] font-medium text-emerald-700 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-sm">
              {weeks.map((week, i) =>
                week.map((date, j) => {
                  if (!date) {
                    return (
                      <div
                        key={`${i}-${j}`}
                        className="h-9 rounded-lg border border-transparent"
                      />
                    );
                  }

                  const key = normalizeDate(date).toISOString().slice(0, 10);
                  const hasEvents = eventsByDay.has(key);
                  const isSelected = selectedKey && key === selectedKey;

                  return (
                    <button
                      key={`${i}-${j}`}
                      type="button"
                      onClick={() => setSelectedDate(date)}
                      className={[
                        'h-9 w-full rounded-lg flex flex-col items-center justify-center border text-xs transition',
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : hasEvents
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                          : 'border-gray-100 text-gray-700 hover:bg-gray-50',
                      ].join(' ')}
                    >
                      <span>{date.getDate()}</span>
                      {hasEvents && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5" />
                      )}
                    </button>
                  );
                }),
              )}
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Click a highlighted day to see its events.
            </p>
          </div>

          {/* Selected-day events */}
          {selectedEvents && selectedEvents.length > 0 && (
            <div className="card border border-emerald-100 shadow-sm">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2 text-emerald-900">
                <span>Events on</span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800 border border-emerald-100">
                  {selectedDate?.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </p>

              <div className="space-y-3">
                {selectedEvents.map((e) => {
                  if (!e.startDate) return null;

                  const start = new Date(e.startDate);
                  const timeLabel = start.toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  });

                  const counts =
                    rsvpState[e._id] || {
                      yes: e.rsvpYes ?? 0,
                      maybe: e.rsvpMaybe ?? 0,
                    };
                  const disabled = pendingEventId === e._id;

                  return (
                    <div
                      key={e._id}
                      className="card border border-emerald-50 bg-emerald-50/40 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-brand-800">
                            {e.title}
                          </div>
                          <div className="text-xs text-gray-600">
                            {timeLabel}
                            {e.location ? ` • ${e.location}` : ''}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px]">
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">
                              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {counts.yes} going
                            </span>
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                              {counts.maybe} maybe
                            </span>
                          </div>
                        </div>
                      </div>

                      {e.description && (
                        <p className="text-sm mt-1 text-gray-800">
                          {e.description}
                        </p>
                      )}

                      {/* Flyer preview / link */}
                      {e.flyerUrl && (
                        <div className="mt-2">
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
                                className="max-h-40 rounded-lg border border-emerald-100 shadow-sm"
                              />
                            </a>
                          ) : e.flyerMime === 'application/pdf' ? (
                            <div className="rounded-lg border border-emerald-100 overflow-hidden">
                              <iframe
                                src={e.flyerUrl}
                                title={e.flyerName || `${e.title} flyer`}
                                className="w-full h-64"
                              />
                            </div>
                          ) : (
                            <a
                              href={e.flyerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-emerald-700 hover:underline"
                            >
                              View event flyer
                              {e.flyerName ? ` (${e.flyerName})` : ''}
                            </a>
                          )}
                        </div>
                      )}

                      {/* RSVP buttons */}
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => openRsvpModal(e, 'yes')}
                          className="px-3 py-1 rounded-full text-xs font-medium border border-emerald-500 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                        >
                          I&apos;m going
                        </button>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => openRsvpModal(e, 'maybe')}
                          className="px-3 py-1 rounded-full text-xs font-medium border border-emerald-200 text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
                        >
                          Maybe
                        </button>
                      </div>

                      {/* Icon-only calendar export buttons */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <a
                          href={buildGoogleCalendarUrl(e)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Add to Google Calendar"
                          className="relative group flex items-center justify-center w-8 h-8 rounded-full border border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                        >
                          <CalendarPlus className="w-4 h-4" />
                          <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                            Add to Google Calendar
                          </span>
                        </a>

                        <button
                          type="button"
                          aria-label="Download .ics file"
                          onClick={() => downloadIcs(e)}
                          className="relative group flex items-center justify-center w-8 h-8 rounded-full border border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                        >
                          <Download className="w-4 h-4" />
                          <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                            Download .ics
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Upcoming events UNDER the calendar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="h2 flex items-center gap-2">
              <span>Upcoming Events</span>
              <span className="text-[11px] rounded_full bg-emerald-100 text-emerald-800 px-2 py-0.5">
                {events.length} total
              </span>
            </h2>
          </div>

          {events.length === 0 && (
            <p className="muted">No events have been posted yet.</p>
          )}

          <div className="space-y-3 mt-3">
            {events.map((e) => {
              if (!e.startDate) return null;

              const start = new Date(e.startDate);
              const dateLabel = start.toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              });

              const counts =
                rsvpState[e._id] || {
                  yes: e.rsvpYes ?? 0,
                  maybe: e.rsvpMaybe ?? 0,
                };
              const disabled = pendingEventId === e._id;

              return (
                <div
                  key={e._id}
                  className="card relative overflow-hidden border border-emerald-50 transition hover:-translate-y-[1px] hover:shadow-md"
                >
                  {/* accent bar */}
                  <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-500 to-emerald-300" />

                  <div className="pl-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <span>📅</span>
                        <span>{dateLabel}</span>
                      </div>
                    </div>
                    <div className="font-semibold text-brand-800">
                      {e.title}
                    </div>
                    <div className="text-xs text-gray-600">
                      {e.location}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">
                        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {counts.yes} going
                      </span>
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                        {counts.maybe} maybe
                      </span>
                    </div>

                    {e.description && (
                      <p className="text_sm mt-1 text-gray-800">
                        {e.description}
                      </p>
                    )}

                    {e.flyerUrl && (
                      <div className="mt-2">
                        <a
                          href={e.flyerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-emerald-700 hover:underline"
                        >
                          View event flyer
                        </a>
                      </div>
                    )}

                    {/* RSVP buttons */}
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => openRsvpModal(e, 'yes')}
                        className="px-3 py-1 rounded-full text-xs font-medium border border-emerald-500 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                      >
                        I&apos;m going
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => openRsvpModal(e, 'maybe')}
                        className="px-3 py-1 rounded-full text-xs font-medium border border-emerald-200 text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
                      >
                        Maybe
                      </button>
                    </div>

                    {/* Icon-only calendar export buttons */}
                    <div className="flex flex_wrap gap-2 mt-3">
                      <a
                        href={buildGoogleCalendarUrl(e)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Add to Google Calendar"
                        className="relative group flex items-center justify-center w-8 h-8 rounded-full border border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                      >
                        <CalendarPlus className="w-4 h-4" />
                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                          Add to Google Calendar
                        </span>
                      </a>

                      <button
                        type="button"
                        aria-label="Download .ics file"
                        onClick={() => downloadIcs(e)}
                        className="relative group flex items-center justify-center w-8 h-8 rounded-full border border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                      >
                        <Download className="w-4 h-4" />
                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                          Download .ics
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RSVP Modal */}
      {modalOpen && modalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-brand-800 mb-2">
              RSVP – {modalEvent.title}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              You&apos;re responding:{' '}
              {modalKind === 'yes' ? 'I&apos;m going' : 'Maybe'}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="you@example.com"
                />
              </div>
              {errorMsg && (
                <p className="text-xs text-red-600">{errorMsg}</p>
              )}
              {successMsg && (
                <p className="text-xs text-emerald-600">{successMsg}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={closeRsvpModal}
                disabled={submitting}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRsvpForm}
                disabled={submitting}
                className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Submit RSVP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
