import { NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity.server';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const secretHeader =
    req.headers.get('x-event-comment-delete-secret') ??
    req.headers.get('x-news-delete-secret');
  const deleteSecret =
    process.env.EVENT_COMMENT_DELETE_SECRET ||
    process.env.NEWS_DELETE_SECRET;

  if (!deleteSecret || secretHeader !== deleteSecret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const commentId = params?.id;
  if (!commentId) {
    return NextResponse.json(
      { error: 'Comment ID is required' },
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
    await writeClient.delete(commentId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Event comment delete error', err);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
