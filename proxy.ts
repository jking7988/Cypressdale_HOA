import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { hubConfig } from './lib/member-hub/config';

export async function proxy(request: NextRequest) {
  let configuration;
  try { configuration = hubConfig(); } catch { return NextResponse.next(); }
  let response = NextResponse.next({ request });
  const client = createServerClient(configuration.url, configuration.publishableKey, {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure: configuration.secureCookies, path: '/' },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values, headers) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });
  await client.auth.getUser();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  matcher: ['/members/:path*', '/content/:path*', '/admin/:path*', '/admin-sign-in', '/login', '/register', '/forgot-password', '/reset-password', '/resend-confirmation', '/auth/:path*', '/api/member-hub/:path*', '/news/:path*', '/events/:path*', '/yard-of-the-month/:path*', '/api/events/:path*', '/api/news/:path*', '/api/rsvp', '/api/newsletter/:path*'],
};
