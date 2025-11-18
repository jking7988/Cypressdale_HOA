// app/api/trash-reminders/manage/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ManageAction = 'unsubscribe' | 'resubscribe';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body || !body.email || !body.action) {
    return NextResponse.json(
      { error: 'Missing email or action.' },
      { status: 400 }
    );
  }

  const rawEmail = String(body.email);
  const action = String(body.action) as ManageAction;
  const lowerEmail = rawEmail.trim().toLowerCase();

  if (!lowerEmail) {
    return NextResponse.json(
      { error: 'Email is required.' },
      { status: 400 }
    );
  }

  if (action !== 'unsubscribe' && action !== 'resubscribe') {
    return NextResponse.json(
      { error: 'Unknown action.' },
      { status: 400 }
    );
  }

  // Look up subscriber
  const { data: existing, error: fetchError } = await supabase
    .from('trash_reminders')
    .select('email, active')
    .eq('email', lowerEmail)
    .maybeSingle();

  if (fetchError) {
    console.error('Supabase fetch error (manage):', fetchError);
    return NextResponse.json(
      { error: 'Database error.' },
      { status: 500 }
    );
  }

  // -------------------------------------------------
  //  UNSUBSCRIBE
  // -------------------------------------------------
  if (action === 'unsubscribe') {
    // No record → treat as already unsubscribed
    if (!existing) {
      return NextResponse.json({
        message: 'You were already unsubscribed.',
        status: 'already-unsubscribed',
        verification: false, // not active
      });
    }

    // Already inactive
    if (existing.active === false) {
      return NextResponse.json({
        message: 'You were already unsubscribed.',
        status: 'already-unsubscribed',
        verification: false,
      });
    }

    // Set active = false
    const { error: updateError } = await supabase
      .from('trash_reminders')
      .update({ active: false })
      .eq('email', lowerEmail);

    if (updateError) {
      console.error('Supabase update error (unsubscribe manage):', updateError);
      return NextResponse.json(
        { error: 'Unable to unsubscribe at this time.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'You have been unsubscribed from trash day reminders.',
      status: 'unsubscribed',
      verification: false,
    });
  }

  // -------------------------------------------------
  //  RESUBSCRIBE
  // -------------------------------------------------
  if (action === 'resubscribe') {
    // No record → create fresh active record
    if (!existing) {
      const { error: insertError } = await supabase
        .from('trash_reminders')
        .insert([{ email: lowerEmail, active: true }]);

      if (insertError) {
        console.error('Supabase insert error (resubscribe manage):', insertError);
        return NextResponse.json(
          { error: 'Unable to resubscribe at this time.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'You have been resubscribed!',
        status: 'resubscribed',
        verification: true, // now active
      });
    }

    // Already active
    if (existing.active === true) {
      return NextResponse.json({
        message: 'You are already subscribed.',
        status: 'already-subscribed',
        verification: true,
      });
    }

    // Was inactive → flip to active
    const { error: updateError } = await supabase
      .from('trash_reminders')
      .update({ active: true })
      .eq('email', lowerEmail);

    if (updateError) {
      console.error('Supabase update error (resubscribe manage):', updateError);
      return NextResponse.json(
        { error: 'Unable to resubscribe at this time.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'You have been resubscribed!',
      status: 'resubscribed',
      verification: true,
    });
  }

  // Fallback (shouldn’t be hit because of earlier action check)
  return NextResponse.json(
    { error: 'Unknown action.' },
    { status: 400 }
  );
}
