import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createHubSessionClient } from '@/lib/member-hub/server';
import { safeHubRedirect } from '@/lib/member-hub/forms';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  if (tokenHash && type && ['signup', 'recovery', 'invite', 'email'].includes(type)) {
    try {
      const client = await createHubSessionClient();
      const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
      if (!error) return NextResponse.redirect(new URL(safeHubRedirect(url.searchParams.get('next')), url.origin), {
        headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' },
      });
    } catch { /* Invalid links return a fresh-login path without exposing tokens. */ }
  }
  return NextResponse.redirect(new URL('/login?link=expired', url.origin), { headers: { 'Cache-Control': 'private, no-store' } });
}
