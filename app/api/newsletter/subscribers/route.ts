import { NextResponse } from 'next/server';
import { getHubRequestContext } from '@/lib/member-hub/server';
import { listNewsletterSubscribers } from '@/lib/newsletter/directory';
import { newsletterError, newsletterHeaders } from '@/lib/newsletter/routes';
export async function GET(request: Request) {
  try {
    await getHubRequestContext(request, 'admin');
    return NextResponse.json({ subscribers: await listNewsletterSubscribers() }, { headers: newsletterHeaders });
  } catch (error) { return newsletterError(error); }
}
