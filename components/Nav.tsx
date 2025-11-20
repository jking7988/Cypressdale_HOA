'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/news', label: 'News', icon: '🗞️' },
    { href: '/events', label: 'Events', icon: '📅' },
    { href: '/pool', label: 'Pool', icon: '🌊', highlight: true },
    { href: '/new-residents', label: 'New Residents', icon: '🧭' },
    { href: '/trash', label: 'Trash & Recycling', icon: '🗑️' },
    { href: '/documents', label: 'Documents', icon: '📄' },
    { href: '/yard-of-the-month', label: 'Yard of the Month', icon: '🌿' },
    { href: '/holiday-decorating', label: 'Holiday Decorating', icon: '🎄' },
    { href: '/about', label: 'About', icon: 'ℹ️' },
  ];

  return (
    <header className="border-b border-brand-100 bg-brand-50/60 backdrop-blur sticky top-0 z-50">
      <div className="container py-3 flex flex-col items-center gap-3">
        {/* Top row: centered logo + mobile hamburger on the right */}
        <div className="relative w-full flex items-center justify-center">
          <Link
            href="/"
            className="font-bold text-xl text-brand-700"
          >
            Cypressdale HOA
          </Link>

          {/* Mobile menu button (floats on the right) */}
          <button
            className="md:hidden p-2 rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-100 absolute right-0"
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <div className="flex flex-col justify-center items-center gap-1">
              <span
                className={`h-[2px] w-5 bg-current transition-transform duration-200 ${
                  open ? 'translate-y-[6px] rotate-45' : ''
                }`}
              />
              <span
                className={`h-[2px] w-5 bg-current transition-opacity duration-200 ${
                  open ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`h-[2px] w-5 bg-current transition-transform duration-200 ${
                  open ? '-translate-y-[6px] -rotate-45' : ''
                }`}
              />
            </div>
          </button>
        </div>

        {/* Desktop nav: centered row of links under the logo */}
        <nav className="hidden md:flex items-center justify-center gap-1">
          {links.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 transition
                  ${
                    isActive
                      ? 'bg-emerald-100 text-emerald-800 font-medium'
                      : 'text-brand-700 hover:bg-brand-100'
                  }
                  ${link.highlight ? 'text-accent-700 font-medium' : ''}
                `}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}

          {/* Admin link */}
          <a
            href="https://cypressdale-admin.sanity.studio/"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 text-sm rounded-lg text-accent-700 font-medium hover:bg-accent-50 flex items-center gap-1"
          >
            <span>🔐</span>
            <span>Admin</span>
          </a>
        </nav>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-brand-100 bg-brand-50/95 backdrop-blur">
          <nav className="container flex flex-col py-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-3 px-2 text-brand-700 hover:bg-brand-100 rounded flex items-center gap-2 text-base"
              >
                <span className="text-lg">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}

            <a
              href="https://cypressdale-admin.sanity.studio/"
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="py-3 px-2 text-accent-600 hover:bg-accent-50 rounded font-medium flex items-center gap-2 text-base"
            >
              🔐 <span>Admin</span>
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
