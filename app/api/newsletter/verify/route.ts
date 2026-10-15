import { NextResponse } from 'next/server';
import { z } from 'zod';
import { tokenSchema, hashToken } from '@/lib/newsletter/subscriptions';
import { newsletterConfirmation, newsletterError, newsletterHeaders, newsletterRenewalRequired } from '@/lib/newsletter/routes';
import { createHubStorageClient, HubAccessError } from '@/lib/member-hub/server';
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('token');
  if (z.string().uuid().safeParse(raw).success) return newsletterRenewalRequired();
  const token = tokenSchema.safeParse(raw);
  if (!token.success) return new NextResponse('Invalid confirmation link.',{status:400,headers:newsletterHeaders});
  return newsletterConfirmation('Confirm your newsletter subscription','/api/newsletter/verify',token.data,'Confirm subscription');
}
export async function POST(request: Request) {
  try {
    const token = tokenSchema.safeParse((await request.formData()).get('token'));
    if (!token.success) throw new HubAccessError(400,'Invalid confirmation link.');
    const {data,error} = await createHubStorageClient().rpc('hoa_confirm_newsletter',{token_hash:hashToken(token.data)});
    if (error) throw error;
    if (!data) throw new HubAccessError(400,'This link expired or has already been used.');
    return new NextResponse('Your newsletter subscription is confirmed.',{headers:newsletterHeaders});
  } catch(error) { return newsletterError(error); }
}
