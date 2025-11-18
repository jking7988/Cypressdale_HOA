// app/api/newsletter/unsubscribe/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const emailParam = url.searchParams.get('email');

  if (!emailParam) {
    return new NextResponse(
      'Missing email. Please use the unsubscribe link from your newsletter email.',
      { status: 400 }
    );
  }

  const lowerEmail = emailParam.trim().toLowerCase();

  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({ active: false })
    .eq('email', lowerEmail);

  if (error) {
    console.error('Supabase error (newsletter unsubscribe):', error);
    return new NextResponse(
      'We were unable to process your unsubscribe request. Please try again later.',
      { status: 500 }
    );
  }

  // Simple HTML confirmation
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
      <h1 style="font-size:20px;margin:0 0 8px;color:#065f46;">You have been unsubscribed</h1>
      <p style="font-size:14px;line-height:1.6;margin:0 0 12px;color:#374151;">
        You will no longer receive the Cypressdale HOA newsletter at
        <strong>${lowerEmail}</strong>.
      </p>
      <p style="font-size:13px;line-height:1.5;margin:0;color:#6b7280;">
        If this was a mistake, you can resubscribe anytime from the
        newsletter signup form on the Cypressdale website.
      </p>
    </div>
  </body>
</html>`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    }
  );
}
