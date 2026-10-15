import { NextResponse } from 'next/server';
import { getHubRequestContext } from '@/lib/member-hub/server';
import { newsletterPreview } from '@/lib/newsletter/send';
import { newsletterError, newsletterHeaders } from '@/lib/newsletter/routes';
export async function GET(request: Request) {
  try { await getHubRequestContext(request,'admin'); return NextResponse.json(await newsletterPreview(),{headers:newsletterHeaders}); }
  catch(error) { return newsletterError(error); }
}
