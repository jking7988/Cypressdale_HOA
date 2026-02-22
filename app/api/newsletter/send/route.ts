import { NextResponse } from 'next/server';
import { runNewsletterSend } from '@/lib/newsletter/send';
import { getCanonicalSiteUrl } from '@/lib/siteUrl';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const force = url.searchParams.get('force') === '1';
  const baseUrl = getCanonicalSiteUrl(url.origin);
  const result = await runNewsletterSend({ baseUrl, force });
  return NextResponse.json(result.body, { status: result.statusCode });
}
