'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type MiniPost = { id: string; title: string };

type NewsCalendarProps = {
  baseDateIso: string;                     // e.g. "2025-11-24T12:00:00.000Z"
  dateKeysWithPosts: string[];             // e.g. ["2025-11-24", "2025-11-30"]
  postsForDate: Record<string, MiniPost[]>; // dateKey -> posts
};

export function NewsCalendar({
  baseDateIso,
  dateKeysWithPosts,
  postsForDate,
}: NewsCalendarProps) {
  const router = useRouter();

  const initial = new Date(baseDateIso);

  const [currentYear, setCurrentYear] = useState(initial.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initial.getMonth()); // 0–11
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [drawerKey, setDrawerKey] = useState<string | null>(null);

  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const todayKey = useMemo(() => {
    return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  }, []);

  // Go to previous / next month
  const goMonth = (delta: number) => {
    const d = new Date(currentYear, currentMonth + delta, 1);
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
  };

  // All month keys we have news for, e.g. "2025-11"
  const monthKeysWithPosts = useMemo(
    () => new Set(dateKeysWithPosts.map((k) => k.slice(0, 7))),
    [dateKeysWithPosts],
  );

  const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(
    2,
    '0',
  )}`;

  const firstOfMonth = new Date(currentYear, currentMonth, 1);
  const firstWeekday = firstOfMonth.getDay(); // 0 = Sun
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Which day numbers in *this month* have posts?
  const daysWithPosts = useMemo(() => {
    const set = new Set<number>();
    for (const key of dateKeysWithPosts) {
      const [yStr, mStr, dStr] = key.split('-');
      const y = Number(yStr);
      const m = Number(mStr) - 1;
      const d = Number(dStr);
      if (y === currentYear && m === currentMonth) {
        set.add(d);
      }
    }
    return set;
  }, [dateKeysWithPosts, currentYear, currentMonth]);

  // Default selectedKey to the latest date in this month (if we have one)
  useEffect(() => {
    if (!selectedKey) {
      const keysForMonth = dateKeysWithPosts
        .filter((k) => k.startsWith(currentMonthKey))
        .sort();
      if (keysForMonth.length) {
        setSelectedKey(keysForMonth[keysForMonth.length - 1]);
      }
    }
  }, [currentMonthKey, dateKeysWithPosts, selectedKey]);

  const handleDayClick = (dateKey: string) => {
    setSelectedKey(dateKey);

    const posts = postsForDate[dateKey] ?? [];

    if (posts.length === 1) {
      // one news item – go straight to details
      router.push(`/news/${posts[0].id}`);
      return;
    }

    // multiple posts -> open drawer and scroll to the section
    if (posts.length > 1) {
      setDrawerKey(dateKey);
    } else {
      setDrawerKey(null);
    }

    const el = document.getElementById(`news-${dateKey}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDayHover = (dateKey: string | null) => {
    setHoveredKey(dateKey);
  };

  const hoveredPosts = hoveredKey ? postsForDate[hoveredKey] ?? [] : [];
  const drawerPosts = drawerKey ? postsForDate[drawerKey] ?? [] : [];

  return (
    <aside className="card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-brand-900">
            News by date
          </h2>
          <p className="text-xs text-gray-600">
            Click a highlighted day to jump to that day&apos;s news.
          </p>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            className="h-6 w-6 rounded-full border border-emerald-100 text-xs text-emerald-800 hover:bg-emerald-50"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => goMonth(1)}
            className="h-6 w-6 rounded-full border border-emerald-100 text-xs text-emerald-800 hover:bg-emerald-50"
          >
            ›
          </button>
        </div>
      </div>

      {/* Month label */}
      <div className="flex items-center justify-between mb-1 text-xs font-medium text-gray-700">
        <span>
          {firstOfMonth.toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
          })}
        </span>
        {!monthKeysWithPosts.has(currentMonthKey) && (
          <span className="text-[10px] text-gray-400">
            No news this month
          </span>
        )}
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 text-[10px] text-gray-500 mb-1">
        {weekdayLabels.map((label) => (
          <div key={label} className="text-center">
            {label}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1 text-xs">
        {/* empty cells before the 1st */}
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const hasNews = daysWithPosts.has(dayNum);

          const dateKey = `${currentYear}-${String(
            currentMonth + 1,
          ).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

          const isSelected = selectedKey === dateKey;
          const isToday = todayKey === dateKey;

          const baseClasses =
            'h-7 flex items-center justify-center rounded-full text-[11px]';

          let classes = `${baseClasses} text-gray-500`;

          if (hasNews) {
            classes = isSelected
              ? `${baseClasses} bg-brand-600 text-white border border-brand-600`
              : `${baseClasses} bg-emerald-100 text-emerald-800 font-semibold hover:bg-emerald-200 border border-emerald-200 cursor-pointer`;
          }

          if (isToday) {
            // subtle ring around today
            classes += ' ring-1 ring-offset-1 ring-emerald-200';
          }

          if (hasNews) {
            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => handleDayClick(dateKey)}
                onMouseEnter={() => handleDayHover(dateKey)}
                onMouseLeave={() => handleDayHover(null)}
                className={classes}
              >
                {dayNum}
              </button>
            );
          }

          return (
            <div key={dayNum} className={classes}>
              {dayNum}
            </div>
          );
        })}
      </div>

      {/* Hover preview */}
      {hoveredPosts.length > 0 && (
        <div className="mt-2 rounded-xl border border-emerald-50 bg-emerald-50/40 px-3 py-2">
          <p className="text-[11px] font-semibold text-emerald-900 mb-1">
            {hoveredPosts.length === 1
              ? 'News on this day'
              : `${hoveredPosts.length} news items on this day`}
          </p>
          <ul className="space-y-0.5">
            {hoveredPosts.slice(0, 3).map((p) => (
              <li key={p.id} className="text-[11px] text-gray-700 line-clamp-1">
                • {p.title}
              </li>
            ))}
            {hoveredPosts.length > 3 && (
              <li className="text-[11px] text-gray-500">…more</li>
            )}
          </ul>
        </div>
      )}

      {/* Drawer for multiple posts on selected day */}
      {drawerKey && drawerPosts.length > 1 && (
        <div className="mt-3 rounded-xl border border-emerald-100 bg-white shadow-sm px-3 py-2">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-semibold text-emerald-900">
              All news on this day
            </p>
            <button
              type="button"
              onClick={() => setDrawerKey(null)}
              className="text-[10px] text-gray-400 hover:text-gray-600"
            >
              Close
            </button>
          </div>
          <ul className="space-y-1">
            {drawerPosts.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/news/${p.id}`)}
                  className="text-[11px] text-emerald-700 hover:underline text-left w-full"
                >
                  • {p.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
