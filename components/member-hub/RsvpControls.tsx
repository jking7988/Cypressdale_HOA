'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, HelpCircle, X } from 'lucide-react';
type Summary = { yes: number; maybe: number; response: 'yes' | 'maybe' | null; canRespond: boolean; signedIn: boolean };
export default function RsvpControls({ eventId, yes = 0, maybe = 0 }: { eventId: string; yes?: number; maybe?: number }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    fetch(`/api/rsvp?eventId=${encodeURIComponent(eventId)}`, { cache: 'no-store' }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      if (active) setSummary(data);
    }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [eventId]);
  async function save(response: 'yes' | 'maybe' | null) {
    setBusy(true); setError('');
    try {
      const result = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId, response }) });
      const data = await result.json(); if (!result.ok) throw new Error(data.error);
      setSummary(data);
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save RSVP.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-2 text-sm" aria-label="Event RSVP">
    <p aria-live="polite">{summary?.yes ?? yes} going | {summary?.maybe ?? maybe} maybe</p>
    {summary?.canRespond ? <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy} aria-pressed={summary.response === 'yes'} onClick={() => save('yes')} className={`inline-flex items-center gap-1 rounded-md border px-3 py-2 ${summary.response === 'yes' ? 'bg-emerald-100 border-emerald-700' : 'border-emerald-200'}`}><Check size={16} />I'm going</button>
      <button type="button" disabled={busy} aria-pressed={summary.response === 'maybe'} onClick={() => save('maybe')} className={`inline-flex items-center gap-1 rounded-md border px-3 py-2 ${summary.response === 'maybe' ? 'bg-amber-100 border-amber-700' : 'border-amber-200'}`}><HelpCircle size={16} />Maybe</button>
      {summary.response && <button type="button" disabled={busy} onClick={() => save(null)} className="inline-flex items-center gap-1 text-red-700"><X size={16} />Remove RSVP</button>}
    </div> : summary && <p>{summary.signedIn ? 'Approved access is required to RSVP.' : <Link href="/admin-sign-in" className="underline">Sign in to RSVP</Link>}</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </section>;
}
