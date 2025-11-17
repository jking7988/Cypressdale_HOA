import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity.server';

export async function POST(req: NextRequest) {
  try {
    const { eventId, response, name, email } = await req.json();

    if (!eventId || !['yes', 'maybe'].includes(response)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (!process.env.SANITY_WRITE_TOKEN) {
      console.error('Missing SANITY_WRITE_TOKEN');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const field = response === 'yes' ? 'rsvpYes' : 'rsvpMaybe';

    // Build the RSVP object that will live on the event
    const rsvpEntry = {
      _type: 'rsvp', // matches the object type name in the event schema
      _key: Math.random().toString(36).slice(2), // simple unique key
      status: response,
      name: name || '',
      email: email || '',
      createdAt: new Date().toISOString(),
    };

    // Patch the event: ensure fields exist, increment count, append RSVP
    await writeClient
      .patch(eventId)
      .setIfMissing({
        [field]: 0,
        rsvps: [],
      })
      .inc({ [field]: 1 })
      .append('rsvps', [rsvpEntry])
      .commit();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('RSVP error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
