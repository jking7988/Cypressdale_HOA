import { NextResponse } from 'next/server';
import { requestSubscription } from '@/lib/newsletter/subscriptions';
import { newsletterError, newsletterHeaders } from '@/lib/newsletter/routes';
export async function POST(request: Request) {
  try { return NextResponse.json(await requestSubscription(await request.json().catch(()=>null)),{headers:newsletterHeaders}); }
  catch(error) { return newsletterError(error); }
}
