import { NextResponse } from 'next/server';
import { z } from 'zod';
import { newsletterConfirmation, newsletterError, newsletterHeaders, newsletterManagementRequest } from '@/lib/newsletter/routes';
import { createHubStorageClient, HubAccessError } from '@/lib/member-hub/server';
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const email = z.string().trim().email().max(254).safeParse(params.get('email'));
  if (!params.has('token') && email.success) return newsletterManagementRequest(email.data);
  const token = z.string().uuid().safeParse(params.get('token'));
  if (!token.success) return new NextResponse('Use the unsubscribe link from your newsletter email.',{status:400,headers:newsletterHeaders});
  return newsletterConfirmation('Unsubscribe from the newsletter','/api/newsletter/unsubscribe',token.data,'Unsubscribe');
}
export async function POST(request: Request) {
  try {
    const raw = new URL(request.url).searchParams.get('token') || (await request.formData()).get('token');
    const token = z.string().uuid().safeParse(raw);
    if (!token.success) throw new HubAccessError(400,'Use the unsubscribe link from your newsletter email.');
    const {error} = await createHubStorageClient().from('newsletter_subscribers').update({active:false,verification_hash:null,
      verification_expires_at:null,pending_name:null,pending_street:null,updated_at:new Date().toISOString()}).eq('unsubscribe_token',token.data);
    if (error) throw error;
    return new NextResponse('You are unsubscribed from the Cypressdale newsletter.',{headers:newsletterHeaders});
  } catch(error) { return newsletterError(error); }
}
