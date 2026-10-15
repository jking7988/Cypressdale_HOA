import { createHash } from 'node:crypto';

const fields = {
  post: ['topic', 'excerpt', 'newsDate', 'publishedAt', 'layoutVariant', 'showRightSidebar', 'showCalendar', 'showNewsletterSignup'],
  event: ['description', 'excerpt', 'location', 'startDate', 'endDate', 'start', 'end', 'isMultiDayEvent', 'secondStartDate', 'secondEndDate', 'rsvpYes', 'rsvpMaybe', 'flyer', 'layoutVariant', 'showRightSidebar', 'showCalendar', 'showNewsletterSignup'],
  page: ['layoutVariant', 'showRightSidebar', 'showCalendar', 'showNewsletterSignup'],
  documentFile: ['description', 'category', 'folder', 'file', 'uploadedAt'],
  documentFolder: ['description', 'sortOrder'],
  yardWinner: ['description', 'month', 'streetOrBlock', 'photos'],
  holidayWinner: ['description', 'holiday', 'year', 'section', 'place', 'streetOrBlock', 'photo', 'photos'],
};

export function stableId(source) {
  const hash = createHash('sha256').update(source).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export function buildImport(documents) {
  const content = documents.filter(document => fields[document._type]).map(document => ({
    id: document._id, kind: document._type, title: document.title || 'Untitled', slug: document.slug?.current || null,
    status: document._id.startsWith('drafts.') ? 'draft' : 'published', visibility: 'public',
    body: document.body || [], sections: document.sections || [],
    settings: Object.fromEntries(fields[document._type].filter(field => document[field] !== undefined).map(field => [field, document[field]])),
    source_revision: document._rev, created_at: document._createdAt, updated_at: document._updatedAt,
    published_at: document.publishedAt || document.newsDate || document._createdAt,
  }));
  const ids = new Set(content.map(item => item.id));
  const comments = [], rsvps = [], contacts = [], parents = [];
  const seenRsvps = new Set();
  for (const document of documents.filter(item => item._type === 'eventComment')) {
    const contentId = document.event?._ref || document.post?._ref;
    if (!ids.has(contentId)) throw new Error('A comment references missing content.');
    comments.push({ id: stableId(document._id), source_id: document._id, content_id: contentId,
      author_id: null, display_name: document.name || 'Resident', message: document.message,
      created_at: document.createdAt || document._createdAt });
    if (document.email) contacts.push({ source_id: document._id, email: document.email });
    if (document.parentComment?._ref) parents.push({ id: stableId(document._id), parent_id: stableId(document.parentComment._ref) });
  }
  // Published copies take precedence; duplicate embedded RSVP keys are imported once.
  for (const document of [...documents].sort((a, b) => Number(a._id.startsWith('drafts.')) - Number(b._id.startsWith('drafts.')))) {
    const responses = document._type === 'event' ? document.rsvps || [] : document._type === 'rsvpResponse' ? [document] : [];
    for (const response of responses) {
      const canonicalId = (document._type === 'event' ? document._id : response.event?._ref)?.replace(/^drafts\./, '');
      const sourceId = document._type === 'event' ? `${canonicalId}:rsvp:${response._key}` : response._id;
      if (seenRsvps.has(sourceId)) continue;
      seenRsvps.add(sourceId);
      const contentId = document._type === 'event' ? document._id : response.event?._ref;
      if (!ids.has(contentId)) throw new Error('An RSVP references missing content.');
      rsvps.push({ id: stableId(sourceId), source_id: sourceId, content_id: contentId, author_id: null,
        display_name: response.name || 'Resident', status: response.status, created_at: response.createdAt || document._createdAt });
      if (response.email) contacts.push({ source_id: sourceId, email: response.email });
    }
  }
  return { content, comments, rsvps, contacts, parents };
}
