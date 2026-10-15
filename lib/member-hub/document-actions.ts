'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { contentSchema } from './content';
import { saveContent } from './content-actions';
import { createHubSessionClient, getHubAccount, HubAccessError } from './server';

export async function saveDocument(input: unknown, version: number | null) {
  const parsed = contentSchema.safeParse(input);
  if (!parsed.success || !['documentFile', 'documentFolder'].includes(parsed.data.kind)) return { error: 'Check the document fields.' };
  if (parsed.data.kind === 'documentFile' && !z.object({ asset: z.object({ _ref: z.string().min(1) }) }).safeParse(parsed.data.settings.file).success) return { error: 'Choose a document file.' };
  const result = await saveContent(parsed.data, version);
  if (result.content) { revalidatePath('/admin/documents'); revalidatePath('/documents'); }
  return result;
}

export async function removeDocument(id: string, version: number) {
  try {
    const client = await createHubSessionClient();
    await getHubAccount(client, 'admin');
    const { error } = await client.rpc('hoa_delete_document', { target_id: id, expected_version: version });
    if (error) return { error: /changed|contains documents|not found/.test(error.message) ? error.message : 'Unable to remove this item.' };
    revalidatePath('/admin/documents'); revalidatePath('/admin/content'); revalidatePath('/documents');
    return { success: true };
  } catch (error) { return { error: error instanceof HubAccessError ? error.message : 'Unable to remove this item.' }; }
}
