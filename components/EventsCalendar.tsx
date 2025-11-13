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

  const [rsvpState, setRsvpState] = useState(() =>
    {events.map((e) => {
    const start = new Date(e.startDate);
    const dateLabel = start.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

    const counts = rsvpState[e._id] || {yes: e.rsvpYes ?? 0, maybe: e.rsvpMaybe ?? 0};
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
            onClick={() => handleRsvp(e._id, 'yes')}
            className="px-3 py-1 rounded-full text-xs font-medium border border-accent-500 text-accent-700 hover:bg-accent-50 disabled:opacity-60"
            >
            I’m going
            </button>
            <button
            type="button"
            disabled={disabled}
            onClick={() => handleRsvp(e._id, 'maybe')}
            className="px-3 py-1 rounded-full text-xs font-medium border border-brand-200 text-brand-700 hover:bg-brand-50 disabled:opacity-60"
            >
            Maybe
            </button>
        </div>
        </div>
    );
    })}

const [pendingEventId, setPendingEventId] = useState<string | null>(null);

async function handleRsvp(eventId: string, kind: 'yes' | 'maybe') {
  try {
    setPendingEventId(eventId);

    // optimistic update
    setRsvpState((prev) => {
      const current = prev[eventId] || {yes: 0, maybe: 0};
      return {
        ...prev,
        [eventId]: {
          yes: current.yes + (kind === 'yes' ? 1 : 0),
          maybe: current.maybe + (kind === 'maybe' ? 1 : 0),
        },
      };
    });

    await fetch('/api/rsvp', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({eventId, response: kind}),
    });
  } catch (e) {
    console.error('RSVP failed', e);
    // TODO: rollback if you want to be fancy
  } finally {
    setPendingEventId(null);
  }
}

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
              const isSelected =
                selectedKey && key === selectedKey;

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
                  </div>
                </div>
                {e.description && (
                  <p className="text-sm mt-1">{e.description}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
