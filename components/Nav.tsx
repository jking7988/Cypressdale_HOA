'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="border-b border-brand-100 bg-brand-50/60 backdrop-blur"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="container flex items-center justify-between py-4">
        {/* Left: logo + hamburger */}
        <div className="flex items-center gap-3">
          {/* Hamburger button – all screen sizes */}
          <button
            className="p-2 rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-100"
            onClick={() => setOpen((prev) => !prev)}
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

          {/* Logo */}
          <Link
            href="/"
            className="font-bold text-xl text-brand-700"
            onClick={() => setOpen(false)}
          >
            Cypressdale HOA
          </Link>
        </div>       
      </div>

      {/* Dropdown menu – appears on hover or click, all screen sizes */}
      {open && (
        <div className="border-t border-brand-100 bg-brand-50/80 backdrop-blur">
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

            {/* Slightly emphasized Pool link in dropdown (mobile + desktop) */}
            <Link
              href="/pool"
              onClick={() => setOpen(false)}
              className="py-2 text-brand-700 hover:bg-brand-100 rounded px-1"
            >              
              <span>Pool</span>
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
              className="py-2 text-accent-600 hover:bg-accent-50 rounded px-1 font-medium"
            >
              Admin
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
