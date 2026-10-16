import 'server-only';
import { createHubStorageClient, HubAccessError } from '@/lib/member-hub/server';
import { newsletterSettingsId } from './template';
import { newsletterTables } from './tables';

export const newsletterImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function newsletterBackgroundAsset(id: string, requireSelected = true) {
  const client = createHubStorageClient();
  if (requireSelected) {
    const current = await client.from('hoa_content').select('id').eq('id', newsletterSettingsId)
      .eq('kind', 'page').eq('status', 'draft').eq('visibility', 'members')
      .eq('settings->newsletterSettings->backgroundImage->>_ref', id).maybeSingle();
    if (current.error) throw new HubAccessError(503, 'Background access is temporarily unavailable.');
    if (!current.data) {
      const campaign = await client.from(newsletterTables().runs).select('id')
        .eq('payload->settings->backgroundImage->>_ref', id).limit(1).maybeSingle();
      if (campaign.error) throw new HubAccessError(503, 'Background access is temporarily unavailable.');
      if (!campaign.data) return null;
    }
  }
  const asset = await client.from('hoa_assets').select('id,bucket_id,object_path,original_filename,mime_type,library')
    .eq('id', id).eq('library', 'files').in('mime_type', newsletterImageTypes).maybeSingle();
  if (asset.error) throw new HubAccessError(503, 'Background access is temporarily unavailable.');
  if (!asset.data) return null;
  // Selecting a newsletter background must never expose an image used by member-only content.
  const privateUse = await client.from('hoa_content_assets').select('content:hoa_content!inner(id,visibility)')
    .eq('asset_id', id).eq('content.visibility', 'members').neq('content.id', newsletterSettingsId).limit(1);
  if (privateUse.error) throw new HubAccessError(503, 'Background access is temporarily unavailable.');
  return privateUse.data?.length ? null : asset.data;
}
