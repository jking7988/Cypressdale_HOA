'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

const iconButton = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50';

export function NewsCalendar({ month, today, selectedDay, counts, onMonthChange, onSelectDay }: {
  month: string;
  today: string;
  selectedDay: string | null;
  counts: Record<string, number>;
  onMonthChange: (month: string) => void;
  onSelectDay: (day: string) => void;
}) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1, 1));
  const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const label = date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' });
  const changeMonth = (offset: number) => onMonthChange(new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7));

  return <div className="rounded-lg border border-emerald-200 bg-white p-4 sm:p-6" aria-label="News calendar">
    <div className="mb-5 flex items-center justify-between gap-3">
      <button className={iconButton} type="button" aria-label="Previous month" title="Previous month" onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></button>
      <h2 className="text-lg font-semibold text-emerald-950">{label}</h2>
      <button className={iconButton} type="button" aria-label="Next month" title="Next month" onClick={() => changeMonth(1)}><ChevronRight size={18} /></button>
    </div>
    <div className="grid grid-cols-7 gap-1 sm:gap-2">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="pb-2 text-center text-xs text-gray-600">{day}</div>)}
      {Array.from({ length: date.getUTCDay() }, (_, index) => <div key={`blank-${index}`} />)}
      {Array.from({ length: dayCount }, (_, index) => {
        const day = `${month}-${String(index + 1).padStart(2, '0')}`;
        const count = counts[day] || 0;
        return <button key={day} type="button" aria-label={`${day}, ${count} updates`} aria-pressed={selectedDay === day}
          onClick={() => onSelectDay(day)}
          className={`flex h-12 flex-col items-center justify-center rounded-md border text-sm sm:h-16 ${selectedDay === day ? 'border-emerald-800 bg-emerald-800 text-white' : count ? 'border-emerald-400 bg-emerald-50 text-emerald-950' : 'border-gray-100 text-gray-600'} ${today === day ? 'font-bold ring-1 ring-emerald-600' : ''}`}>
          {index + 1}<span className="h-2 text-[10px] leading-none">{count > 0 ? count : ''}</span>
        </button>;
      })}
    </div>
  </div>;
}
