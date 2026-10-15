'use client';

import Link from 'next/link';
import { holidayPages, type Holiday } from '@/lib/member-hub/holidays';

export default function HolidaySwitcher({ holiday, admin = false, onChange, disabled = false }: {
  holiday: Holiday; admin?: boolean; onChange?: (holiday: Holiday) => void; disabled?: boolean;
}) {
  return <nav aria-label="Holiday selection" className={admin ? 'hub-tabs hub-program-tabs' : 'flex flex-wrap gap-3'}>
    {(['christmas', 'halloween'] as const).map(value => {
      const info = holidayPages[value];
      const content = <>{!admin && <span aria-hidden="true" className="text-3xl">{value === 'christmas' ? '\u{1F384}' : '\u{1F383}'}</span>}<span>{info.label}</span></>;
      const className = admin ? undefined : `inline-flex min-h-16 items-center gap-3 rounded-lg border px-5 py-3 text-base font-semibold transition-colors ${holiday === value ? 'border-white bg-white text-emerald-950' : 'border-white/40 text-white hover:bg-white/10'}`;
      return onChange ? <button key={value} type="button" aria-pressed={holiday === value} disabled={disabled} title={info.label} className={className} onClick={() => onChange(value)}>{content}</button>
        : <Link key={value} href={admin ? info.adminPath : info.publicPath} aria-current={holiday === value ? 'page' : undefined} title={info.label} className={className}>{content}</Link>;
    })}
  </nav>;
}
