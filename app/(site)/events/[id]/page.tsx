export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getPublishedContent } from "@/lib/member-hub/public-content";
import EventPage, { type Event } from "@/components/content/EventPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const content = await getPublishedContent<Event>("event", id);
  if (!content) return notFound();
  return <EventPage event={content} />;
}

