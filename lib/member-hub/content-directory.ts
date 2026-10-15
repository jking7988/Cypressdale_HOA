import type { ContentRecord } from './content';

export type ContentGroup = { id: string; saved?: ContentRecord; draft?: ContentRecord; current: ContentRecord };

export function groupContent(records: ContentRecord[]): ContentGroup[] {
  const groups = new Map<string, ContentGroup>();
  for (const record of records) {
    const isDraft = record.id.startsWith('drafts.');
    const id = isDraft ? record.id.slice(7) : record.id;
    const group = groups.get(id) || { id, current: record };
    if (isDraft) group.draft = record; else group.saved = record;
    group.current = group.draft || group.saved!;
    groups.set(id, group);
  }
  return [...groups.values()];
}

export function filterContent(groups: ContentGroup[], query: string, kind: string, status: string) {
  const search = query.trim().toLowerCase();
  return groups.filter(group => {
    const versions = [group.saved, group.draft].filter((record): record is ContentRecord => !!record);
    return versions.some(record => record.title.toLowerCase().includes(search))
      && versions.some(record => (kind === 'all' || record.kind === kind) && (status === 'all' || record.status === status));
  });
}
