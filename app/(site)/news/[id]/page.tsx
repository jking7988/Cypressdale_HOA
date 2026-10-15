export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getPublishedContent } from "@/lib/member-hub/public-content";
import NewsPage, { type Post } from "@/components/content/NewsPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const content = await getPublishedContent<Post>("post", id);
  if (!content) return notFound();
  return <NewsPage post={content} />;
}





