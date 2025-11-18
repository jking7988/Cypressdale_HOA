// app/api/newsletter/send/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { client } from '@/lib/sanity.client';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

type SanityPost = {
  _id: string;
  title: string;
  slug?: { current?: string };
  publishedAt?: string;
  _updatedAt?: string;
};

type SanityEvent = {
  _id: string;
  title: string;
  slug?: { current?: string };
  startDate?: string;
  _updatedAt?: string;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const force = url.searchParams.get('force') === '1';

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is missing');
    return NextResponse.json(
      { error: 'RESEND_API_KEY not configured' },
      { status: 500 }
    );
  }

  const baseUrl = url.origin;

  // ---------------------------------------------
  // 1) Fetch recent news & upcoming events
  //    We grab _updatedAt so "edited" items count as updates too.
  // ---------------------------------------------
  const [posts, events] = await Promise.all([
    client.fetch<SanityPost[]>(
      `*[_type == "post"] | order(publishedAt desc, _updatedAt desc)[0...10]{
        _id,
        title,
        slug,
        publishedAt,
        _updatedAt
      }`
    ),
    client.fetch<SanityEvent[]>(
      `*[_type == "event" && startDate >= now()]
        | order(startDate asc, _updatedAt desc)[0...10]{
          _id,
          title,
          slug,
          startDate,
          _updatedAt
        }`
    ),
  ]);

  // Figure out the latest "meaningful" content timestamp
  const postDates = (posts || [])
    .map((p) => p.publishedAt || p._updatedAt)
    .filter(Boolean)
    .map((d) => new Date(d as string).getTime());

  const eventDates = (events || [])
    .map((e) => e.startDate || e._updatedAt)
    .filter(Boolean)
    .map((d) => new Date(d as string).getTime());

  const allDates = [...postDates, ...eventDates];

  if (allDates.length === 0) {
    // Literally no news or events
    return NextResponse.json({
      sent: 0,
      reason: 'no-content',
      detail: 'No news posts or upcoming events found.',
    });
  }

  const latestContentTime = Math.max(...allDates);
  const latestContentDate = new Date(latestContentTime);

  // ---------------------------------------------
  // 2) Compare against last newsletter send
  // ---------------------------------------------
  const { data: lastRun, error: runError } = await supabase
    .from('newsletter_runs')
    .select('sent_at')
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (runError) {
    console.error('Supabase error fetching newsletter_runs:', runError);
    return NextResponse.json(
      { error: 'supabase error (newsletter_runs)' },
      { status: 500 }
    );
  }

  const lastSentAt = lastRun?.sent_at ? new Date(lastRun.sent_at) : null;

  if (!force && lastSentAt && latestContentDate <= lastSentAt) {
    // No new/updated content since the last send → do nothing
    return NextResponse.json({
      sent: 0,
      reason: 'no-new-updates',
      lastSentAt: lastSentAt.toISOString(),
      latestContentDate: latestContentDate.toISOString(),
    });
  }

  // ---------------------------------------------
  // 3) Fetch active subscribers
  // ---------------------------------------------
  const { data: subs, error: subsError } = await supabase
  .from('newsletter_subscribers')
  .select('email')
  .eq('active', true)
  .eq('verified', true);

  if (subsError) {
    console.error(
      'Supabase error fetching newsletter_subscribers:',
      subsError
    );
    return NextResponse.json(
      { error: 'supabase error (newsletter_subscribers)' },
      { status: 500 }
    );
  }

  if (!subs || subs.length === 0) {
    return NextResponse.json({
      sent: 0,
      reason: 'no-active-subscribers',
      latestContentDate: latestContentDate.toISOString(),
    });
  }

  // ---------------------------------------------
  // 4) Build news + events sections
  // ---------------------------------------------
  const newsLines = (posts || []).map((p) => {
    const href = p.slug?.current
      ? `${baseUrl}/news/${p.slug.current}`
      : `${baseUrl}/news`;
    const date = p.publishedAt
      ? new Date(p.publishedAt).toLocaleDateString()
      : '';
    return `- ${p.title}${date ? ` (${date})` : ''}: ${href}`;
  });

  const eventLines = (events || []).map((e) => {
    const href = e.slug?.current
      ? `${baseUrl}/events/${e.slug.current}`
      : `${baseUrl}/events`;
    const start = e.startDate
      ? new Date(e.startDate).toLocaleDateString()
      : '';
    return `- ${e.title}${start ? ` (${start})` : ''}: ${href}`;
  });

  const subjectBase =
    posts.length && events.length
      ? 'Cypressdale News & Events Update'
      : posts.length
      ? 'Cypressdale News Update'
      : events.length
      ? 'Cypressdale Events Update'
      : 'Cypressdale HOA Update';

  // ---------------------------------------------
  // 5) Send newsletter emails
  // ---------------------------------------------
  await Promise.all(
    subs.map((s) => {
      const email = s.email as string;
      const unsubscribeUrl = `${baseUrl}/api/newsletter/unsubscribe?email=${encodeURIComponent(
        email
      )}`;

      // TEXT
      let textBody = `Hello Cypressdale neighbor,\n\nHere is your latest update from the Cypressdale HOA.\n\n`;

      if (newsLines.length > 0) {
        textBody += 'Recent News:\n';
        textBody += newsLines.join('\n') + '\n\n';
      }

      if (eventLines.length > 0) {
        textBody += 'Upcoming Events:\n';
        textBody += eventLines.join('\n') + '\n\n';
      }

      if (!newsLines.length && !eventLines.length) {
        textBody +=
          'There are no new posts or upcoming events right now, but we will keep you posted.\n\n';
      }

      textBody += `You can always visit the website for details:\n${baseUrl}\n\n`;
      textBody += `If you no longer wish to receive these emails, you can unsubscribe here:\n${unsubscribeUrl}\n`;

      // HTML
      const htmlNews = newsLines.length
        ? `<h2 style="font-size:16px;margin:0 0 4px;">Recent News</h2>
           <ul style="margin:4px 0 12px;padding-left:20px;font-size:14px;line-height:1.5;">
             ${posts
               .map((p) => {
                 const href = p.slug?.current
                   ? `${baseUrl}/news/${p.slug.current}`
                   : `${baseUrl}/news`;
                 const date = p.publishedAt
                   ? new Date(p.publishedAt).toLocaleDateString()
                   : '';
                 return `<li><a href="${href}" style="color:#047857;text-decoration:none;">${p.title}</a>${
                   date ? ` <span style="color:#6b7280;">(${date})</span>` : ''
                 }</li>`;
               })
               .join('')}
           </ul>`
        : '';

      const htmlEvents = eventLines.length
        ? `<h2 style="font-size:16px;margin:0 0 4px;">Upcoming Events</h2>
           <ul style="margin:4px 0 12px;padding-left:20px;font-size:14px;line-height:1.5;">
             ${events
               .map((e) => {
                 const href = e.slug?.current
                   ? `${baseUrl}/events/${e.slug.current}`
                   : `${baseUrl}/events`;
                 const start = e.startDate
                   ? new Date(e.startDate).toLocaleDateString()
                   : '';
                 return `<li><a href="${href}" style="color:#047857;text-decoration:none;">${e.title}</a>${
                   start
                     ? ` <span style="color:#6b7280;">(${start})</span>`
                     : ''
                 }</li>`;
               })
               .join('')}
           </ul>`
        : '';

      const nothingHtml =
        !newsLines.length && !eventLines.length
          ? `<p style="font-size:14px;line-height:1.6;margin:0 0 12px;color:#064e3b;">
               There are no new posts or upcoming events right now, but we will keep you posted.
             </p>`
          : '';

      const htmlBody = `
        <div style="background-color:#f0fdf4;padding:24px 0;">
          <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #d1fae5;padding:24px 24px 20px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#022c22;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
              <div style="background:#065f46;color:#ecfdf5;font-size:11px;font-weight:600;letter-spacing:0.16em;border-radius:999px;padding:4px 10px;text-transform:uppercase;">
                Cypressdale HOA Newsletter
              </div>
            </div>

            <h1 style="font-size:20px;margin:0 0 8px;color:#064e3b;">
              ${subjectBase}
            </h1>

            <p style="font-size:14px;line-height:1.5;margin:0 0 12px;color:#064e3b;">
              Hello Cypressdale neighbor,
            </p>

            <p style="font-size:14px;line-height:1.6;margin:0 0 12px;color:#064e3b;">
              Here is a quick look at the latest news and upcoming events in our neighborhood.
            </p>

            ${htmlNews}
            ${htmlEvents}
            ${nothingHtml}

            <p style="font-size:13px;line-height:1.5;margin:8px 0 18px;color:#064e3b;">
              You can always find more details and updates on the Cypressdale website:
              <a href="${baseUrl}" style="color:#047857;text-decoration:underline;">${baseUrl}</a>
            </p>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0 10px;" />

            <p style="font-size:11px;line-height:1.5;margin:0 0 4px;color:#6b7280;">
              You are receiving this email because you subscribed to the Cypressdale HOA newsletter.
            </p>
            <p style="font-size:11px;line-height:1.5;margin:0;color:#6b7280;">
              If you no longer wish to receive these messages, you can
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
        to: email,
        subject: subjectBase,
        text: textBody,
        html: htmlBody,
      });
    })
  );

  // ---------------------------------------------
  // 6) Record this run
  // ---------------------------------------------
  const { error: insertRunError } = await supabase
    .from('newsletter_runs')
    .insert([{ sent_at: new Date().toISOString() }]);

  if (insertRunError) {
    console.error('Supabase error inserting newsletter_run:', insertRunError);
  }

  return NextResponse.json({
    sent: subs.length,
    subscribers: subs.length,
    posts: posts.length,
    events: events.length,
    latestContentDate: latestContentDate.toISOString(),
  });
}
