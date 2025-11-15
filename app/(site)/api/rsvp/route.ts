import {NextRequest, NextResponse} from 'next/server';
import {writeClient} from '@/lib/sanity.server';

export async function POST(req: NextRequest) {
  try {
    const {eventId, response, name, email} = await req.json();

    if (!eventId || !['yes', 'maybe'].includes(response)) {
      return NextResponse.json({error: 'Invalid payload'}, {status: 400});
    }

    if (!process.env.SANITY_WRITE_TOKEN) {
      console.error('Missing SANITY_WRITE_TOKEN');
      return NextResponse.json({error: 'Server misconfigured'}, {status: 500});
    }

    // 1) Create an RSVP Response document
    await writeClient.create({
      _type: 'rsvpResponse',
      event: {
        _type: 'reference',
        _ref: eventId,
      },
      status: response,
      name: name || '',
      email: email || '',
      createdAt: new Date().toISOString(),
    });

    // 2) Increment counters on the event document
    const field = response === 'yes' ? 'rsvpYes' : 'rsvpMaybe';

    await writeClient
      .patch(eventId)
      .setIfMissing({[field]: 0})
      .inc({[field]: 1})
      .commit();

    return NextResponse.json({ok: true});
  } catch (err) {
    console.error('RSVP error', err);
    return NextResponse.json({error: 'Server error'}, {status: 500});
  }
}
