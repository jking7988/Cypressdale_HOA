// app/api/newsletter/manage/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ManageAction = 'unsubscribe' | 'resubscribe';

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  const { email, action } = body ?? {};

  if (!email || !action) {
    return NextResponse.json(
      { error: 'Missing email or action.' },
      { status: 400 }
    );
  }

  const lowerEmail = String(email).trim().toLowerCase();
  const actionStr = String(action) as ManageAction;

  if (!lowerEmail) {
    return NextResponse.json(
      { error: 'Email is required.' },
      { status: 400 }
    );
  }

  if (actionStr !== 'unsubscribe' && actionStr !== 'resubscribe') {
    return NextResponse.json(
      { error: 'Unknown action.' },
      { status: 400 }
    );
  }

  const { data: existing, error: fetchError } = await supabase
    .from('newsletter_subscribers')
    .select('email, active')
    .eq('email', lowerEmail)
    .maybeSingle();

  if (fetchError) {
    console.error(
      'Supabase fetch error (newsletter manage):',
      fetchError
    );
    return NextResponse.json(
      { error: 'Database error.' },
      { status: 500 }
    );
  }

  // Unsubscribe
  if (actionStr === 'unsubscribe') {
    if (!existing || existing.active === false) {
      return NextResponse.json({
        message: 'You were already unsubscribed.',
        status: 'already-unsubscribed',
      });
    }

    const { error: updateError } = await supabase
      .from('newsletter_subscribers')
      .update({ active: false })
      .eq('email', lowerEmail);

    if (updateError) {
      console.error(
        'Supabase update error (newsletter unsubscribe):',
        updateError
      );
      return NextResponse.json(
        { error: 'Unable to unsubscribe at this time.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'You have been unsubscribed from the newsletter.',
      status: 'unsubscribed',
    });
  }

  // Resubscribe
  if (!existing) {
    const { error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert([{ email: lowerEmail, active: true }]);

    if (insertError) {
      console.error(
        'Supabase insert error (newsletter resubscribe manage):',
        insertError
      );
      return NextResponse.json(
        { error: 'Unable to resubscribe at this time.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'You have been resubscribed to the newsletter.',
      status: 'resubscribed',
    });
  }

  if (existing.active === true) {
    return NextResponse.json({
      message: 'You are already subscribed.',
      status: 'already-subscribed',
    });
  }

  const { error: updateError } = await supabase
    .from('newsletter_subscribers')
    .update({ active: true })
    .eq('email', lowerEmail);

  if (updateError) {
    console.error(
      'Supabase update error (newsletter resubscribe):',
      updateError
    );
    return NextResponse.json(
      { error: 'Unable to resubscribe at this time.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: 'You have been resubscribed to the newsletter.',
    status: 'resubscribed',
  });
}
