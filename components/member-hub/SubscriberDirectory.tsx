'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RefreshCw, Trash2, X } from 'lucide-react';
import { subscriberStatus, type NewsletterSubscriber } from '@/lib/newsletter/subscriber-types';
import SuccessMessage from './SuccessMessage';

const filters = ['all', 'subscribed', 'unconfirmed', 'unsubscribed'] as const;
const labels = { all: 'All', subscribed: 'Subscribed', unconfirmed: 'Unconfirmed', unsubscribed: 'Unsubscribed' };
const statusClasses = { subscribed: 'approved', unconfirmed: 'pending', unsubscribed: 'revoked' };

export default function SubscriberDirectory({ initial }: { initial: NewsletterSubscriber[] }) {
  const router = useRouter(), dialog = useRef<HTMLDialogElement>(null);
  const [subscribers, setSubscribers] = useState(initial);
  const [filter, setFilter] = useState<typeof filters[number]>('all');
  const [search, setSearch] = useState(''), [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<NewsletterSubscriber | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState<{ error?: string; success?: string }>({});
  useEffect(() => setSubscribers(initial), [initial]);
  useEffect(() => {
    if (selected) dialog.current?.showModal(); else dialog.current?.close();
    setConfirmed(false);
  }, [selected]);
  const visible = subscribers.filter(subscriber => (filter === 'all' || subscriberStatus(subscriber) === filter)
    && `${subscriber.name ?? ''} ${subscriber.email} ${subscriber.street ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()));

  async function refresh() {
    setBusy(true); setNotice({});
    try {
      const response = await fetch('/api/newsletter/subscribers', { cache: 'no-store' });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setSubscribers(data.subscribers);
    } catch (error) { setNotice({ error: error instanceof Error ? error.message : 'Unable to load subscribers.' }); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!selected || !confirmed || busy) return;
    setBusy(true); setNotice({});
    try {
      const response = await fetch(`/api/newsletter/subscribers/${selected.id}`, { method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: selected.email }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setSubscribers(current => current.filter(subscriber => subscriber.id !== selected.id));
      setSelected(null); setNotice({ success: data.success }); router.refresh();
    } catch (error) { setNotice({ error: error instanceof Error ? error.message : 'Unable to remove subscriber.' }); }
    finally { setBusy(false); }
  }
  return <>
    <div className="hub-directory-tools"><div className="hub-tabs" role="group" aria-label="Subscriber status filter">
      {filters.map(tab => <button type="button" key={tab} aria-pressed={filter === tab} onClick={() => setFilter(tab)}>
        {labels[tab]} <span>{subscribers.filter(subscriber => tab === 'all' || subscriberStatus(subscriber) === tab).length}</span></button>)}
    </div><div className="hub-subscriber-search"><label className="hub-search"><Search size={17} />
      <input aria-label="Search subscribers" placeholder="Search subscribers" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <button type="button" className="hub-icon" title="Refresh subscribers" aria-label="Refresh subscribers" disabled={busy} onClick={refresh}><RefreshCw size={17} /></button></div></div>
    <SuccessMessage notice={notice} />
    {notice.error && !selected && <p className="hub-message hub-error" role="alert">{notice.error}</p>}
    <table className="hub-table hub-subscriber-table"><caption className="sr-only">Newsletter subscribers</caption>
      <thead><tr><th scope="col">Subscriber</th><th scope="col">Street</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
      <tbody>{visible.map(subscriber => <tr key={subscriber.id}>
        <td><strong>{subscriber.name || 'Name not provided'}</strong><span>{subscriber.email}</span>
          <span>Added {new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium' }).format(new Date(subscriber.created_at))}</span></td>
        <td>{subscriber.street || '-'}</td><td><span className={`hub-status hub-status-${statusClasses[subscriberStatus(subscriber)]}`}>{labels[subscriberStatus(subscriber)]}</span></td>
        <td><button type="button" className="hub-icon hub-danger" title="Remove subscriber" aria-label={`Remove ${subscriber.email}`} disabled={busy}
          onClick={() => { setNotice({}); setSelected(subscriber); }}><Trash2 size={17} /></button></td>
      </tr>)}</tbody></table>
    {!visible.length && <p className="hub-empty">{subscribers.length ? 'No subscribers match this view.' : 'No subscribers yet.'}</p>}
    <dialog ref={dialog} className="hub-dialog" onClose={() => setSelected(null)} onCancel={event => { if (busy) event.preventDefault(); }}>
      <div className="hub-dialog-heading"><h2>Remove Subscriber</h2><button type="button" className="hub-icon" title="Close" aria-label="Close" disabled={busy} onClick={() => setSelected(null)}><X size={18} /></button></div>
      {selected && <><p className="hub-subscriber-confirm-email"><strong>{selected.email}</strong></p>
        <p>The subscriber's newsletter record and contact details will be deleted. Their HOA account will not be removed.</p>
        <label className="hub-check"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />I confirm removal of this subscriber.</label>
        {notice.error && <p className="hub-message hub-error" role="alert">{notice.error}</p>}
        <div className="hub-subscriber-dialog-actions"><button type="button" className="hub-button hub-secondary" disabled={busy} onClick={() => setSelected(null)}>Cancel</button>
          <button type="button" className="hub-button hub-danger" disabled={busy || !confirmed} onClick={remove}><Trash2 size={17} />{busy ? 'Removing...' : 'Remove Subscriber'}</button></div></>}
    </dialog>
  </>;
}
