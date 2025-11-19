'use client';

import { useState } from 'react';

export type PoolInfo = {
  inSeason: boolean;
  isOpen: boolean;
  hours?: string;
  note?: string; // e.g. "Memorial Day", "After holiday"
};

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Last Monday in May
function getMemorialDay(year: number): Date {
  const d = new Date(year, 4, 31); // May 31
  while (d.getDay() !== 1) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

// First Monday in September
function getLaborDay(year: number): Date {
  const d = new Date(year, 8, 1); // Sept 1
  while (d.getDay() !== 1) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

// Exported so PoolPage can show "Today at the pool"
export function getPoolInfo(date: Date): PoolInfo {
  const year = date.getFullYear();
  const weekday = date.getDay(); // 0 = Sun, 1 = Mon, ...
  const memorialDay = getMemorialDay(year);
  const laborDay = getLaborDay(year);

  const tuesdayAfterMemorial = new Date(memorialDay);
  tuesdayAfterMemorial.setDate(memorialDay.getDate() + 1);

  const tuesdayAfterLabor = new Date(laborDay);
  tuesdayAfterLabor.setDate(laborDay.getDate() + 1);

  const seasonStart = new Date(year, 4, 31); // May 31
  const seasonEnd = new Date(year, 8, 1); // Sept 1

  const inMainSeason = date >= seasonStart && date <= seasonEnd;

  const isMemorial = sameDay(date, memorialDay);
  const isLabor = sameDay(date, laborDay);
  const isTueAfterMemorial = sameDay(date, tuesdayAfterMemorial);
  const isTueAfterLabor = sameDay(date, tuesdayAfterLabor);

  // In-season days:
  // - Main season (May 31–Sept 1)
  // - Memorial Day & Labor Day (even if outside that window)
  // - Tuesday after each holiday (shown as closed)
  const inSeason =
    inMainSeason ||
    isMemorial ||
    isLabor ||
    isTueAfterMemorial ||
    isTueAfterLabor;

  if (!inSeason) {
    return { inSeason: false, isOpen: false };
  }

  // Holiday Mondays: open with special note
  if (isMemorial) {
    return {
      inSeason: true,
      isOpen: true,
      hours: '10:00 a.m. – 8:00 p.m.',
      note: 'Memorial Day',
    };
  }

  if (isLabor) {
    return {
      inSeason: true,
      isOpen: true,
      hours: '10:00 a.m. – 8:00 p.m.',
      note: 'Labor Day',
    };
  }

  // Tuesday after each holiday: explicitly closed, with note
  if (isTueAfterMemorial || isTueAfterLabor) {
    return {
      inSeason: true,
      isOpen: false,
      note: 'After holiday',
    };
  }

  // Regular weekly pattern during season
  // Monday: closed
  if (weekday === 1) {
    return { inSeason: true, isOpen: false };
  }

  // Sunday: 10–6
  if (weekday === 0) {
    return {
      inSeason: true,
      isOpen: true,
      hours: '10:00 a.m. – 6:00 p.m.',
    };
  }

  // Tuesday–Saturday: 10–8
  return {
    inSeason: true,
    isOpen: true,
    hours: '10:00 a.m. – 8:00 p.m.',
  };
}

export default function PoolCalendar() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startWeekDay = firstDayOfMonth.getDay(); // 0-6
  const daysInMonth = lastDayOfMonth.getDate();

  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];

  // leading blanks
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

  const monthLabel = currentMonth.toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const goPrevMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  };

  const goNextMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  };

  const goToday = () => {
    setCurrentMonth(new Date(todayYear, todayMonth, 1));
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] md:text-base font-semibold text-brand-800">
          Pool Open/Closed Calendar
        </h2>
        <div className="flex items-center gap-2 text-xs md:text-[13px]">
          <button
            type="button"
            onClick={goToday}
            className="hidden sm:inline-flex items-center rounded-full border border-brand-200 px-2.5 py-1 text-[12px] text-brand-700 hover:bg-brand-50 transition"
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goPrevMonth}
              className="px-2 py-1 rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-50 text-[12px]"
            >
              ‹
            </button>
            <div className="font-medium text-brand-800 text-[13px] md:text-sm">
              {monthLabel}
            </div>
            <button
              type="button"
              onClick={goNextMonth}
              className="px-2 py-1 rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-50 text-[12px]"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 text-[12px] font-medium text-brand-600 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-[12px]">
        {weeks.map((week, i) =>
          week.map((date, j) => {
            if (!date) {
              return (
                <div
                  key={`${i}-${j}`}
                  className="h-14 rounded-lg border border-transparent"
                />
              );
            }

            const { inSeason, isOpen, note } = getPoolInfo(date);

            const isToday =
              date.getFullYear() === todayYear &&
              date.getMonth() === todayMonth &&
              date.getDate() === todayDate;

            const baseClasses =
              'h-14 rounded-lg w-full flex flex-col items-center justify-center border text-[12px] px-1 text-center transition-transform duration-150';

            let statusClasses = '';
            if (!inSeason) {
              statusClasses =
                'border-gray-100 text-gray-300 bg-gray-50';
            } else if (isOpen) {
              statusClasses =
                'border-emerald-200 bg-emerald-50 text-emerald-800';
            } else {
              statusClasses =
                'border-rose-200 bg-rose-50 text-rose-800';
            }

            const ringClasses = isToday
              ? 'ring-2 ring-sky-300 ring-offset-1 ring-offset-white font-semibold'
              : '';

            const label = !inSeason ? '' : isOpen ? 'Open' : 'Closed';

            return (
              <div
                key={`${i}-${j}`}
                className={`${baseClasses} ${statusClasses} ${ringClasses} hover:scale-[1.02] hover:shadow-sm`}
              >
                <span>{date.getDate()}</span>
                {label && (
                  <span className="mt-0.5 text-[10px] leading-none">
                    {label}
                  </span>
                )}
                {note && (
                  <span className="mt-0.5 text-[10px] leading-none">
                    {note}
                  </span>
                )}
              </div>
            );
          }),
        )}
      </div>

      {/* Legend + hours */}
      <div className="mt-2 space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-gray-600">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-emerald-200 border border-emerald-400" />
            <span>Open (see hours below)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-rose-200 border border-rose-400" />
            <span>Closed (during pool season)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-300" />
            <span>Outside pool season</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full border border-sky-300" />
            <span>Today</span>
          </div>
        </div>

        <div className="text-[11px] md:text-[12px] text-gray-600">
          <p className="font-medium text-gray-700 gap-1">
            Typical daily hours (in season):
          </p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Tuesday – Saturday: 10:00 a.m. – 8:00 p.m.</li>
            <li>Sunday: 10:00 a.m. – 6:00 p.m.</li>
            <li>Memorial Day &amp; Labor Day (Mondays): 10:00 a.m. – 8:00 p.m.</li>
            <li>
              Mondays (except Memorial Day &amp; Labor Day) and the Tuesday
              after each holiday: Closed.                     
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
