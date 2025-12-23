import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity.server';

type RSVPResponse = 'yes' | 'maybe'; // keep as-is

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const eventId = body?.eventId as string | undefined;
    const response = body?.response as RSVPResponse | undefined;
    const name = (body?.name as string | undefined) ?? '';
    const email = (body?.email as string | undefined) ?? '';

    if (!eventId || !response || !['yes', 'maybe'].includes(response)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (!process.env.SANITY_WRITE_TOKEN) {
      console.error('Missing SANITY_WRITE_TOKEN');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const field = response === 'yes' ? 'rsvpYes' : 'rsvpMaybe';

    const rsvpEntry = {
      _type: 'rsvp',
      _key: crypto.randomUUID(), // ✅ strong unique key
      status: response,
      name: name.trim(),
      email: email.trim(),
      createdAt: new Date().toISOString(),
    };

    // Transaction = atomic increment + append
    await writeClient
      .transaction()
      .patch(eventId, (p) =>
        p
          // Ensure counts exist
          .setIfMissing({ rsvpYes: 0, rsvpMaybe: 0 })
          // Ensure rsvps exists AND isn’t null
          .setIfMissing({ rsvps: [] })
          // Increment the right counter
          .inc({ [field]: 1 })
          // Append RSVP entry
          .append('rsvps', [rsvpEntry])
      )
      .commit();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('RSVP error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
