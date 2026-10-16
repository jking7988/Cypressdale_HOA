import 'server-only';
import { createHubStorageClient } from '@/lib/member-hub/server';
import { newsletterSettingsId, newsletterSettingsSchema } from './template';

export async function loadNewsletterSettings() {
  const result = await createHubStorageClient().from('hoa_content').select('kind,status,visibility,settings,version').eq('id', newsletterSettingsId).maybeSingle();
  if (result.error) throw new Error('Unable to load newsletter customization.');
  if (result.data && (result.data.kind !== 'page' || result.data.status !== 'draft' || result.data.visibility !== 'members')) {
    throw new Error('Newsletter customization must remain an admin-only draft.');
  }
  return { settings: newsletterSettingsSchema.parse(result.data?.settings.newsletterSettings ?? {}), version: result.data?.version ?? 0 };
}
