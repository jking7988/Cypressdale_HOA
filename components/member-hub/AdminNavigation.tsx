'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, FilePenLine, Mail, ContactRound, FolderClosed, Files, Gift, Flower2 } from 'lucide-react';
export default function AdminNavigation() {
  const path = usePathname();
  return <nav className="hub-admin-navigation" aria-label="Administration">
    {[{ href: '/admin/members', label: 'Members', Icon: Users }, { href: '/admin/content', label: 'Content', Icon: FilePenLine }, { href: '/admin/documents', label: 'Documents', Icon: FolderClosed }, { href: '/admin/files', label: 'Files', Icon: Files }, { href: '/admin/holiday-decorating', label: 'Holiday Decorating', Icon: Gift }, { href: '/admin/yard-of-the-month', label: 'Yard of the Month', Icon: Flower2 }, { href: '/admin/newsletter', label: 'Newsletter', Icon: Mail }, { href: '/admin/subscribers', label: 'Subscribers', Icon: ContactRound }].map(({ href, label, Icon }) =>
      <Link key={href} href={href} aria-current={path.startsWith(href) ? 'page' : undefined}><Icon size={17} />{label}</Link>)}
  </nav>;
}
