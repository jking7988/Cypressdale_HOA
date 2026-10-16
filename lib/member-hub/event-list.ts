import { formatInTimeZone } from 'date-fns-tz';

export type CommunityEvent = {
  _id: string;
  title: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isMultiDayEvent?: boolean;
  secondStartDate?: string;
  secondEndDate?: string;
  _createdAt?: string;
  _publishedAt?: string | null;
  rsvpYes?: number;
  rsvpMaybe?: number;
  flyerUrl?: string;
  flyerMime?: string;
  flyerName?: string;
  sections?: { imageUrl?: string; imageAlt?: string; fileUrl?: string; fileMime?: string; fileName?: string }[];
};

export function eventRanges(event: CommunityEvent) {
  const ranges: { start: Date; end: Date }[] = [];
  const add = (startValue?: string, endValue?: string) => {
    const start = new Date(startValue || '');
    if (!Number.isFinite(start.getTime())) return;
    const end = new Date(endValue || startValue || '');
    ranges.push({ start, end: !Number.isFinite(end.getTime()) || end < start ? start : end });
  };
  add(event.startDate, event.endDate);
  if (event.isMultiDayEvent) add(event.secondStartDate, event.secondEndDate);
  return ranges;
}

export function eventDay(date: Date) {
  return formatInTimeZone(date, 'America/Chicago', 'yyyy-MM-dd');
}

export function eventsForDisplay(events: CommunityEvent[], period: 'upcoming' | 'past', now: Date, day?: string | null) {
  const today = eventDay(now);
  const posted = (event: CommunityEvent) => {
    const date = Date.parse(event._publishedAt || event._createdAt || '');
    return Number.isFinite(date) ? date : 0;
  };
  return events.filter(event => {
    const ranges = eventRanges(event);
    const upcoming = !ranges.length || ranges.some(range => eventDay(range.end) >= today);
    return upcoming === (period === 'upcoming') && (!day || ranges.some(range => eventDay(range.start) <= day && eventDay(range.end) >= day));
  }).sort((a, b) => posted(b) - posted(a) || a._id.localeCompare(b._id));
}
