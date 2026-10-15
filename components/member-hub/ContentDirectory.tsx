'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Eye, FilePenLine, Trash2 } from 'lucide-react';
import { contentKinds, kindLabels, type ContentRecord } from '@/lib/member-hub/content';
import { removeContent } from '@/lib/member-hub/content-actions';
import SuccessMessage from './SuccessMessage';
import { groupContent, filterContent } from '@/lib/member-hub/content-directory';

export default function ContentDirectory({ records }: { records: ContentRecord[] }) {
  const router = useRouter();
  const [items, setItems] = useState(records);
  const [selected, setSelected] = useState<ContentRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => setItems(records), [records]);
  useEffect(() => { if (selected) dialog.current?.showModal(); else dialog.current?.close(); }, [selected]);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [status, setStatus] = useState('all');
  const visible = filterContent(groupContent(items), query, kind, status);
  const savedVersion = selected?.id.startsWith('drafts.') ? items.find(row => row.id === selected.id.slice(7)) : undefined;
  async function remove() {
    if (!selected || busy) return;
    setBusy(true); setMessage({});
    try {
      const result = await removeContent(selected.id, selected.version);
      if (result.error) { setMessage({ error: result.error }); router.refresh(); }
      else {
        setItems(previous => previous.filter(row => row.id !== selected.id));
        setSelected(null); setMessage({ success: savedVersion ? 'Draft discarded.' : 'Content deleted.' }); router.refresh();
      }
    } catch { setMessage({ error: 'Unable to delete this content. Please try again.' }); }
    finally { setBusy(false); }
  }
  return <><div className="hub-page-heading"><div><p className="hub-eyebrow">Administration</p><h1>Content</h1></div><Link className="hub-button" href="/admin/content/new"><Plus size={17} />New Content</Link></div>
    <SuccessMessage notice={message} />
    {message.error && !selected && <p className="hub-message hub-error" role="alert">{message.error}</p>}
    <div className="hub-content-filters"><label className="hub-search"><Search size={17} /><input aria-label="Search content" placeholder="Search content" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <select aria-label="Filter Content Type" value={kind} onChange={event => setKind(event.target.value)}><option value="all">All Types</option>{contentKinds.filter(kind => ['post', 'event', 'page'].includes(kind)).map(kind => <option key={kind} value={kind}>{kindLabels[kind]}</option>)}</select>
      <select aria-label="Filter Status" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All Statuses</option><option value="published">Published</option><option value="draft">Drafts</option></select></div>
    <div className="hub-table-wrap"><table className="hub-table hub-content-table"><thead><tr><th>Title</th><th>Type</th><th>Access</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>{visible.map(group => { const record = group.current, published = group.saved?.status === 'published' ? group.saved : undefined;
        const previewHref = published ? `/content/${encodeURIComponent(published.id)}` : `/admin/content/${encodeURIComponent(record.id)}?view=preview`;
        return <tr key={group.id}><td><Link href={`/admin/content/${encodeURIComponent(record.id)}`}><strong>{record.title}</strong></Link></td><td>{kindLabels[record.kind]}</td>
        <td>{record.visibility === 'public' ? 'Public' : 'Members Only'}</td><td><div className="hub-content-status">
          {published && <span className="hub-status hub-status-approved">Published</span>}
          {record.status === 'draft' && <span className="hub-status hub-status-pending">{published ? 'Draft changes' : 'Draft'}</span>}
        </div></td>
        <td><div className="hub-row-actions"><Link className="hub-icon" href={`/admin/content/${encodeURIComponent(record.id)}`} aria-label={`Edit ${record.title}`} title="Edit"><FilePenLine size={17} /></Link>
          <Link className="hub-icon" href={previewHref} aria-label={`Preview ${record.title}`} title={published ? 'Preview Published Page' : 'Preview Draft'} target="_blank"><Eye size={17} /></Link>
          <button type="button" className="hub-icon hub-danger" aria-label={group.draft && group.saved ? `Discard draft for ${record.title}` : `Delete ${record.title}`} title={group.draft && group.saved ? 'Discard Draft' : 'Delete'} disabled={busy} onClick={() => { setSelected(record); setMessage({}); }}><Trash2 size={17} /></button></div></td></tr>; })}</tbody>
    </table></div>{!visible.length && <p className="hub-empty">No content matches this view.</p>}
    <dialog ref={dialog} className="hub-dialog" aria-label="Delete content" onCancel={event => { if (busy) event.preventDefault(); else setSelected(null); }}>
      <h2>{savedVersion ? 'Discard draft?' : 'Delete content?'}</h2><p><strong>{selected?.title}</strong></p>
      <p>{savedVersion ? `Only the draft will be removed. ${savedVersion.status === 'published' ? 'The published version stays live.' : 'The saved version will remain.'} Uploaded files are not deleted.` : 'This cannot be undone. Uploaded files are not deleted.'}</p>
      {message.error && <p className="hub-message hub-error" role="alert">{message.error}</p>}
      <div className="hub-row-actions"><button type="button" className="hub-button hub-secondary" disabled={busy} onClick={() => setSelected(null)}>Cancel</button>
        <button type="button" className="hub-button hub-danger" disabled={busy} onClick={remove}>{busy ? 'Deleting...' : savedVersion ? 'Discard Draft' : 'Delete'}</button></div>
    </dialog>
  </>;
}
