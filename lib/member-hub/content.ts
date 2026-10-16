import { z } from 'zod';
import { toPlainText } from '@portabletext/react';
import type { PortableTextBlock } from '@portabletext/types';

export const contentKinds = ['post', 'event', 'page', 'documentFile', 'documentFolder', 'yardWinner', 'holidayWinner'] as const;
export type ContentKind = typeof contentKinds[number];
export const kindLabels: Record<ContentKind, string> = { post: 'News', event: 'Event', page: 'Page', documentFile: 'Document', documentFolder: 'Folder', yardWinner: 'Yard Winner', holidayWinner: 'Holiday Winner' };
export const settingsFields: Record<ContentKind, string[]> = {
  post: ['titleRichText', 'topic', 'excerpt', 'newsDate', 'publishedAt', 'layoutVariant', 'showRightSidebar', 'showCalendar', 'showNewsletterSignup'],
  event: ['titleRichText', 'description', 'excerpt', 'location', 'startDate', 'endDate', 'start', 'end', 'isMultiDayEvent', 'secondStartDate', 'secondEndDate', 'rsvpYes', 'rsvpMaybe', 'flyer', 'layoutVariant', 'showRightSidebar', 'showCalendar', 'showNewsletterSignup'],
  page: ['titleRichText', 'layoutVariant', 'showRightSidebar', 'showCalendar', 'showNewsletterSignup', 'programSettings', 'newsletterSettings'], documentFile: ['description', 'category', 'folder', 'file', 'uploadedAt'],
  documentFolder: ['description', 'sortOrder'], yardWinner: ['description', 'month', 'streetOrBlock', 'photos'],
  holidayWinner: ['description', 'holiday', 'year', 'section', 'place', 'streetOrBlock', 'photo', 'photos'],
};
export type ContentRecord = {
  id: string; kind: ContentKind; title: string; slug: string | null; status: 'draft' | 'published'; visibility: 'public' | 'members';
  body: any[]; sections: any[]; settings: Record<string, any>; version: number; updated_at?: string;
};
export type MediaAsset = { id: string; original_filename: string; mime_type: string; object_path: string; library?: 'files' | 'documents' };

export function plainTitle(value: unknown): string {
  if (!Array.isArray(value)) return '';
  const blocks = value.filter(block => block?._type === 'block' && Array.isArray(block.children)).map(block => ({
    ...block, children: block.children.filter((child: any) => child?._type === 'span' && typeof child.text === 'string'),
  }));
  return toPlainText(blocks as PortableTextBlock[]).replace(/\s+/g, ' ').trim();
}

export function titleEditorValue(title: string, richText: unknown): any[] {
  if (Array.isArray(richText)) return richText;
  return title ? [{ _type: 'block', _key: 'title-block', style: 'normal', markDefs: [],
    children: [{ _type: 'span', _key: 'title-span', text: title, marks: [] }] }] : [];
}

export function eventScheduleError(document: Pick<ContentRecord, 'kind' | 'status' | 'settings'>) {
  if (document.kind !== 'event' || document.status !== 'published') return null;
  const start = document.settings.startDate || document.settings.start;
  if (typeof start !== 'string' || !Number.isFinite(Date.parse(start))) {
    return 'Add an event start date in Page Settings, under Event Details, before publishing. Dates on a flyer are not added to the calendar automatically.';
  }
  return null;
}

export const contentSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_.:-]{1,200}$/), kind: z.enum(contentKinds), title: z.string().trim().min(1, 'Enter a title.').max(300),
  slug: z.string().max(200).nullable(), status: z.enum(['draft', 'published']), visibility: z.enum(['public', 'members']),
  body: z.array(z.record(z.unknown())).max(1000), sections: z.array(z.record(z.unknown())).max(100),
  settings: z.record(z.unknown()),
}).transform(document => {
  const settings = Object.fromEntries(Object.entries(document.settings).filter(([key]) => settingsFields[document.kind].includes(key)));
  return { ...document, title: Array.isArray(settings.titleRichText) ? plainTitle(settings.titleRichText) : document.title, settings };
})
  .superRefine((document, context) => {
    if (document.settings.titleRichText !== undefined && !z.array(z.record(z.unknown())).max(30).safeParse(document.settings.titleRichText).success) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['settings', 'titleRichText'], message: 'Check the title formatting.' });
    }
    if (!document.title || document.title.length > 300) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['title'], message: 'Enter a title between 1 and 300 characters.' });
    }
    const message = eventScheduleError(document);
    if (message) context.addIssue({ code: z.ZodIssueCode.custom, path: ['settings', 'startDate'], message });
  });

export function assetUrl(value: any) {
  const id = value?.asset?._ref || value?._ref;
  return typeof id === 'string' ? `/api/member-hub/assets/${encodeURIComponent(id)}` : '';
}

export function newContent(kind: ContentKind): ContentRecord {
  return { id: crypto.randomUUID(), kind, title: '', slug: null, status: 'draft', visibility: 'public', body: [], sections: [], settings: { showCalendar: false, showNewsletterSignup: false }, version: 0 };
}
