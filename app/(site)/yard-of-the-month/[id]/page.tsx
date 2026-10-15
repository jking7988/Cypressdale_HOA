export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getPublishedContent } from "@/lib/member-hub/public-content";
import YardWinnerPage, { type YardWinner } from "@/components/content/YardWinnerPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const content = await getPublishedContent<YardWinner>("yardWinner", id);
  if (!content) return notFound();
  return <YardWinnerPage winner={content} />;
}
