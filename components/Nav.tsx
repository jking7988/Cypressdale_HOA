'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-brand-100 bg-brand-50/60 backdrop-blur">
      <div className="container flex items-center justify-between py-4">
        {/* Left: logo + hamburger */}
        <div className="flex items-center gap-3">
          <button
            className="p-2 rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-100"
            onClick={() => setOpen((prev) => !prev)}
            onMouseEnter={() => setOpen(true)}
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

          <Link
            href="/"
            className="font-bold text-xl text-brand-700 flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            <span>🏘️</span>
            <span>Cypressdale HOA</span>
          </Link>
        </div>
      </div>

      {open && (
        <div
          className="border-t border-brand-100 bg-brand-50/80 backdrop-blur"
          onMouseLeave={() => setOpen(false)}
        >
          <nav className="container flex flex-col py-2">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="py-2 px-1 text-brand-700 hover:bg-brand-100 rounded flex items-center gap-2"
            >
              🏠 <span>Home</span>
            </Link>

            <Link
              href="/news"
              onClick={() => setOpen(false)}
              className="py-2 px-1 text-brand-700 hover:bg-brand-100 rounded flex items-center gap-2"
            >
              🗞️ <span>News</span>
            </Link>

            <Link
              href="/events"
              onClick={() => setOpen(false)}
              className="py-2 px-1 text-brand-700 hover:bg-brand-100 rounded flex items-center gap-2"
            >
              📅 <span>Events</span>
            </Link>

            <Link
              href="/pool"
              onClick={() => setOpen(false)}
              className="py-2 px-1 text-accent-700 bg-accent-50 hover:bg-accent-100 rounded font-medium flex items-center gap-2"
            >
              🌊 <span>Pool</span>
            </Link>

            <Link
              href="/new-residents"
              onClick={() => setOpen(false)}
              className="py-2 px-1 text-brand-700 hover:bg-brand-100 rounded flex items-center gap-2"
            >
              🧭 <span>New Residents</span>
            </Link>

            <Link
              href="/trash"
              onClick={() => setOpen(false)}
              className="py-2 px-1 text-brand-700 hover:bg-brand-100 rounded flex items-center gap-2"
            >
              🗑️ <span>Trash &amp; Recycling</span>
            </Link>

            <Link
              href="/documents"
              onClick={() => setOpen(false)}
              className="py-2 px-1 text-brand-700 hover:bg-brand-100 rounded flex items-center gap-2"
            >
              📄 <span>Documents</span>
            </Link>

            <Link
              href="/yard-of-the-month"
              onClick={() => setOpen(false)}
              className="py-2 px-1 text-brand-700 hover:bg-brand-100 rounded flex items-center gap-2"
            >
              🌿 <span>Yard of the Month</span>
            </Link>

            {/* Holiday Decorating */}
            <Link
              href="/holiday-decorating"
              onClick={() => setOpen(false)}
              className="py-2 px-1 text-brand-700 hover:bg-brand-100 rounded flex items-center gap-2"
            >
              🎄 <span>Holiday Decorating</span>
            </Link>

            {/* About */}
            <Link
              href="/about"
              onClick={() => setOpen(false)}
              className="py-2 px-1 text-brand-700 hover:bg-brand-100 rounded flex items-center gap-2"
            >
              ℹ️ <span>About</span>
            </Link>

            {/* Admin links */}
            <div className="mt-2 pt-2 border-t border-brand-100 space-y-1">
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="py-2 px-1 text-emerald-800 hover:bg-emerald-50 rounded font-medium flex items-center gap-2"
              >
                🔐 <span>Site Admin</span>
              </Link>

              <a
                href="https://cypressdale-admin.sanity.studio/"
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="py-2 px-1 text-accent-600 hover:bg-accent-50 rounded font-medium flex items-center gap-2"
              >
                🧩 <span>Content Admin</span>
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
