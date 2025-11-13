'use client';

import { useMemo, useState } from 'react';

type Event = {
  _id: string;
  title: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  rsvpYes?: number;
  rsvpMaybe?: number;
};

type Props = {
  events: Event[];
};

function formatDateForCalendar(dateStr?: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  // Use UTC ISO, strip separators: YYYYMMDDTHHmmssZ
  const iso = d.toISOString(); // e.g. 2025-12-05T17:55:00.000Z
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


type RsvpKind = 'yes' | 'maybe';

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

  // --- RSVP state ---
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

      // optimistic update of counts
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
      // close modal after brief delay
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

  // --- Calendar computation ---
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startWeekDay = firstDayOfMonth.getDay(); // 0-6 (Sun-Sat)
  const daysInMonth = lastDayOfMonth.getDate();

  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];

  // Fill leading empty cells
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
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
        {/* Calendar */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goPrevMonth}
              className="px-2 py-1 rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-50"
            >
              ‹
            </button>
            <div className="font-semibold text-brand-800">{monthLabel}</div>
            <button
              type="button"
              onClick={goNextMonth}
              className="px-2 py-1 rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-50"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 text-xs font-medium text-brand-600 mb-1">
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
                      'h-9 rounded-lg w-full flex flex-col items-center justify-center border text-xs',
                      isSelected
                        ? 'bg-brand-600 text-white border-brand-600'
                        : hasEvents
                        ? 'border-accent-300 bg-accent-50 text-brand-800'
                        : 'border-brand-100 text-brand-700 hover:bg-brand-50',
                    ].join(' ')}
                  >
                    <span>{date.getDate()}</span>
                    {hasEvents && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-500 mt-0.5" />
                    )}
                  </button>
                );
              }),
            )}
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Click a highlighted day to see events.
          </p>
        </div>

        {/* Events list */}
        <div className="space-y-3">
          <h2 className="h2">Upcoming Events</h2>
          {events.length === 0 && (
            <p className="muted">No events have been posted yet.</p>
          )}

          {selectedEvents && selectedEvents.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-1">
                Events on{' '}
                {selectedDate?.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <div className="space-y-2">
                {selectedEvents.map((e) => {
                  const start = new Date(e.startDate);
                  const timeLabel = start.toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  });

                  return (
                    <div key={e._id} className="card">
                      <div className="text-sm font-semibold text-brand-800">
                        {e.title}
                      </div>
                      <div className="text-xs text-gray-600">
                        {timeLabel}
                        {e.location ? ` • ${e.location}` : ''}
                      </div>
                      {e.description && (
                        <p className="text-sm mt-1">{e.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All upcoming events list */}
          <div className="space-y-2 mt-3">
            {events.map((e) => {
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
                <div key={e._id} className="card">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-brand-800">
                        {e.title}
                      </div>
                      <div className="text-xs text-gray-600">
                        {dateLabel}
                        {e.location ? ` • ${e.location}` : ''}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {counts.yes} going · {counts.maybe} maybe
                      </div>
                    </div>
                  </div>
                  {e.description && (
                    <p className="text-sm mt-1">{e.description}</p>
                  )}

                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => openRsvpModal(e, 'yes')}
                      className="px-3 py-1 rounded-full text-xs font-medium border border-accent-500 text-accent-700 hover:bg-accent-50 disabled:opacity-60"
                    >
                      I&apos;m going
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => openRsvpModal(e, 'maybe')}
                      className="px-3 py-1 rounded-full text-xs font-medium border border-brand-200 text-brand-700 hover:bg-brand-50 disabled:opacity-60"
                    >
                      Maybe
                    </button>
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
              You&apos;re responding: {modalKind === 'yes' ? 'I&apos;m going' : 'Maybe'}
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
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
                className="px-3 py-1.5 text-xs rounded-lg bg-accent-600 text-white font-medium hover:bg-accent-700 disabled:opacity-60"
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
