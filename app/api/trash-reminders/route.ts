// app/api/trash-reminders/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Ensure Node runtime for Supabase
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Optional: simple GET handler to verify route is live on Vercel
export async function GET() {
  return NextResponse.json({ status: 'ok', route: '/api/trash-reminders' });
}

// Form submit handler
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const streetRaw = formData.get('street');
    const street = streetRaw ? String(streetRaw).trim() : null;

    const okUrl = new URL('/trash?signup=ok', req.url);
    const errorUrl = new URL('/trash?signup=error', req.url);

    if (!email) {
      // 303 => browser converts POST to GET on redirect
      return NextResponse.redirect(errorUrl, { status: 303 });
    }

    const { error } = await supabase
      .from('trash_reminders')
      .upsert(
        { email, street, active: true },
        { onConflict: 'email' }
      );

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.redirect(errorUrl, { status: 303 });
    }

    return NextResponse.redirect(okUrl, { status: 303 });
  } catch (err) {
    console.error('POST /api/trash-reminders error:', err);
    const errorUrl = new URL('/trash?signup=error', req.url);
    return NextResponse.redirect(errorUrl, { status: 303 });
  }
}
