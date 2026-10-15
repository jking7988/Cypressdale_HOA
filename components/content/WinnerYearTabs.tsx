'use client';

export default function WinnerYearTabs({ years, selected, onSelect, id, dark = false }: {
  years: string[]; selected: string; onSelect: (year: string) => void; id: string; dark?: boolean;
}) {
  if (!years.length) return null;
  return <div role="tablist" aria-label="Winner years" className={`flex flex-wrap gap-1 border-b ${dark ? 'border-emerald-200/40' : 'border-emerald-300'}`}>
    {years.map((year, index) => <button key={year} type="button" role="tab" id={`${id}-${year}`} aria-controls={`${id}-panel`}
      aria-selected={selected === year} tabIndex={selected === year ? 0 : -1}
      className={`min-h-11 px-4 py-2 border-b-2 text-sm font-semibold ${selected === year
        ? dark ? 'border-white text-white bg-emerald-950/50' : 'border-emerald-800 text-emerald-950 bg-white/80'
        : dark ? 'border-transparent text-emerald-100 hover:bg-emerald-950/30' : 'border-transparent text-emerald-900 hover:bg-white/50'}`}
      onClick={() => onSelect(year)} onKeyDown={event => {
        const next = event.key === 'ArrowRight' ? (index + 1) % years.length : event.key === 'ArrowLeft' ? (index + years.length - 1) % years.length : event.key === 'Home' ? 0 : event.key === 'End' ? years.length - 1 : null;
        if (next === null) return;
        event.preventDefault(); onSelect(years[next]);
        event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
      }}>{year === 'undated' ? 'Other Winners' : year}</button>)}
  </div>;
}
