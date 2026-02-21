import "../../styles/globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SanityVisualEditing from "@/components/SanityVisualEditing";
import { SanityLive } from "@/lib/live";

export const metadata: Metadata = {
  title: "Cypressdale HOA",
  description: "Community info, events, and documents",
};

async function refreshOnLiveEvent(_tags: string[]) {
  "use server";
  return "refresh" as const;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
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

        <SanityVisualEditing />
        <SanityLive
          refreshOnMount
          refreshOnReconnect
          refreshOnFocus
          revalidateSyncTags={refreshOnLiveEvent}
        />
      </body>
    </html>
  );
}
