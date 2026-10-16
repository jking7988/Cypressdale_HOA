import { NextResponse } from 'next/server';
import { hubConfig } from '@/lib/member-hub/config';

export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    const configuration = hubConfig();
    if (process.env.NODE_ENV === 'development' && process.env.MEMBER_HUB_ENVIRONMENT === 'local'
      && !process.env.VERCEL && !process.env.VERCEL_ENV && configuration.url === 'http://127.0.0.1:55421') {
      return NextResponse.json({ isolatedTesting: true }, { headers });
    }
  } catch { /* A disabled or shared-data server must never accept test fixtures. */ }
  return new NextResponse(null, { status: 404, headers });
}
