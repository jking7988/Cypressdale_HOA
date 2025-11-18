// app/api/trash-reminders/manage/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const email = body?.email;
    const action = body?.action as 'unsubscribe' | 'resubscribe' | undefined;

    if (!email || (action !== 'unsubscribe' && action !== 'resubscribe')) {
      return NextResponse.json(
        { error: 'Invalid request.' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (action === 'unsubscribe') {
      // Mark as inactive if it exists
      const { error } = await supabase
        .from('trash_reminders')
        .update({ active: false })
        .eq('email', normalizedEmail);

      if (error) {
        console.error('Supabase unsubscribe manage error:', error);
        return NextResponse.json(
          { error: 'Unable to update subscription right now.' },
          { status: 500 }
        );
      }

      // Don’t leak whether the email existed; just say it’s unsubscribed
      return NextResponse.json({
        ok: true,
        message: 'You have been unsubscribed from trash day reminders (if this email was subscribed).',
      });
    } else {
      // resubscribe: upsert to ensure record exists + active
      const { error } = await supabase
        .from('trash_reminders')
        .upsert(
          { email: normalizedEmail, active: true },
          { onConflict: 'email' }
        );

      if (error) {
        console.error('Supabase resubscribe manage error:', error);
        return NextResponse.json(
          { error: 'Unable to update subscription right now.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: 'Your trash day reminders have been turned back on.',
      });
    }
  } catch (err) {
    console.error('POST /api/trash-reminders/manage error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
