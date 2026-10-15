import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getHubRequestContext, HubAccessError } from './server';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
const idSchema = z.string().regex(/^[a-zA-Z0-9_.:-]{1,200}$/);
function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof HubAccessError ? error.message : 'Unable to update the discussion.' },
    { status: error instanceof HubAccessError ? error.status : 500, headers });
}

export function commentHandlers(kind: 'event' | 'post') {
  const parameter = kind === 'event' ? 'eventId' : 'postId';
  async function content(client: Awaited<ReturnType<typeof getHubRequestContext>>['client'], id: string) {
    const { data, error } = await client.from('hoa_content').select('id').eq('id', id).eq('kind', kind).eq('status', 'published').maybeSingle();
    if (error) throw error;
    if (!data) throw new HubAccessError(404, 'Discussion not found.');
  }
  return {
    GET: async (request: Request) => {
      try {
        const id = idSchema.safeParse(new URL(request.url).searchParams.get(parameter));
        if (!id.success) throw new HubAccessError(400, 'A valid content ID is required.');
        const { client, profile, user } = await getHubRequestContext(request, 'optional');
        await content(client, id.data);
        const { data, error } = await client.from('hoa_comments').select('id, display_name, message, created_at, parent_id')
          .eq('content_id', id.data).order('created_at');
        if (error) throw error;
        const canComment = !!user?.email_confirmed_at && profile?.membership_status === 'approved';
        return NextResponse.json({ comments: (data ?? []).map(row => ({ _id: row.id, name: row.display_name,
          message: row.message, createdAt: row.created_at, parentId: row.parent_id })),
          canComment, isAdmin: canComment && profile?.role === 'admin', signedIn: !!user }, { headers });
      } catch (error) { return failure(error); }
    },
    POST: async (request: Request) => {
      try {
        const { client, user } = await getHubRequestContext(request, 'member');
        const parsed = z.object({ [parameter]: idSchema, message: z.string().trim().min(1).max(5000),
          parentCommentId: z.string().uuid().optional() }).safeParse(await request.json().catch(() => null));
        if (!parsed.success) throw new HubAccessError(400, 'Enter a comment of 1 to 5,000 characters.');
        await content(client, parsed.data[parameter]!);
        const { error } = await client.from('hoa_comments').insert({ content_id: parsed.data[parameter],
          message: parsed.data.message, author_id: user!.id, parent_id: parsed.data.parentCommentId ?? null, display_name: '' });
        if (error?.code === '23503') throw new HubAccessError(400, 'Reply to a comment in this discussion.');
        if (error) throw error;
        return NextResponse.json({ ok: true }, { headers });
      } catch (error) { return failure(error); }
    },
  };
}

export async function deleteComment(request: Request, id: string) {
  try {
    const { client } = await getHubRequestContext(request, 'admin');
    if (!z.string().uuid().safeParse(id).success) throw new HubAccessError(400, 'Invalid comment ID.');
    const replies = await client.from('hoa_comments').select('id').eq('parent_id', id).limit(1);
    if (replies.error) throw replies.error;
    if (replies.data?.length) throw new HubAccessError(409, 'Remove replies before deleting their parent comment.');
    const { data, error } = await client.from('hoa_comments').delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data?.length) throw new HubAccessError(404, 'Comment not found.');
    return NextResponse.json({ ok: true }, { headers });
  } catch (error) { return failure(error); }
}
