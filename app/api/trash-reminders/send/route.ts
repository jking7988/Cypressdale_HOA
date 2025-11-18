// app/api/trash-reminders/send/route.ts
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

  const isSaturday = type === 'saturday';

  const subject = isSaturday
    ? 'Cypressdale Reminder: Heavy Trash Tomorrow (Saturday)'
    : 'Cypressdale Reminder: Trash & Recycling Tomorrow (Wednesday)';

  const baseBody = isSaturday
    ? `This is your Cypressdale reminder: Heavy trash and bulk items will be collected tomorrow (Saturday). Please have items at the curb by 5:00 AM.`
    : `This is your Cypressdale reminder: Household garbage, recycling, and heavy trash will be collected tomorrow (Wednesday). Please have everything at the curb by 5:00 AM.`;

  await Promise.all(
    subs.map((s) => {
      const unsubscribeUrl = `${url.origin}/api/trash-reminders/unsubscribe?email=${encodeURIComponent(
        s.email
      )}`;

      const textBody =
        `${baseBody}\n\n` +
        `If you no longer wish to receive these reminders, you can unsubscribe here:\n` +
        `${unsubscribeUrl}\n`;

      const htmlBody = `
        <div style="background-color:#f0fdf4;padding:24px 0;">
          <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #d1fae5;padding:24px 24px 20px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#022c22;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
              <div style="background:#065f46;color:#ecfdf5;font-size:11px;font-weight:600;letter-spacing:0.16em;border-radius:999px;padding:4px 10px;text-transform:uppercase;">
                Cypressdale Trash Reminder
              </div>
            </div>

            <h1 style="font-size:20px;margin:0 0 8px;color:#064e3b;">
              ${isSaturday ? 'Heavy Trash Tomorrow (Saturday)' : 'Trash & Recycling Tomorrow (Wednesday)'}
            </h1>

            <p style="font-size:14px;line-height:1.5;margin:0 0 12px;color:#064e3b;">
              Hello Cypressdale neighbor,
            </p>

            <p style="font-size:14px;line-height:1.6;margin:0 0 12px;color:#064e3b;">
              ${
                isSaturday
                  ? 'This is your reminder that heavy trash and bulk items will be collected <strong>tomorrow (Saturday)</strong>.'
                  : 'This is your reminder that household garbage, recycling, and heavy trash will be collected <strong>tomorrow (Wednesday)</strong>.'
              }
            </p>

            <div style="background:#ecfdf5;border-radius:12px;border:1px solid #a7f3d0;padding:12px 14px;margin:12px 0 16px;">
              <p style="font-size:13px;line-height:1.5;margin:0;color:#064e3b;">
                <strong>Pickup window</strong><br />
                Please have all items at the curb by <strong>5:00 AM</strong> on the collection day to ensure pickup.
              </p>
            </div>

            <p style="font-size:13px;line-height:1.5;margin:0 0 16px;color:#065f46;">
              • Regular household garbage should be bagged and placed in containers under 95 gallons and 50 pounds.<br />
              • Up to two heavy/bulk items are collected on ${isSaturday ? 'Saturdays (and also Wednesdays).' : 'both Wednesdays and Saturdays.'}<br />
              • Yard waste and branches should follow the guidelines on the Cypressdale Trash & Recycling page.
            </p>

            <p style="font-size:13px;line-height:1.5;margin:0 0 18px;color:#064e3b;">
              For full details, visit the Cypressdale website and check the Trash &amp; Recycling page.
            </p>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0 10px;" />

            <p style="font-size:11px;line-height:1.5;margin:0 0 4px;color:#6b7280;">
              You are receiving this email because you signed up for Cypressdale trash day reminders.
            </p>
            <p style="font-size:11px;line-height:1.5;margin:0;color:#6b7280;">
              If you no longer wish to receive these reminders, you can
              <a href="${unsubscribeUrl}" style="color:#047857;text-decoration:underline;">unsubscribe here</a>.
            </p>

            <p style="font-size:11px;line-height:1.5;margin:10px 0 0;color:#9ca3af;">
              Cypressdale HOA &middot; Cypressdale, Texas
            </p>
          </div>
        </div>
      `;

      return resend.emails.send({
        from: 'Cypressdale HOA <no-reply@cypressdalehoa.com>',
        to: s.email,
        subject,
        text: textBody,
        html: htmlBody,
      });
    })
  );

  return NextResponse.json({ sent: subs.length, type });
}
