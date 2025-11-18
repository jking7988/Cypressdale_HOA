import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { searchParams } = url;
  const type = searchParams.get('type') || 'wednesday';

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is missing');
    return NextResponse.json(
      { error: 'RESEND_API_KEY not configured' },
      { status: 500 }
    );
  }

  const { data: subs, error } = await supabase
    .from('trash_reminders')
    .select('email')
    .eq('active', true);

  if (error) {
    console.error('Supabase error fetching trash_reminders:', error);
    return NextResponse.json({ error: 'supabase error' }, { status: 500 });
  }

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, type });
  }

  const subject =
    type === 'saturday'
      ? 'Cypressdale Reminder: Heavy Trash Tomorrow (Saturday)'
      : 'Cypressdale Reminder: Trash & Recycling Tomorrow (Wednesday)';

  const baseBody =
    type === 'saturday'
      ? `This is your Cypressdale reminder: Heavy trash and bulk items will be collected tomorrow (Saturday). Please have items at the curb by 5:00 AM.`
      : `This is your Cypressdale reminder: Household garbage, recycling, and heavy trash will be collected tomorrow (Wednesday). Please have everything at the curb by 5:00 AM.`;

  await Promise.all(
    subs.map((s) => {
      const unsubscribeUrl = `${url.origin}/api/trash-reminders/unsubscribe?email=${encodeURIComponent(
        s.email
      )}`;

      const fullBody =
        `${baseBody}\n\n` +
        `If you no longer wish to receive these reminders, you can unsubscribe here:\n` +
        `${unsubscribeUrl}\n`;

      return resend.emails.send({
        from: 'Cypressdale HOA <no-reply@cypressdalehoa.com>',
        to: s.email,
        subject,
        text: fullBody,
      });
    })
  );

  return NextResponse.json({ sent: subs.length, type });
}
