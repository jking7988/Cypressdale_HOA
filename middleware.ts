// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect /admin routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  const username = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.error('ADMIN_USER or ADMIN_PASSWORD not set');
    return new NextResponse('Admin is not configured.', { status: 500 });
  }

  const authHeader = req.headers.get('authorization');

  // If no Authorization header, ask browser to prompt for Basic auth
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Cypressdale Admin"',
      },
    });
  }

  // Decode "Basic base64(user:pass)"
  const base64Credentials = authHeader.slice('Basic '.length).trim();
  let decoded = '';

  try {
    decoded = Buffer.from(base64Credentials, 'base64').toString('utf8');
  } catch {
    return new NextResponse('Invalid authorization header', { status: 400 });
  }

  const [providedUser, providedPass] = decoded.split(':');

  if (providedUser !== username || providedPass !== password) {
    return new NextResponse('Invalid credentials', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Cypressdale Admin"',
      },
    });
  }

  // Auth OK, continue to the requested admin page
  return NextResponse.next();
}

// Apply this middleware only to /admin routes
export const config = {
  matcher: ['/admin/:path*'],
};
