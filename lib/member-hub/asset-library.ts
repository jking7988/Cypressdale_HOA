import type { MediaAsset, ContentKind } from './content';

export type LibraryAsset = MediaAsset & { size_bytes: number; created_at?: string;
  usage: { id: string; title: string; kind: ContentKind; status: string }[] };

export function collectReferences(value: unknown, references = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach(item => collectReferences(item, references));
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === '_ref' && typeof item === 'string') references.add(item);
      else collectReferences(item, references);
    }
  }
  return references;
}
