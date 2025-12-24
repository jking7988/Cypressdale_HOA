import "../../styles/globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { draftMode } from "next/headers";
import SanityVisualEditing from "@/components/SanityVisualEditing";

export const metadata: Metadata = {
  title: "Cypressdale HOA",
  description: "Community info, events, and documents",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode();

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

        {/* ✅ Required for Sanity Presentation / Visual Editing */}
        {isEnabled ? <SanityVisualEditing /> : null}
      </body>
    </html>
  );
}
