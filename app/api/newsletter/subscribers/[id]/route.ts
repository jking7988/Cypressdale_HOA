import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getHubRequestContext, createHubStorageClient, HubAccessError } from '@/lib/member-hub/server';
import { newsletterError, newsletterHeaders } from '@/lib/newsletter/routes';
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getHubRequestContext(request, 'admin');
    const id = z.string().uuid().safeParse((await params).id);
    const confirmation = z.object({ email: z.string().trim().toLowerCase().email().max(254) })
      .safeParse(await request.json().catch(() => null));
    if (!id.success || !confirmation.success) throw new HubAccessError(400, 'Confirm the subscriber you want to remove.');
    const { data, error } = await createHubStorageClient().from('newsletter_subscribers')
      .delete().eq('id', id.data).eq('email', confirmation.data.email).select('id');
    if (error) throw error;
    if (!data?.length) throw new HubAccessError(404, 'Subscriber no longer exists. Refresh the list.');
    revalidatePath('/admin/subscribers'); revalidatePath('/admin/newsletter');
    return NextResponse.json({ success: 'Subscriber removed.' }, { headers: newsletterHeaders });
  } catch (error) { return newsletterError(error); }
}
