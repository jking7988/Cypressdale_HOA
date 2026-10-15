'use server';

import { createHash, randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { contentSchema } from './content';
import { createHubSessionClient, createHubStorageClient, getHubAccount, HubAccessError } from './server';

export async function saveContent(input: unknown, version: number | null, publishedVersion: number | null = null) {
  try {
    const parsed = contentSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Check the page fields.' };
    const client = await createHubSessionClient();
    await getHubAccount(client, 'admin');
    const { data, error } = await client.rpc('hoa_save_content', { document: parsed.data, expected_version: version, published_version: publishedVersion });
    if (error) return { error: /changed|missing|different visibility|Cannot change content type|Published document requires|Folder contains|Document files|Documents library/.test(error.message) ? error.message : 'Unable to save this page. Check its fields and attachments.' };
    revalidatePath('/admin/content'); revalidatePath('/members'); revalidatePath(`/content/${data.id}`);
    return { content: data };
  } catch (error) { return { error: error instanceof HubAccessError ? error.message : 'Unable to save this page.' }; }
}

export async function uploadMedia(form: FormData) {
  return uploadAsset(form, 'files');
}

export async function removeContent(id: string, version: number) {
  try {
    const client = await createHubSessionClient();
    await getHubAccount(client, 'admin');
    const result = await client.rpc('hoa_delete_content', { target_id: id, expected_version: version });
    if (result.error) return { error: /Content (?:changed|not found|has)|A separate draft|Other content references|dedicated section/.test(result.error.message)
      ? result.error.message : 'Unable to delete this content. Please try again.' };
    for (const path of ['/admin/content', '/members', '/', '/news', '/events', `/news/${id}`, `/events/${id}`, `/content/${id}`]) revalidatePath(path);
    return { success: true };
  } catch (error) { return { error: error instanceof HubAccessError ? error.message : 'Unable to delete this content.' }; }
}

export async function uploadDocumentMedia(form: FormData) {
  return uploadAsset(form, 'documents');
}

async function uploadAsset(form: FormData, library: 'files' | 'documents') {
  try {
    const client = await createHubSessionClient();
    await getHubAccount(client, 'admin');
    const file = form.get('file');
    if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024) return { error: 'Choose a file up to 10 MB.' };
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const head = Buffer.from(buffer);
    const mime = head.subarray(0, 4).toString() === '%PDF' ? 'application/pdf'
      : [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value) ? 'image/png'
      : bytes[0] === 255 && bytes[1] === 216 ? 'image/jpeg'
      : head.subarray(0, 3).toString() === 'GIF' ? 'image/gif'
      : head.subarray(0, 4).toString() === 'RIFF' && head.subarray(8, 12).toString() === 'WEBP' ? 'image/webp' : null;
    if (!mime) return { error: 'Choose a JPEG, PNG, WebP, GIF image or PDF.' };
    const id = `upload-${randomUUID()}`;
    const objectPath = `uploads/${id}`;
    const storage = createHubStorageClient();
    const { error: uploadError } = await storage.storage.from('hoa-content').upload(objectPath, bytes, { contentType: mime });
    if (uploadError) return { error: 'Unable to upload the file.' };
    const asset = { id, library, object_path: objectPath, original_filename: file.name.slice(0, 250), mime_type: mime,
      size_bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
    const { error } = await client.from('hoa_assets').insert(asset);
    if (error) { await storage.storage.from('hoa-content').remove([objectPath]); return { error: 'Unable to register the file.' }; }
    revalidatePath('/admin/content'); revalidatePath('/admin/files'); revalidatePath('/admin/documents');
    return { asset };
  } catch (error) { return { error: error instanceof HubAccessError ? error.message : 'Unable to upload the file.' }; }
}
