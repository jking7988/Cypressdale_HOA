// app/api/trash-reminders/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Node runtime (not edge)
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const streetRaw = formData.get('street');
    const street = streetRaw ? String(streetRaw).trim() : null;

    // Build absolute URLs for redirects
    const okUrl = new URL('/trash?signup=ok', req.url);
    const errorUrl = new URL('/trash?signup=error', req.url);

    if (!email) {
      return NextResponse.redirect(errorUrl);
    }

    const { error } = await supabase
      .from('trash_reminders')
      .upsert(
        { email, street, active: true },
        { onConflict: 'email' }
      );

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.redirect(errorUrl);
    }

    return NextResponse.redirect(okUrl);
  } catch (err) {
    console.error('POST /api/trash-reminders error:', err);
    const errorUrl = new URL('/trash?signup=error', req.url);
    return NextResponse.redirect(errorUrl);
  }
}
