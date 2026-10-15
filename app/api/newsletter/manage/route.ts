import { NextResponse } from 'next/server';
import { requestSubscription, requestUnsubscribe } from '@/lib/newsletter/subscriptions';
import { newsletterError, newsletterHeaders } from '@/lib/newsletter/routes';
import { HubAccessError } from '@/lib/member-hub/server';
export async function POST(request: Request) {
  try {
    const isForm = request.headers.get('content-type')?.split(';')[0].trim() === 'application/x-www-form-urlencoded';
    const input = isForm ? Object.fromEntries(await request.formData()) : await request.json().catch(()=>null);
    if (!['resubscribe','unsubscribe'].includes(input?.action)) throw new HubAccessError(400,'Choose a valid subscription action.');
    const result = await (input.action === 'resubscribe' ? requestSubscription(input) : requestUnsubscribe(input));
    return isForm ? new NextResponse(result.message,{headers:{...newsletterHeaders,'Content-Type':'text/plain; charset=utf-8'}})
      : NextResponse.json(result,{headers:newsletterHeaders});
  } catch(error) { return newsletterError(error); }
}
