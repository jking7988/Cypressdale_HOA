import { NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity.server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const eventId = url.searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json(
      { error: 'eventId query parameter is required' },
      { status: 400 }
    );
  }

  const query = `*[_type == "eventComment" && event._ref == $eventId]
    | order(createdAt asc) {
      _id,
      name,
      email,
      message,
      createdAt,
      "parentId": parentComment->_id
    }`;

  try {
    // Use the non-CDN client so freshly posted replies appear immediately.
    const comments = await writeClient.fetch(query, { eventId });
    return NextResponse.json({ comments });
  } catch (err) {
    console.error('Unable to load event comments', err);
    return NextResponse.json(
      { error: 'Unable to load comments' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const eventId = body?.eventId as string | undefined;
  const message = (body?.message as string | undefined)?.trim();
  const name = (body?.name as string | undefined)?.trim() ?? '';
  const email = (body?.email as string | undefined)?.trim() ?? '';
  const parentCommentId = (body?.parentCommentId as string | undefined)?.trim() ?? '';

  if (!eventId || !message) {
    return NextResponse.json(
      { error: 'eventId and message are required' },
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
      event: { _type: 'reference', _ref: eventId },
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
    console.error('Event comment error', err);
    return NextResponse.json(
      { error: 'Unable to save comment' },
      { status: 500 }
    );
  }
}
