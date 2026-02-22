import { NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity.server';
import { client } from '@/lib/sanity.client';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const postId = url.searchParams.get('postId');

  if (!postId) {
    return NextResponse.json(
      { error: 'postId query parameter is required' },
      { status: 400 }
    );
  }

  const query = `*[_type == "eventComment" && post._ref == $postId]
    | order(createdAt asc) {
      _id,
      name,
      email,
      message,
      createdAt,
      "parentId": parentComment->_id
    }`;

  try {
    const comments = await client.fetch(query, { postId });
    return NextResponse.json({ comments });
  } catch (err) {
    console.error('Unable to load news comments', err);
    return NextResponse.json(
      { error: 'Unable to load comments' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const postId = body?.postId as string | undefined;
  const message = (body?.message as string | undefined)?.trim();
  const name = (body?.name as string | undefined)?.trim() ?? '';
  const email = (body?.email as string | undefined)?.trim() ?? '';
  const parentCommentId = (body?.parentCommentId as string | undefined)?.trim() ?? '';

  if (!postId || !message) {
    return NextResponse.json(
      { error: 'postId and message are required' },
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
    await writeClient.create({
      _type: 'eventComment',
      post: { _type: 'reference', _ref: postId },
      ...(parentCommentId
        ? { parentComment: { _type: 'reference', _ref: parentCommentId } }
        : {}),
      message,
      name,
      email,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('News comment error', err);
    return NextResponse.json(
      { error: 'Unable to save comment' },
      { status: 500 }
    );
  }
}
