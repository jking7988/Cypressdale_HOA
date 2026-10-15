import { NextResponse } from 'next/server';
import { createHubStorageClient, getHubRequestContext, HubAccessError } from '@/lib/member-hub/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { client } = await getHubRequestContext(request, 'optional');
    // Resolve metadata with the caller's RLS permissions before using storage credentials.
    const { data: asset, error } = await client.from('hoa_assets')
      .select('bucket_id, object_path, original_filename, mime_type').eq('id', id).maybeSingle();
    if (error) throw new HubAccessError(503, 'File access is temporarily unavailable.');
    if (!asset) throw new HubAccessError(404, 'File not found.');
    const { data: file, error: downloadError } = await createHubStorageClient().storage
      .from(asset.bucket_id).download(asset.object_path);
    if (downloadError || !file) throw new HubAccessError(404, 'File not found.');
    const safeImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(asset.mime_type);
    const viewPdf = asset.mime_type === 'application/pdf' && new URL(request.url).searchParams.get('view') === '1';
    const filename = encodeURIComponent(asset.original_filename).replace(/['()*]/g, (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
    return new Response(file, {
      headers: {
        'Content-Type': safeImage || viewPdf ? asset.mime_type : 'application/octet-stream',
        'Content-Disposition': `${safeImage || viewPdf ? 'inline' : 'attachment'}; filename*=UTF-8''${filename}`,
        'Cache-Control': 'private, no-store, max-age=0',
        'Vary': 'Authorization, Cookie',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    const known = error instanceof HubAccessError;
    return NextResponse.json({ error: known ? error.message : 'File access is temporarily unavailable.' }, {
      status: known ? error.status : 503,
      headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Authorization, Cookie' },
    });
  }
}
