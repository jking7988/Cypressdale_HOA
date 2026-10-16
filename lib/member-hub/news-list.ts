import { formatInTimeZone } from 'date-fns-tz';
import type { PortableTextBlock } from '@portabletext/types';

export type CommunityNews = {
  _id: string;
  title: string;
  excerpt?: PortableTextBlock[];
  body?: PortableTextBlock[];
  newsDate?: string;
  _publishedAt?: string;
  publishedAt?: string;
  _createdAt?: string;
  sections?: { imageUrl?: string; imageAlt?: string; fileUrl?: string; fileMime?: string; fileName?: string }[];
};

function validDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function newsDay(post: CommunityNews): string | null {
  for (const value of [post.newsDate, post._publishedAt, post.publishedAt, post._createdAt]) {
    const date = validDate(value);
    if (date) return /^\d{4}-\d{2}-\d{2}$/.test(value!) ? value! : formatInTimeZone(date, 'America/Chicago', 'yyyy-MM-dd');
  }
  return null;
}

function publicationTime(post: CommunityNews) {
  // Publication order is independent of a backdated news/calendar date.
  for (const value of [post._publishedAt, post.publishedAt, post._createdAt, post.newsDate]) {
    const date = validDate(value);
    if (date) return date.getTime();
  }
  return 0;
}

export function newsForDisplay(posts: CommunityNews[], day?: string | null) {
  return posts.filter(post => !day || newsDay(post) === day)
    .sort((a, b) => publicationTime(b) - publicationTime(a) || a._id.localeCompare(b._id));
}
