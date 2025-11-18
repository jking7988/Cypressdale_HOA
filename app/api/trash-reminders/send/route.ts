import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'wednesday';

  const { data: subs, error } = await supabase
    .from('trash_reminders')
    .select('email')
    .eq('active', true);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: 'supabase error' }, { status: 500 });
  }

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const subject =
    type === 'saturday'
      ? 'Cypressdale Reminder: Heavy Trash Tomorrow (Saturday)'
      : 'Cypressdale Reminder: Trash & Recycling Tomorrow (Wednesday)';

  const body =
    type === 'saturday'
      ? `This is your Cypressdale reminder: Heavy trash and bulk items will be collected tomorrow (Saturday). Please have items at the curb by 5:00 AM.`
      : `This is your Cypressdale reminder: Household garbage, recycling, and heavy trash will be collected tomorrow (Wednesday). Please have everything at the curb by 5:00 AM.`;

  await Promise.all(
    subs.map((s) =>
      resend.emails.send({
        from: 'Cypressdale HOA <no-reply@cypressdalehoa.com>',
        to: s.email,
        subject,
        text: body,
      })
    )
  );

  return NextResponse.json({ sent: subs.length, type });
}
