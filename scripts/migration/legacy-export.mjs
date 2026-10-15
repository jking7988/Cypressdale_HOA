// Offline archive compatibility only; no CMS clients, tokens or network access.
export function parseExport(raw) {
  const documents = raw.split(/\r?\n/).filter(line => line.trim()).map(JSON.parse);
  const ids = new Set();
  for (const document of documents) {
    if (!document._id || !document._type || ids.has(document._id)) {
      throw new Error('Export contains an invalid or duplicate document.');
    }
    ids.add(document._id);
  }
  return documents;
}

export function analyzeDocuments(documents) {
  const counts = {}, sectionTypes = {}, references = [], fieldsByType = {};
  const ids = new Set(documents.map(document => document._id));
  let embeddedRsvps = 0, drafts = 0;
  function visit(value, documentId, location) {
    if (!value || typeof value !== 'object') return;
    if (typeof value._ref === 'string' && !value._projectId && !value._dataset && !ids.has(value._ref) && !ids.has(`drafts.${value._ref}`)) {
      references.push({ documentId, location, reference: value._ref, weak: !!value._weak });
    }
    for (const [key, child] of Object.entries(value)) visit(child, documentId, `${location}.${key}`);
  }
  for (const document of documents) {
    counts[document._type] = (counts[document._type] || 0) + 1;
    if (document._id.startsWith('drafts.')) drafts++;
    fieldsByType[document._type] ||= new Set();
    for (const field of Object.keys(document)) fieldsByType[document._type].add(field);
    for (const section of document.sections || []) sectionTypes[section._type || 'unknown'] = (sectionTypes[section._type || 'unknown'] || 0) + 1;
    if (document._type === 'event' && Array.isArray(document.rsvps)) embeddedRsvps += document.rsvps.length;
    visit(document, document._id, '$');
  }
  return {
    documentCount: documents.length, counts, drafts, embeddedRsvps, sectionTypes,
    fieldsByType: Object.fromEntries(Object.entries(fieldsByType).map(([type, fields]) => [type, [...fields].sort()])),
    unresolvedReferences: references,
  };
}
