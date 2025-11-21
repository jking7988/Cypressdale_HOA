// @ts-nocheck
const PREVIEW_SECRET = '8f4b1e3c-2f4f-4f6d-9f6e-5e3d6c7b8a9b';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  if (!secret || secret !== PREVIEW_SECRET) {
    return new Response('Invalid secret', { status: 401 });
  }

  if (!type || !id) {
    return new Response('Missing id/type', { status: 400 });
  }

  let path = '/';

  if (type === 'post') {
    path = `/news/${id}?draft=1`;
  } else if (type === 'event') {
    path = `/events/${id}?draft=1`;
  }

  const url = new URL(path, request.url);
  return Response.redirect(url);
}
