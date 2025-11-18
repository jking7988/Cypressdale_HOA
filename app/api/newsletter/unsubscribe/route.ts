// app/api/newsletter/unsubscribe/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get('email');

  if (!email) {
    return new NextResponse(
      'Missing email. Please use the link from your email.',
      { status: 400 }
    );
  }

  const lowerEmail = email.trim().toLowerCase();

  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({ active: false })
    .eq('email', lowerEmail);

  if (error) {
    console.error('Supabase error (newsletter unsubscribe):', error);
    return new NextResponse('Unable to unsubscribe at this time.', {
      status: 500,
    });
  }

  // Simple HTML confirmation page
  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Unsubscribed</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
  </head>
  <body style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;color:#111827;padding:32px;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;padding:24px;box-shadow:0 10px 25px rgba(15,23,42,0.08);">
      <h1 style="font-size:20px;margin:0 0 8px;color:#b91c1c;">You&apos;re unsubscribed</h1>
      <p style="font-size:14px;line-height:1.6;margin:0 0 12px;color:#374151;">
        Your email has been removed from the Cypressdale newsletter list.
      </p>
      <p style="font-size:13px;line-height:1.5;margin:0;color:#6b7280;">
        If this was a mistake, you can re-subscribe anytime from the News or Events page.
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
