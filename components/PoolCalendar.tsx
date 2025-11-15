'use client';

import { useState } from 'react';

function getPoolInfo(date: Date) {
  const month = date.getMonth(); // 0 = Jan
  const day = date.getDate();
  const weekday = date.getDay(); // 0 = Sun, 1 = Mon, ...

  let inSeason = false;
  let isOpen = false;
  let hours: string | undefined;

  // MAY (month 4)
  if (month === 4) {
    const mayOpenDays = new Set([1, 2, 8, 9, 15, 16, 22, 23, 29, 30, 31]);
    inSeason = true;

    if (mayOpenDays.has(day)) {
      isOpen = true;
      if (day === 31) {
        // Memorial Day
        hours = '11:00–8:00';
      } else {
        // Weekend days listed in schedule
        hours = '11:00–9:00';
      }
    }
  }

  // JUNE–AUGUST MAIN SEASON
  else if (month >= 5 && month <= 7) {
    inSeason = true;

    let inMainRange = false;

    if (month === 5) {
      // June 1–30
      inMainRange = day >= 1 && day <= 30;
    } else if (month === 6) {
      // July 1–31
      inMainRange = day >= 1 && day <= 31;
    } else if (month === 7) {
      // August 1–15 plus 21,22,28,29
      inMainRange =
        (day >= 1 && day <= 15) || [21, 22, 28, 29].includes(day);
    }
    if (month === 5 && day === 1) {
        return { inSeason: true, isOpen: false, hours: undefined };
    }

    if (inMainRange) {
      // Mondays closed
      if (weekday === 1) {
        isOpen = false;
      } else {
        isOpen = true;

        if (weekday >= 2 && weekday <= 4) {
          // Tue–Thu
          hours = '11:00–8:00';
        } else if (weekday === 0) {
          // Sunday
          hours = '11:00–9:00';

          // Special shorter Sundays in late August
          if (month === 7 && (day === 22 || day === 29)) {
            hours = '11:00–8:00';
          }
        } else {
          // Fri–Sat
          hours = '11:00–9:00';
        }
      }
    }
  }

  // SEPTEMBER (month 8)
  else if (month === 8) {
    inSeason = true;
    const sepOpenDays = new Set([4, 5, 6, 11, 12, 18, 19, 25, 26]);

    if (sepOpenDays.has(day)) {
      isOpen = true;

      // Labor Day (6) and Sundays 12,19,26: shorter hours
      if (day === 6 || day === 12 || day === 19 || day === 26) {
        hours = '11:00–8:00';
      } else {
        hours = '11:00–9:00';
      }
    }
  }

  // Outside May–September: offseason
  return { inSeason, isOpen, hours };
}

export default function PoolCalendar() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

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

  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-800">
          Pool Open/Closed Calendar
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrevMonth}
            className="px-2 py-1 rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-50 text-xs"
          >
            ‹
          </button>
          <div className="font-medium text-brand-800 text-sm">
            {monthLabel}
          </div>
          <button
            type="button"
            onClick={goNextMonth}
            className="px-2 py-1 rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-50 text-xs"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-[11px] font-medium text-brand-600 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs">
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

            const { inSeason, isOpen, hours } = getPoolInfo(date);

            const baseClasses =
              'h-12 rounded-lg w-full flex flex-col items-center justify-center border text-[11px] px-1 text-center';

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

            const label = !inSeason ? '' : isOpen ? 'Open' : 'Closed';

            return (
              <div
                key={`${i}-${j}`}
                className={`${baseClasses} ${statusClasses}`}
              >
                <span>{date.getDate()}</span>
                {label && (
                  <span className="mt-0.5 text-[9px] leading-none">
                    {label}
                  </span>
                )}
                {hours && (
                  <span className="mt-0.5 text-[9px] leading-none">
                    {hours}
                  </span>
                )}
              </div>
            );
          }),
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-600 mt-2">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-emerald-200 border border-emerald-400" />
          <span>Open (see hours)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-rose-200 border border-rose-400" />
          <span>Closed (during pool season)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-300" />
          <span>Outside pool season</span>
        </div>
      </div>
    </section>
  );
}
