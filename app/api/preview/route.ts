// app/api/preview/route.ts
// @ts-nocheck

const PREVIEW_SECRET = '8f4b1e3c-2f4f-4f6d-9f6e-5e3d6c7b8a9b';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const type = searchParams.get('type');  // 'post' | 'event'
  const id = searchParams.get('id');

  // Secret guard
  if (!secret || secret !== PREVIEW_SECRET) {
    return new Response('Invalid secret', { status: 401 });
  }

  // Decide where to go
  let path = '/';

  if (type === 'post' && id) {
    path = `/news/${id}`;
  } else if (type === 'event' && id) {
    path = `/events/${id}`;
  }

  const url = new URL(path, request.url);
  return Response.redirect(url);
}
