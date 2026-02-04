import { NextResponse } from 'next/server';
import { runNewsletterSend } from '@/lib/newsletter/send';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');

  const expected = process.env.NEWSLETTER_WEBHOOK_SECRET;
  if (!expected) {
    console.error('NEWSLETTER_WEBHOOK_SECRET is not configured');
    return NextResponse.json(
      { error: 'Webhook is not configured' },
      { status: 500 }
    );
  }

  if (!secret || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 });
  }

  const baseUrl =
    process.env.NEWSLETTER_SITE_URL?.trim() || url.origin;
  const result = await runNewsletterSend({ baseUrl });
  return NextResponse.json(result.body, { status: result.statusCode });
}
