import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getHubRequestContext, HubAccessError } from '@/lib/member-hub/server';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
const id = z.string().regex(/^[a-zA-Z0-9_.:-]{1,200}$/);
async function respond(request: Request, write: boolean) {
  try {
    const context = await getHubRequestContext(request, write ? 'member' : 'optional');
    const parsed = z.object({ eventId: id, response: z.enum(['yes','maybe']).nullable().optional() })
      .safeParse(write ? await request.json().catch(() => null) : { eventId: new URL(request.url).searchParams.get('eventId') });
    if (!parsed.success || (write && parsed.data.response === undefined)) throw new HubAccessError(400, 'Choose going, maybe, or remove your RSVP.');
    const { data, error } = await context.client.rpc(write ? 'hoa_set_rsvp' : 'hoa_rsvp_summary', {
      event_id: parsed.data.eventId, ...(write ? { response: parsed.data.response } : {}) });
    if (error?.code === 'P0002') throw new HubAccessError(404, 'Event not found.');
    if (error) throw error;
    return NextResponse.json({ ...data, signedIn: !!context.user }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof HubAccessError ? error.message : 'Unable to update RSVP.' },
      { status: error instanceof HubAccessError ? error.status : 500, headers });
  }
}
export async function GET(request: Request) { return respond(request, false); }
export async function POST(request: Request) { return respond(request, true); }
