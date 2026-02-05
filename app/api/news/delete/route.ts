import { NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity.server';

export async function DELETE(req: Request) {
  const secretHeader = req.headers.get('x-news-delete-secret');
  const expectedSecret = process.env.NEWS_DELETE_SECRET;

  if (!expectedSecret || secretHeader !== expectedSecret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const postId = body?.postId as string | undefined;

  if (!postId) {
    return NextResponse.json(
      { error: 'postId is required' },
      { status: 400 }
    );
  }

  if (!process.env.SANITY_WRITE_TOKEN) {
    console.error('Missing SANITY_WRITE_TOKEN');
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 500 }
    );
  }

  try {
    await writeClient.delete(postId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('News delete error', err);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
