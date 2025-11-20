// app/api/preview/route.ts
// @ts-nocheck

const PREVIEW_SECRET = '8f4b1e3c-2f4f-4f6d-9f6e-5e3d6c7b8a9b'; // 👈 same as your URL

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const type = searchParams.get('type'); // 'post' | 'event'
  const id = searchParams.get('id');

  // Validate secret
  if (!secret || secret !== PREVIEW_SECRET) {
    return new Response('Invalid secret', { status: 401 });
  }

  // Basic param check
  if (!id || !type) {
    return new Response('Missing id/type', { status: 400 });
  }

  // Decide where to go
  let path = '/';
  if (type === 'post') {
    path = `/news/${id}`;
  } else if (type === 'event') {
    path = `/events/${id}`;
  }

  // Redirect to the normal page (no draftMode)
  const redirectUrl = new URL(path, request.url);
  return Response.redirect(redirectUrl);
}
