'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-brand-100 bg-brand-50/60 backdrop-blur">
      <div className="container flex items-center justify-between py-4">
        {/* Logo */}
        <Link
          href="/"
          className="font-bold text-xl text-brand-700"
          onClick={() => setOpen(false)}
        >
          Cypressdale HOA
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-4">
          <Link className="hover:text-brand-700 text-brand-600" href="/about">
            About
          </Link>
          <Link className="hover:text-brand-700 text-brand-600" href="/news">
            News
          </Link>
          <Link className="hover:text-brand-700 text-brand-600" href="/events">
            Events
          </Link>
          <Link
            className="hover:text-brand-700 text-brand-600"
            href="/documents"
          >
            Documents
          </Link>
          <a
            href="https://cypressdale-admin.sanity.studio/"
            target="_blank"
            rel="noreferrer"
            className="text-accent-600 hover:text-accent-500 font-medium"
          >
            Admin
          </a>
        </nav>

        {/* Mobile hamburger button */}
        <button
          className="md:hidden p-2 rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-100"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
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

      {/* Mobile dropdown menu */}
      {open && (
        <div className="md:hidden border-t border-brand-100 bg-brand-50/80 backdrop-blur">
          <nav className="container flex flex-col py-2">
            <Link
              href="/about"
              onClick={() => setOpen(false)}
              className="py-2 text-brand-700 hover:bg-brand-100 rounded px-1"
            >
              About
            </Link>
            <Link
              href="/news"
              onClick={() => setOpen(false)}
              className="py-2 text-brand-700 hover:bg-brand-100 rounded px-1"
            >
              News
            </Link>
            <Link
              href="/events"
              onClick={() => setOpen(false)}
              className="py-2 text-brand-700 hover:bg-brand-100 rounded px-1"
            >
              Events
            </Link>
            <Link
              href="/documents"
              onClick={() => setOpen(false)}
              className="py-2 text-brand-700 hover:bg-brand-100 rounded px-1"
            >
              Documents
            </Link>
            <a
              href="https://cypressdale-admin.sanity.studio/"
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="py-2 text-accent-600 hover:bg-accent-50 rounded px-1"
            >
              Admin
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
