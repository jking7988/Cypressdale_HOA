import {NextRequest, NextResponse} from 'next/server';
import {writeClient} from '@/lib/sanity.server';

export async function POST(req: NextRequest) {
  try {
    const {eventId, response} = await req.json();

    if (!eventId || !['yes', 'maybe'].includes(response)) {
      return NextResponse.json({error: 'Invalid payload'}, {status: 400});
    }

    const field =
      response === 'yes' ? 'rsvpYes' : 'rsvpMaybe';

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
