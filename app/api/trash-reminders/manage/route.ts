// app/api/trash-reminders/manage/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { email, action } = await req.json();

  if (!email || !action) {
    return NextResponse.json(
      { error: 'Missing email or action.' },
      { status: 400 }
    );
  }

  const lowerEmail = String(email).toLowerCase();

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

  // Unknown action
  return NextResponse.json(
    { error: 'Unknown action.' },
    { status: 400 }
  );
}
