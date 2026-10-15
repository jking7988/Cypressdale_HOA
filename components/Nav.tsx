'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isYardSaleMapActive } from '@/lib/yardSale';
import { ChevronDown, House, ShieldCheck } from 'lucide-react';
import { holidayPages } from '@/lib/member-hub/holidays';

function HolidayNavigation({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const pathname = usePathname();
  const active = pathname === '/holiday-decorating' || pathname.startsWith('/holiday-decorating/');

  useEffect(() => {
    setExpanded(false);
  }, [pathname]);

  useEffect(() => {
    if (!expanded) return;
    const dismiss = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setExpanded(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [expanded]);

  return (
    <div ref={container} className="relative" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setExpanded(false);
    }} onKeyDown={event => {
      if (event.key === 'Escape' && expanded) {
        event.preventDefault();
        setExpanded(false);
        trigger.current?.focus();
      }
    }}>
      <button ref={trigger} type="button" aria-expanded={expanded} aria-controls={id}
        onClick={() => setExpanded(value => !value)}
        className={`flex items-center gap-1 rounded-lg text-left ${mobile ? 'w-full px-2 py-3 text-base' : 'px-3 py-2 text-sm'} ${active ? 'bg-emerald-100 text-emerald-800 font-medium' : 'text-brand-700 hover:bg-brand-100'}`}>
        <span aria-hidden="true">{'\u{1F384}'}</span><span>Holiday Decorating</span>
        <ChevronDown size={14} aria-hidden="true" className={`shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <ul id={id} hidden={!expanded} className={mobile ? 'ml-7 border-l border-brand-200 pl-2' : 'absolute right-0 top-full mt-1 w-48 rounded-lg border border-brand-200 bg-white p-1 shadow-lg'}>
        {(['christmas', 'halloween'] as const).map(holiday => {
          const info = holidayPages[holiday];
          const selected = pathname === info.publicPath || (holiday === 'christmas' && pathname === '/holiday-decorating');
          return <li key={holiday}><Link href={info.publicPath} aria-current={selected ? 'page' : undefined}
            onClick={() => { setExpanded(false); onNavigate?.(); }}
            className={`block rounded px-3 py-3 text-sm ${selected ? 'bg-emerald-100 font-medium text-emerald-800' : 'text-brand-700 hover:bg-brand-100'}`}>
            {info.label}
          </Link></li>;
        })}
      </ul>
    </div>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Home', icon: '\u{1F3E0}' },
    { href: '/news', label: 'News', icon: '\u{1F4F0}' },
    { href: '/events', label: 'Events', icon: '\u{1F4C5}' },
    ...(isYardSaleMapActive
      ? [{ href: '/map', label: 'Yard Sale Map', icon: '\u{1F5FA}\uFE0F' }]
      : []),
    { href: '/pool', label: 'Pool', icon: '\u{1F30A}', highlight: true },
    { href: '/new-residents', label: 'New Residents', icon: '\u{1F9ED}' },
    { href: '/local-area', label: 'Local Area Map', icon: '\u{1F4CD}' },
    { href: '/trash', label: 'Trash & Recycling', icon: '\u{1F5D1}\uFE0F' },
    { href: '/documents', label: 'Documents', icon: '\u{1F4C4}' },
    { href: '/yard-of-the-month', label: 'Yard of the Month', icon: '\u{1F33F}' },
    { href: '/holiday-decorating', label: 'Holiday Decorating', icon: '\u{1F384}' },
    { href: '/about', label: 'About', icon: '\u2139\uFE0F' },
  ];

  return (
    <header className="border-b border-brand-100 bg-brand-50/60 backdrop-blur sticky top-0 z-50">
      <div className="container py-3 flex flex-col items-center gap-3">
        {/* Top row: centered logo + mobile hamburger on the right */}
        <div className="relative w-full flex items-center justify-center">
          <nav className="absolute left-0 flex items-center gap-3 text-sm text-brand-700" aria-label="Account portals">
            <Link href="/admin/content" className="inline-flex items-center gap-1" aria-label="Admins" title="Admins">
              <ShieldCheck size={18} /><span className="hidden lg:inline">Admins</span>
            </Link>
            <Link href="/homeowners" className="inline-flex items-center gap-1" aria-label="Homeowners" title="Homeowners">
              <House size={18} /><span className="hidden lg:inline">Homeowners</span>
            </Link>
          </nav>
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
        <nav aria-label="Main navigation" className="hidden md:flex items-center justify-center gap-1">
          {links.map((link) => {
            if (link.href === '/holiday-decorating') return <HolidayNavigation key={link.href} />;
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
        </nav>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-brand-100 bg-brand-50/95 backdrop-blur">
          <nav aria-label="Mobile navigation" className="container flex flex-col py-2">
            {links.map((link) => link.href === '/holiday-decorating' ? <HolidayNavigation key={link.href} mobile onNavigate={() => setOpen(false)} /> : (
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
          </nav>
        </div>
      )}
    </header>
  );
}

