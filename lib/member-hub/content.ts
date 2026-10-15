import { z } from 'zod';

export const contentKinds = ['post', 'event', 'page', 'documentFile', 'documentFolder', 'yardWinner', 'holidayWinner'] as const;
export type ContentKind = typeof contentKinds[number];
export const kindLabels: Record<ContentKind, string> = { post: 'News', event: 'Event', page: 'Page', documentFile: 'Document', documentFolder: 'Folder', yardWinner: 'Yard Winner', holidayWinner: 'Holiday Winner' };
export const settingsFields: Record<ContentKind, string[]> = {
  post: ['topic', 'excerpt', 'newsDate', 'publishedAt', 'layoutVariant', 'showRightSidebar', 'showCalendar', 'showNewsletterSignup'],
  event: ['description', 'excerpt', 'location', 'startDate', 'endDate', 'start', 'end', 'isMultiDayEvent', 'secondStartDate', 'secondEndDate', 'rsvpYes', 'rsvpMaybe', 'flyer', 'layoutVariant', 'showRightSidebar', 'showCalendar', 'showNewsletterSignup'],
  page: ['layoutVariant', 'showRightSidebar', 'showCalendar', 'showNewsletterSignup', 'programSettings'], documentFile: ['description', 'category', 'folder', 'file', 'uploadedAt'],
  documentFolder: ['description', 'sortOrder'], yardWinner: ['description', 'month', 'streetOrBlock', 'photos'],
  holidayWinner: ['description', 'holiday', 'year', 'section', 'place', 'streetOrBlock', 'photo', 'photos'],
};
export type ContentRecord = {
  id: string; kind: ContentKind; title: string; slug: string | null; status: 'draft' | 'published'; visibility: 'public' | 'members';
  body: any[]; sections: any[]; settings: Record<string, any>; version: number; updated_at?: string;
};
export type MediaAsset = { id: string; original_filename: string; mime_type: string; object_path: string; library?: 'files' | 'documents' };

export const contentSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_.:-]{1,200}$/), kind: z.enum(contentKinds), title: z.string().trim().min(1, 'Enter a title.').max(300),
  slug: z.string().max(200).nullable(), status: z.enum(['draft', 'published']), visibility: z.enum(['public', 'members']),
  body: z.array(z.record(z.unknown())).max(1000), sections: z.array(z.record(z.unknown())).max(100),
  settings: z.record(z.unknown()),
}).transform(document => ({ ...document, settings: Object.fromEntries(Object.entries(document.settings).filter(([key]) => settingsFields[document.kind].includes(key))) }));

export function assetUrl(value: any) {
  const id = value?.asset?._ref || value?._ref;
  return typeof id === 'string' ? `/api/member-hub/assets/${encodeURIComponent(id)}` : '';
}

export function newContent(kind: ContentKind): ContentRecord {
  return { id: crypto.randomUUID(), kind, title: '', slug: null, status: 'draft', visibility: 'public', body: [], sections: [], settings: { showCalendar: false, showNewsletterSignup: false }, version: 0 };
}
