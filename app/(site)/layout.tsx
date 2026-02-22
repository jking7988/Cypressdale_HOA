import "../../styles/globals.css";
import type { Metadata } from "next";
import { draftMode, headers } from "next/headers";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SanityVisualEditing from "@/components/SanityVisualEditing";
import { SanityLive } from "@/lib/live";
import { Analytics } from "@vercel/analytics/next";
import AutoSpanishTranslate from "@/components/AutoSpanishTranslate";

export const metadata: Metadata = {
  title: "Cypressdale HOA",
  description: "Community info, events, and documents",
};

async function refreshOnLiveEvent(_tags: string[]) {
  "use server";
  return "refresh" as const;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const isDraftMode = (await draftMode()).isEnabled;
  const requestHeaders = await headers();
  const referer = requestHeaders.get("referer") || "";
  const studioUrl = process.env.NEXT_PUBLIC_SANITY_STUDIO_URL || "https://cypressdale-admin.sanity.studio";
  let studioHost = "cypressdale-admin.sanity.studio";
  try {
    studioHost = new URL(studioUrl).host;
  } catch {}
  const isSanityPresentationRequest =
    referer.includes(studioHost) || referer.includes(".sanity.studio");
  const enableStudioEditing = isDraftMode || isSanityPresentationRequest;

  return (
    <html lang="en" className="h-full">
      <body
        className="min-h-screen text-brand-900 overflow-x-hidden"
        style={{ background: "var(--bg)", color: "var(--fg)" }}
      >
        <div className="flex min-h-screen flex-col">
          <Nav />
          <main className="container flex-1 py-8">{children}</main>
          <Footer />
        </div>

        {enableStudioEditing && <SanityVisualEditing />}
        <AutoSpanishTranslate />
        {enableStudioEditing && (
          <SanityLive
            refreshOnMount
            refreshOnReconnect
            refreshOnFocus
            revalidateSyncTags={refreshOnLiveEvent}
          />
        )}
        <Analytics />
      </body>
    </html>
  );
}
