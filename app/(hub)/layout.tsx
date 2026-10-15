import '../../styles/globals.css';
import '../../styles/member-hub.css';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowUpRight, UserRound } from 'lucide-react';

export const metadata: Metadata = { title: { default: 'Cypressdale HOA', template: '%s | Cypressdale HOA' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="hub-root">
    <header className="hub-header"><div className="hub-container hub-header-inner">
      <Link href="/" className="hub-brand">Cypressdale HOA</Link>
      <nav aria-label="Account navigation"><Link href="/"><span>Public Site</span><ArrowUpRight size={16} /></Link>
        <Link href="/members/account" aria-label="My Account" title="My Account"><UserRound size={20} /></Link></nav>
    </div></header>
    <main className="hub-container hub-main">{children}</main>
    <footer className="hub-container hub-footer">Cypressdale Homeowners Association</footer>
  </body></html>;
}
