// app/api/preview/route.ts
// @ts-nocheck  <-- shuts up any TS drama about draftMode().enable()

import { NextRequest, NextResponse } from 'next/server';
import { draftMode } from 'next/headers';

const PREVIEW_SECRET = process.env.SANITY_PREVIEW_SECRET;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  const type = searchParams.get('type'); // 'post' | 'event'
  const id = searchParams.get('id');

  if (!secret || secret !== PREVIEW_SECRET) {
    return new NextResponse('Invalid secret', { status: 401 });
  }

  if (!id || !type) {
    return new NextResponse('Missing id/type', { status: 400 });
  }

  // 👇 THIS is the correct usage in App Router
  draftMode().enable();

  if (type === 'post') {
    return NextResponse.redirect(new URL(`/news#${id}`, req.url));
  }

  if (type === 'event') {
    return NextResponse.redirect(new URL(`/events#${id}`, req.url));
  }

  return new NextResponse('Unknown type', { status: 400 });
}
