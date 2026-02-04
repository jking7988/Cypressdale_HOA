import { NextResponse } from 'next/server';
import { runNewsletterSend } from '@/lib/newsletter/send';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const force = url.searchParams.get('force') === '1';
  const baseUrl =
    process.env.NEWSLETTER_SITE_URL?.trim() || url.origin;
  const result = await runNewsletterSend({ baseUrl, force });
  return NextResponse.json(result.body, { status: result.statusCode });
}
