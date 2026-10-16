'use server';

import { revalidatePath } from 'next/cache';
import { newsletterSettingsId, newsletterSettingsSchema } from './template';
import { saveContent } from '@/lib/member-hub/content-actions';
import { createHubSessionClient, getHubAccount } from '@/lib/member-hub/server';
import { newsletterBackgroundAsset } from './background';

export async function saveNewsletterSettings(input: unknown, version: number) {
  const parsed = newsletterSettingsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Check newsletter customization.' };
  if (!Number.isSafeInteger(version) || version < 0) return { error: 'Reload the newsletter before saving.' };
  if (parsed.data.backgroundImage) {
    try {
      await getHubAccount(await createHubSessionClient(), 'admin');
      if (!await newsletterBackgroundAsset(parsed.data.backgroundImage._ref, false)) {
        return { error: 'Choose an image from Files that is not used by member-only content, or upload a separate copy.' };
      }
    } catch { return { error: 'Unable to validate the newsletter background. Please sign in and try again.' }; }
  }
  const result = await saveContent({ id: newsletterSettingsId, kind: 'page', title: 'Newsletter customization', slug: null,
    status: 'draft', visibility: 'members', body: [], sections: [], settings: { newsletterSettings: parsed.data } }, version || null);
  if (!result.content) return { error: result.error || 'Unable to save newsletter customization.' };
  revalidatePath('/admin/newsletter');
  return { settings: parsed.data, version: result.content.version };
}
