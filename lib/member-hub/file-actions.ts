'use server';

import { revalidatePath } from 'next/cache';
import { createHubSessionClient, createHubStorageClient, getHubAccount, HubAccessError } from './server';

async function cleanup() {
  const storage = createHubStorageClient();
  const pending = await storage.rpc('hoa_pending_file_cleanup');
  if (pending.error) throw new Error('Unable to load pending cleanup.');
  let remaining = 0;
  for (const item of pending.data || []) {
    const result = await storage.storage.from(item.bucket_id).remove([item.object_path]);
    if (result.error) { remaining++; continue; }
    const marked = await storage.rpc('hoa_mark_file_cleaned', { target_id: item.id });
    if (marked.error) remaining++;
  }
  return remaining;
}

export async function removeFile(id: string) {
  try {
    const client = await createHubSessionClient();
    await getHubAccount(client, 'admin');
    const result = await client.rpc('hoa_remove_file', { target_id: id });
    if (result.error) return { error: /in use|not found|Document files/.test(result.error.message) ? result.error.message : 'Unable to remove this file.' };
    let pending = true;
    try { pending = (await cleanup()) > 0; } catch { /* Retired bytes remain private until cleanup can be retried. */ }
    revalidatePath('/admin/files'); revalidatePath('/admin/content');
    return { success: true, pending };
  } catch (error) { return { error: error instanceof HubAccessError ? error.message : 'Unable to remove this file.' }; }
}

export async function retryFileCleanup() {
  try {
    await getHubAccount(await createHubSessionClient(), 'admin');
    const remaining = await cleanup();
    revalidatePath('/admin/files');
    return remaining ? { error: 'Some files are still pending storage cleanup.' } : { success: true };
  } catch (error) { return { error: error instanceof HubAccessError ? error.message : 'Storage cleanup is temporarily unavailable.' }; }
}
