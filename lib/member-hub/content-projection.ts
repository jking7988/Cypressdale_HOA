import { assetUrl, type ContentRecord } from './content';

type StoredContent = ContentRecord & { created_at?: string; updated_at?: string };
type Asset = { id: string; mime_type: string; original_filename: string };

export function projectContent(row: StoredContent, assets: Map<string, Asset>, folders: Map<string, StoredContent>) {
  const settings = row.settings;
  const file = assets.get(settings.file?.asset?._ref);
  const flyer = assets.get(settings.flyer?.asset?._ref);
  const folder = folders.get(settings.folder?._ref);
  const photoUrls = (settings.photos ?? []).map(assetUrl).filter(Boolean);
  return {
    ...settings, _id: row.id, title: row.title, slug: row.slug ? { current: row.slug } : undefined,
    body: row.body, _createdAt: row.created_at, _updatedAt: row.updated_at,
    sections: row.sections.map(section => ({ ...section, imageUrl: assetUrl(section.image),
      imageAlt: section.image?.alt ?? '', backgroundImageUrl: assetUrl(section.backgroundImage) })),
    startDate: settings.startDate ?? settings.start, endDate: settings.endDate ?? settings.end,
    rsvpYes: settings.rsvpYes ?? 0, rsvpMaybe: settings.rsvpMaybe ?? 0,
    flyerUrl: assetUrl(settings.flyer), flyerMime: flyer?.mime_type, flyerName: flyer?.original_filename,
    fileUrl: assetUrl(settings.file), fileName: file?.original_filename,
    folderId: folder?.id, folderTitle: folder?.title, folderDescription: folder?.settings.description,
    folderOrder: folder?.settings.sortOrder, uploadedAt: settings.uploadedAt ?? row.updated_at,
    photoUrl: assetUrl(settings.photo) || photoUrls[0], photoUrls,
  };
}

