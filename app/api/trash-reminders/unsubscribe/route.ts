// app/api/trash-reminders/unsubscribe/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.redirect('/trash?unsubscribe=error');
  }

  const lowerEmail = email.toLowerCase();

  // Look up subscriber
  const { data: existing, error: fetchError } = await supabase
    .from('trash_reminders')
    .select('email, active')
    .eq('email', lowerEmail)
    .maybeSingle();

  if (fetchError) {
    console.error('Supabase fetch error (unsubscribe):', fetchError);
    return NextResponse.redirect('/trash?unsubscribe=error');
  }

  // No record at all → treat as already unsubscribed
  if (!existing) {
    return NextResponse.redirect('/trash?unsubscribe=already');
  }

  // Already inactive → already unsubscribed
  if (existing.active === false) {
    return NextResponse.redirect('/trash?unsubscribe=already');
  }

  // Set active = false
  const { error: updateError } = await supabase
    .from('trash_reminders')
    .update({ active: false })
    .eq('email', lowerEmail);

  if (updateError) {
    console.error('Supabase update error (unsubscribe):', updateError);
    return NextResponse.redirect('/trash?unsubscribe=error');
  }

  return NextResponse.redirect('/trash?unsubscribe=ok');
}
