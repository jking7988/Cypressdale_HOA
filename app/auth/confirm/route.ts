import { NextResponse } from 'next/server';
import { createHubSessionClient } from '@/lib/member-hub/server';
import { safeHubRedirect } from '@/lib/member-hub/forms';
import { escapeHtml } from '@/lib/newsletter/template';
import { parseEmailLink } from '@/lib/member-hub/email-links';

const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'strict-origin',
  'X-Frame-Options': 'DENY', 'X-Robots-Tag': 'noindex, nofollow' };
const expired = (origin: string) => NextResponse.redirect(new URL('/login?link=expired', origin), { status: 303, headers });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const link = parseEmailLink(url.searchParams);
  if (!link) return expired(url.origin);
  const next = safeHubRedirect(url.searchParams.get('next') || (link.mode === 'otp' && link.type === 'recovery' ? '/reset-password' : null));
  const button = next === '/reset-password' ? 'Continue to password reset' : 'Continue';
  const fields = link.mode === 'code' ? { code: link.code, next }
    : { token_hash: link.tokenHash, type: link.type, next };
  const inputs = Object.entries(fields).map(([name, value]) => `<input type="hidden" name="${name}" value="${escapeHtml(value)}">`).join('');
  // Email scanners may fetch this URL. Only the form submission redeems a token.
  return new NextResponse(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Continue to Cypressdale HOA</title></head><body style="font-family:Arial,sans-serif;max-width:560px;margin:48px auto;padding:24px;color:#123d32"><h1>Cypressdale HOA</h1><form method="post" action="/auth/confirm">${inputs}<button type="submit" style="padding:12px 18px;background:#075b48;color:white;border:0;border-radius:4px;font:inherit">${button}</button></form></body></html>`,
    { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" } });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (request.headers.get('origin') !== url.origin) return new NextResponse('Invalid confirmation request.', { status: 403, headers });
  try {
    const form = await request.formData();
    const parameters = new URLSearchParams();
    for (const name of ['code', 'token_hash', 'type', 'next']) {
      const value = form.get(name);
      if (typeof value === 'string') parameters.set(name, value);
    }
    const link = parseEmailLink(parameters);
    if (!link) return expired(url.origin);
    const client = await createHubSessionClient();
    const { error } = link.mode === 'code' ? await client.auth.exchangeCodeForSession(link.code)
      : await client.auth.verifyOtp({ token_hash: link.tokenHash, type: link.type });
    if (!error) return NextResponse.redirect(new URL(safeHubRedirect(parameters.get('next')
      || (link.mode === 'otp' && link.type === 'recovery' ? '/reset-password' : null)), url.origin), { status: 303, headers });
  } catch { /* Never expose authentication tokens or provider error details. */ }
  return expired(url.origin);
}
