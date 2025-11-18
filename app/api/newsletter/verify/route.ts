// app/api/newsletter/verify/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new NextResponse(
      'Missing token. Please use the link from your email.',
      { status: 400 }
    );
  }

  const { data: subscriber, error } = await supabase
    .from('newsletter_subscribers')
    .select('id, email')
    .eq('verification_token', token)
    .maybeSingle();

  if (error) {
    console.error('Supabase error (newsletter verify):', error);
    return new NextResponse('Unable to verify at this time.', {
      status: 500,
    });
  }

  if (!subscriber) {
    return new NextResponse(
      'This verification link is invalid or has already been used.',
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from('newsletter_subscribers')
    .update({
      verified: true,
      active: true,
      verification_token: null,
    })
    .eq('id', subscriber.id);

  if (updateError) {
    console.error('Supabase update error (newsletter verify):', updateError);
    return new NextResponse('Unable to verify at this time.', {
      status: 500,
    });
  }

  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Subscription confirmed</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
  </head>
  <body style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;color:#111827;padding:32px;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;padding:24px;box-shadow:0 10px 25px rgba(15,23,42,0.08);">
      <h1 style="font-size:20px;margin:0 0 8px;color:#065f46;">You&apos;re subscribed!</h1>
      <p style="font-size:14px;line-height:1.6;margin:0 0 12px;color:#374151;">
        Your email has been verified and you&apos;re now subscribed to the Cypressdale HOA newsletter.
      </p>
      <p style="font-size:13px;line-height:1.5;margin:0;color:#6b7280;">
        You can close this window, or visit the Cypressdale website for the latest news and events.
      </p>
    </div>
  </body>
</html>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}
