import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const emailParam = url.searchParams.get('email');
  const origin = url.origin;

  const okUrl = `${origin}/trash?unsubscribe=ok`;
  const errorUrl = `${origin}/trash?unsubscribe=error`;

  if (!emailParam) {
    return NextResponse.redirect(errorUrl);
  }

  const email = emailParam.trim().toLowerCase();

  const { error } = await supabase
    .from('trash_reminders')
    .update({ active: false })
    .eq('email', email);

  if (error) {
    console.error('Supabase unsubscribe error:', error);
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(okUrl);
}
