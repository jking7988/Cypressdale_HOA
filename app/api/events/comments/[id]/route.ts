import { deleteComment } from '@/lib/member-hub/discussion';
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return deleteComment(request, (await params).id);
}
