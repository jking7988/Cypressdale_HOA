// app/api/newsletter/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is missing');
    return NextResponse.json(
      { error: 'Email service is not configured.' },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  const { email, name, street } = body ?? {};

  if (!email || typeof email !== 'string') {
    return NextResponse.json(
      { error: 'Email is required.' },
      { status: 400 }
    );
  }

  const lowerEmail = email.trim().toLowerCase();
  if (!lowerEmail) {
    return NextResponse.json(
      { error: 'Email is required.' },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  const baseUrl = url.origin;

  // Look up existing subscriber
  const { data: existing, error: fetchError } = await supabase
    .from('newsletter_subscribers')
    .select('id, active, verified, verification_token')
    .eq('email', lowerEmail)
    .maybeSingle();

  if (fetchError) {
    console.error('Supabase fetch error (newsletter subscribe):', fetchError);
    return NextResponse.json(
      { error: 'Database error.' },
      { status: 500 }
    );
  }

  // Generate a fresh token
  const token = crypto.randomUUID();

  // Insert new subscriber
  if (!existing) {
    const { error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert([
        {
          email: lowerEmail,
          name: name || null,
          street: street || null,
          active: true,
          verified: false,
          verification_token: token,
          verification_sent_at: new Date().toISOString(),
        },
      ]);

    if (insertError) {
      console.error(
        'Supabase insert error (newsletter subscribe):',
        insertError
      );
      return NextResponse.json(
        { error: 'Unable to subscribe at this time.' },
        { status: 500 }
      );
    }
  } else {
    // Update existing subscriber (don’t try to read existing.name/street)
    const { error: updateError } = await supabase
      .from('newsletter_subscribers')
      .update({
        name: name || null,
        street: street || null,
        active: true,
        verified: existing.verified ?? false,
        verification_token: token,
        verification_sent_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) {
      console.error(
        'Supabase update error (newsletter subscribe):',
        updateError
      );
      return NextResponse.json(
        { error: 'Unable to update your subscription at this time.' },
        { status: 500 }
      );
    }
  }

  const verifyUrl = `${baseUrl}/api/newsletter/verify?token=${encodeURIComponent(
    token
  )}`;

  const subject = 'Confirm your Cypressdale newsletter subscription';
  const textBody =
    `Hello neighbor,\n\n` +
    `Please confirm your subscription to the Cypressdale HOA newsletter by clicking the link below:\n\n` +
    `${verifyUrl}\n\n` +
    `If you did not request this, you can safely ignore this email.\n`;

  const htmlBody = `
    <div style="background-color:#f0fdf4;padding:24px 0;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #d1fae5;padding:24px 24px 20px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#022c22;">
        <div style="background:#065f46;color:#ecfdf5;font-size:11px;font-weight:600;letter-spacing:0.16em;border-radius:999px;padding:4px 10px;text-transform:uppercase;display:inline-block;margin-bottom:16px;">
          Cypressdale HOA
        </div>

        <h1 style="font-size:20px;margin:0 0 12px;color:#064e3b;">
          Confirm your newsletter subscription
        </h1>

        <p style="font-size:14px;line-height:1.6;margin:0 0 12px;color:#064e3b;">
          Thanks for signing up for the Cypressdale HOA email newsletter.
        </p>

        <p style="font-size:14px;line-height:1.6;margin:0 0 16px;color:#064e3b;">
          Please confirm your email address by clicking the button below:
        </p>

        <p style="margin:0 0 18px;">
          <a href="${verifyUrl}" style="display:inline-block;background:#047857;color:#ecfdf5;font-size:14px;font-weight:600;border-radius:999px;padding:10px 18px;text-decoration:none;">
            Confirm subscription
          </a>
        </p>

        <p style="font-size:12px;line-height:1.5;margin:0 0 18px;color:#64748b;">
          If you did not request this, you can safely ignore this email and you will not be subscribed.
        </p>

        <p style="font-size:11px;line-height:1.5;margin:0;color:#9ca3af;">
          Cypressdale HOA &middot; Cypressdale, Texas
        </p>
      </div>
    </div>
  `;

  await resend.emails.send({
    from: 'Cypressdale HOA <no-reply@cypressdalehoa.com>',
    to: lowerEmail,
    subject,
    text: textBody,
    html: htmlBody,
  });

  return NextResponse.json({
    status: 'verification-sent',
    message:
      'Check your email to confirm your Cypressdale newsletter subscription.',
  });
}
