import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getHubRequestContext, HubAccessError } from '@/lib/member-hub/server';
import { runNewsletterSend } from './send';
import { newsletterCronSecret } from './delivery-config';
import { escapeHtml } from './template';
export const newsletterHeaders = { 'Cache-Control':'private, no-store', 'Referrer-Policy':'no-referrer' };
export function newsletterError(error: unknown) {
  return NextResponse.json({error:error instanceof HubAccessError ? error.message : 'Unable to complete this newsletter request.'},
    {status:error instanceof HubAccessError ? error.status : 500,headers:newsletterHeaders});
}
export async function sendNewsletterRoute(request: Request, admin = false) {
  try {
    if (admin) await getHubRequestContext(request,'admin');
    else {
      const expected = newsletterCronSecret();
      const actual = request.headers.get('authorization') ?? '';
      const wanted = `Bearer ${expected}`;
      const encoder = new TextEncoder(), actualBytes = encoder.encode(actual), wantedBytes = encoder.encode(wanted);
      if (!expected || actualBytes.length !== wantedBytes.length || !timingSafeEqual(actualBytes,wantedBytes))
        throw new HubAccessError(401,'Authorized newsletter scheduling is required.');
    }
    const result = await runNewsletterSend({force:admin});
    return NextResponse.json(result.body,{status:result.statusCode,headers:newsletterHeaders});
  } catch(error) { return newsletterError(error); }
}
export function newsletterConfirmation(title: string, action: string, token: string, button: string) {
  return new NextResponse(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font-family:Arial,sans-serif;max-width:600px;margin:48px auto;padding:24px"><h1>${title}</h1><form method="post" action="${action}"><input type="hidden" name="token" value="${token}"><button type="submit">${button}</button></form><p><a href="/">Cypressdale HOA</a></p></body></html>`,
    {headers:{...newsletterHeaders,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});
}
export function newsletterManagementRequest(email: string) {
  return new NextResponse(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Manage newsletter subscription</title></head><body style="font-family:Arial,sans-serif;max-width:600px;margin:48px auto;padding:24px"><h1>Manage newsletter subscription</h1><p>Request a secure unsubscribe link in your inbox.</p><form method="post" action="/api/newsletter/manage"><input type="hidden" name="action" value="unsubscribe"><label>Email address <input type="email" name="email" value="${escapeHtml(email)}" required maxlength="254"></label><button type="submit">Email unsubscribe link</button></form><p><a href="/">Cypressdale HOA</a></p></body></html>`,
    {headers:{...newsletterHeaders,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});
}
export function newsletterRenewalRequired() {
  return new NextResponse(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Renew your newsletter confirmation</title></head><body style="font-family:Arial,sans-serif;max-width:600px;margin:48px auto;padding:24px"><h1>Renew your newsletter confirmation</h1><p>This older confirmation link can no longer be used. Sign up again on the website to receive a fresh confirmation email.</p><p>Your subscription has not been changed.</p><p><a href="/">Return to Cypressdale HOA</a></p></body></html>`,
    {status:410,headers:{...newsletterHeaders,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"}});
}
