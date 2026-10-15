'use client';
import SuccessMessage from './SuccessMessage';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Upload, Search, FileText, ExternalLink, Trash2, RefreshCw, LoaderCircle } from 'lucide-react';
import { assetUrl } from '@/lib/member-hub/content';
import type { LibraryAsset } from '@/lib/member-hub/asset-library';
import { uploadMedia } from '@/lib/member-hub/content-actions';
import { removeFile, retryFileCleanup } from '@/lib/member-hub/file-actions';

function size(bytes: number) { return bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`; }

export default function FileLibrary({ initial, pendingCleanup }: { initial: LibraryAsset[]; pendingCleanup: boolean }) {
  const router = useRouter();
  const [assets, setAssets] = useState(initial);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(pendingCleanup);
  const [removing, setRemoving] = useState<LibraryAsset | null>(null);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { setAssets(initial); setPending(pendingCleanup); }, [initial, pendingCleanup]);
  useEffect(() => { if (removing) dialog.current?.showModal(); else dialog.current?.close(); }, [removing]);
  const visible = assets.filter(asset => asset.original_filename.toLowerCase().includes(query.toLowerCase()) && (type === 'all' || (type === 'images' ? asset.mime_type.startsWith('image/') : asset.mime_type === 'application/pdf')));
  async function upload(files: File[]) {
    if (!files?.length) return;
    setBusy(true); setMessage({});
    let uploaded = 0;
    try {
      for (const file of Array.from(files)) {
        const form = new FormData(); form.set('file', file);
        const result = await uploadMedia(form);
        if (result.error) { setMessage({ error: result.error }); break; }
        if (result.asset) { const asset = { ...result.asset, usage: [] }; setAssets(previous => [asset, ...previous]); uploaded++; }
      }
      if (uploaded === files.length) setMessage({ success: uploaded === 1 ? 'File uploaded.' : `${uploaded} files uploaded.` });
      router.refresh();
    } catch { setMessage({ error: 'Unable to upload this file.' }); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!removing) return;
    setBusy(true); setMessage({});
    try {
      const result = await removeFile(removing.id);
      if (result.error) setMessage({ error: result.error });
      else {
        setAssets(previous => previous.filter(asset => asset.id !== removing.id)); setPending(!!result.pending);
        setMessage({ success: result.pending ? 'File removed. Storage cleanup pending.' : 'File removed.' }); router.refresh();
      }
    } catch { setMessage({ error: 'Unable to remove this file.' }); }
    finally { setBusy(false); setRemoving(null); }
  }
  async function retry() {
    setBusy(true); setMessage({});
    try {
      const result = await retryFileCleanup();
      if (result.error) setMessage({ error: result.error });
      else { setPending(false); setMessage({ success: 'Storage cleanup complete.' }); router.refresh(); }
    } catch { setMessage({ error: 'Storage cleanup is temporarily unavailable.' }); }
    finally { setBusy(false); }
  }
  return <>
    <div className="hub-page-heading"><div><p className="hub-eyebrow">Administration</p><h1>Files</h1></div>
      <label className="hub-button hub-upload"><Upload size={17} />{busy ? 'Working...' : 'Upload Files'}<input type="file" aria-label="Upload Files" multiple disabled={busy} accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" onChange={event => { upload(Array.from(event.target.files || [])); event.target.value = ''; }} /></label>
    </div>
    {message.error && <p className="hub-message hub-error" role="alert">{message.error}</p>}<SuccessMessage notice={message} />
    <div className="hub-content-filters"><label className="hub-search"><Search size={17} /><input aria-label="Search files" placeholder="Search files" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <select aria-label="File type" value={type} onChange={event => setType(event.target.value)}><option value="all">All Files</option><option value="images">Images</option><option value="pdf">PDFs</option></select>
      {pending && <button type="button" className="hub-button hub-secondary" disabled={busy} onClick={retry}><RefreshCw size={17} />Retry Cleanup</button>}
    </div>
    <div className="hub-table-wrap hub-files-table-wrap"><table className="hub-table hub-files-table"><thead><tr><th>File</th><th>Type</th><th>Size</th><th>Used By</th><th>Actions</th></tr></thead>
      <tbody>{visible.map(asset => <tr key={asset.id}><td><div className="hub-library-file">
        {asset.mime_type.startsWith('image/') ? <img loading="lazy" src={assetUrl({ asset: { _ref: asset.id } })} alt="" /> : <FileText size={28} />}
        <strong>{asset.original_filename}</strong></div></td><td>{asset.mime_type === 'application/pdf' ? 'PDF' : asset.mime_type.split('/')[1]?.toUpperCase()}</td><td>{size(asset.size_bytes)}</td>
        <td>{asset.usage.length ? <ul className="hub-library-usage">{asset.usage.map(row => <li key={row.id}><Link href={`/admin/content/${encodeURIComponent(row.id)}`}>{row.title}</Link>{row.status === 'draft' && <span>Draft</span>}</li>)}</ul> : <span>Unused</span>}</td>
        <td><div className="hub-row-actions"><a className="hub-icon" href={assetUrl({ asset: { _ref: asset.id } })} target="_blank" rel="noreferrer" title="Open File" aria-label={`Open ${asset.original_filename}`}><ExternalLink size={17} /></a>
          <button type="button" className="hub-icon hub-danger" disabled={busy || !!asset.usage.length} title={asset.usage.length ? 'Remove from content before deleting this file' : 'Remove File'} aria-label={`Remove ${asset.original_filename}`} onClick={() => setRemoving(asset)}><Trash2 size={17} /></button></div></td></tr>)}</tbody>
    </table></div>
    {!visible.length && <p className="hub-empty">No files match this view.</p>}
    <dialog ref={dialog} className="hub-dialog" aria-label="Remove file" onCancel={() => setRemoving(null)}><h2>Remove file?</h2><p>{removing?.original_filename}</p>
      <div className="hub-row-actions"><button className="hub-button hub-secondary" disabled={busy} onClick={() => setRemoving(null)}>Cancel</button><button className="hub-button hub-danger" disabled={busy} onClick={remove}>{busy && <LoaderCircle size={17} className="animate-spin" />}Remove</button></div>
    </dialog>
  </>;
}
