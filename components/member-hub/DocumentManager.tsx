'use client';
import SuccessMessage from './SuccessMessage';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FolderClosed, FolderOpen, FolderPlus, FileText, FilePlus2, Upload, Pencil, Trash2, ExternalLink, Save, LoaderCircle, Search } from 'lucide-react';
import { assetUrl, newContent, type ContentRecord, type MediaAsset } from '@/lib/member-hub/content';
import { uploadDocumentMedia } from '@/lib/member-hub/content-actions';
import { saveDocument, removeDocument } from '@/lib/member-hub/document-actions';

const unfiled = '__unfiled__';

export default function DocumentManager({ initial, assets: originalAssets, selected }: {
  initial: ContentRecord[]; assets: MediaAsset[]; selected?: string;
}) {
  const router = useRouter();
  const first = initial.find(row => row.id === selected);
  const [records, setRecords] = useState(initial);
  const [assets, setAssets] = useState(originalAssets);
  const [folderId, setFolderId] = useState(first?.kind === 'documentFolder' ? first.id : first?.settings.folder?._ref || initial.find(row => row.kind === 'documentFolder')?.id || unfiled);
  const [editing, setEditing] = useState<ContentRecord | null>(first || null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const [removing, setRemoving] = useState<ContentRecord | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const dirty = !!editing && (editing.version ? JSON.stringify(editing) !== JSON.stringify(records.find(row => row.id === editing.id))
    : !!(editing.title || editing.settings.description || editing.settings.file || editing.settings.sortOrder));
  useEffect(() => setRecords(initial), [initial]);
  useEffect(() => setAssets(originalAssets), [originalAssets]);
  useEffect(() => { if (removing) dialog.current?.showModal(); else dialog.current?.close(); }, [removing]);
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) { if (dirty) event.preventDefault(); }
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const folders = records.filter(row => row.kind === 'documentFolder').sort((a, b) => (Number(a.settings.sortOrder) || 0) - (Number(b.settings.sortOrder) || 0) || a.title.localeCompare(b.title));
  const files = records.filter(row => row.kind === 'documentFile');
  const folder = folders.find(row => row.id === folderId);
  const assigned = (id: string) => files.filter(row => id === unfiled ? !folders.some(folder => folder.id === row.settings.folder?._ref) : row.settings.folder?._ref === id);
  const matches = (row: ContentRecord) => `${row.title} ${row.settings.description || ''}`.toLowerCase().includes(query.toLowerCase());
  const visibleFolders = folders.filter(row => matches(row) || assigned(row.id).some(matches));
  const currentFiles = assigned(folderId).filter(matches).sort((a, b) => a.title.localeCompare(b.title));

  function discard() { return !dirty || window.confirm('Discard unsaved changes?'); }
  function choose(id: string) { if (!discard()) return; setFolderId(id); setEditing(null); setMessage({}); }
  function create(kind: 'documentFolder' | 'documentFile') {
    if (!discard()) return;
    const row = { ...newContent(kind), status: kind === 'documentFile' && folder ? folder.status : 'published' as const, visibility: folder?.visibility || 'public' as const };
    if (kind === 'documentFile' && folder) row.settings.folder = { _type: 'reference', _ref: folder.id };
    setEditing(row); setMessage({});
  }
  function edit(row: ContentRecord) { if (!discard()) return false; setEditing({ ...row, settings: { ...row.settings } }); setMessage({}); return true; }
  function setting(key: string, value: unknown) { setEditing(previous => previous ? { ...previous, settings: { ...previous.settings, [key]: value } } : null); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!editing) return;
    setBusy(true); setMessage({});
    try {
      const result = await saveDocument(editing, editing.version || null);
      if (result.error) setMessage({ error: result.error });
      else if ('content' in result && result.content) {
        const saved = result.content as ContentRecord;
        setRecords(previous => [...previous.filter(row => row.id !== saved.id), saved]);
        setFolderId(saved.kind === 'documentFolder' ? saved.id : saved.settings.folder?._ref || unfiled);
        setEditing(null); setMessage({ success: saved.kind === 'documentFolder' ? 'Folder saved.' : 'Document saved.' });
        router.refresh();
      }
    } catch { setMessage({ error: 'Unable to save this item.' }); }
    finally { setBusy(false); }
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true); setMessage({});
    try {
      const form = new FormData(); form.set('file', file);
      const result = await uploadDocumentMedia(form);
      if (result.error) setMessage({ error: result.error });
      else if (result.asset) {
        const asset = result.asset;
        setAssets(previous => [asset, ...previous.filter(row => row.id !== asset.id)]);
        setEditing(previous => previous ? { ...previous, title: previous.title || file.name.replace(/\.[^.]+$/, ''), settings: {
          ...previous.settings, file: { _type: 'file', asset: { _type: 'reference', _ref: asset.id } }, uploadedAt: new Date().toISOString(),
        } } : null);
        setMessage({ success: 'File uploaded.' });
      }
    } catch { setMessage({ error: 'Unable to upload this file.' }); }
    finally { setUploading(false); }
  }
  async function remove() {
    if (!removing) return;
    setBusy(true); setMessage({});
    try {
      const result = await removeDocument(removing.id, removing.version);
      if (result.error) setMessage({ error: result.error });
      else {
        setRecords(previous => previous.filter(row => row.id !== removing.id));
        if (folderId === removing.id) setFolderId(unfiled);
        if (editing?.id === removing.id) setEditing(null);
        setMessage({ success: removing.kind === 'documentFolder' ? 'Folder removed.' : 'Document removed.' }); router.refresh();
      }
    } catch { setMessage({ error: 'Unable to remove this item.' }); }
    finally { setBusy(false); setRemoving(null); }
  }
  function fileActions(row: ContentRecord) {
    return <div className="hub-row-actions">
      {assetUrl(row.settings.file) && <a className="hub-icon" href={assetUrl(row.settings.file)} target="_blank" rel="noreferrer" title="Open File" aria-label={`Open ${row.title}`}><ExternalLink size={16} /></a>}
      <button className="hub-icon" type="button" disabled={busy || uploading} title="Edit Document" aria-label={`Edit ${row.title}`} onClick={() => edit(row)}><Pencil size={16} /></button>
      <button className="hub-icon hub-danger" type="button" disabled={busy || uploading} title="Remove Document" aria-label={`Remove ${row.title}`} onClick={() => setRemoving(row)}><Trash2 size={16} /></button>
    </div>;
  }
  return <>
    <div className="hub-page-heading"><div><p className="hub-eyebrow">Administration</p><h1>Documents</h1></div>
      <div className="hub-row-actions"><Link className="hub-icon" href="/documents" target="_blank" title="View Public Documents" aria-label="View Public Documents"><ExternalLink size={17} /></Link>
        <button className="hub-button" disabled={busy || uploading} onClick={() => create('documentFolder')}><FolderPlus size={17} />New Folder</button></div>
    </div>
    {message.error && <p className="hub-message hub-error" role="alert">{message.error}</p>}
    <SuccessMessage notice={message} />
    <div className="hub-document-workspace">
      <nav className="hub-document-tree" aria-label="Folder tree">
        <label className="hub-search"><Search size={16} /><input aria-label="Search documents" placeholder="Search documents" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <ul>{visibleFolders.map(row => <li key={row.id}><details open={folderId === row.id || !!query}>
          <summary onClick={() => choose(row.id)}><FolderClosed size={17} className="hub-folder-closed" /><FolderOpen size={17} className="hub-folder-open" />
            <span className="hub-tree-title">{row.title}</span><span className="hub-tree-count">{assigned(row.id).length}</span></summary>
          <ul>{assigned(row.id).filter(matches).map(file => <li key={file.id}><button type="button" aria-current={editing?.id === file.id ? 'page' : undefined} onClick={() => { if (edit(file)) setFolderId(row.id); }}><FileText size={15} /><span>{file.title}</span></button></li>)}
            {!assigned(row.id).length && <li className="hub-tree-empty">No files</li>}
          </ul>
        </details></li>)}</ul>
        <button type="button" className="hub-unfiled-folder" aria-current={folderId === unfiled ? 'page' : undefined} onClick={() => choose(unfiled)}><FolderClosed size={17} />Unfiled<span className="hub-tree-count">{assigned(unfiled).length}</span></button>
      </nav>
      <section className="hub-document-content" aria-label="Document workspace">
        {editing ? <form onSubmit={save} className="hub-document-form">
          <h2>{editing.version ? 'Edit' : 'New'} {editing.kind === 'documentFolder' ? 'Folder' : 'Document'}</h2>
          <fieldset disabled={busy || uploading}>
            <label className="hub-editor-field">{editing.kind === 'documentFolder' ? 'Folder Name' : 'Document Title'}<input aria-label={editing.kind === 'documentFolder' ? 'Folder Name' : 'Document Title'} required maxLength={300} value={editing.title} onChange={event => setEditing({ ...editing, title: event.target.value })} /></label>
            <label className="hub-editor-field">Description<textarea aria-label="Description" rows={3} value={editing.settings.description || ''} onChange={event => setting('description', event.target.value)} /></label>
            {editing.kind === 'documentFolder' ? <label className="hub-editor-field">Sort Order<input aria-label="Sort Order" type="number" value={editing.settings.sortOrder ?? 0} onChange={event => setting('sortOrder', Number(event.target.value))} /></label> : <>
              <label className="hub-editor-field">Folder<select aria-label="Folder" value={editing.settings.folder?._ref || ''} onChange={event => setting('folder', event.target.value ? { _type: 'reference', _ref: event.target.value } : undefined)}><option value="">Unfiled</option>{folders.map(row => <option value={row.id} key={row.id}>{row.title}</option>)}</select></label>
              <label className="hub-editor-field">File<select aria-label="File" value={editing.settings.file?.asset?._ref || ''} onChange={event => { setting('file', event.target.value ? { _type: 'file', asset: { _type: 'reference', _ref: event.target.value } } : undefined); }}><option value="">None</option>{assets.map(asset => <option value={asset.id} key={asset.id}>{asset.original_filename}</option>)}</select></label>
              <label className="hub-button hub-secondary hub-upload"><Upload size={17} />{uploading ? 'Uploading...' : 'Upload File'}<input type="file" aria-label="Upload File" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" onChange={event => { upload(event.target.files?.[0]); event.target.value = ''; }} /></label>
            </>}
            <label className="hub-editor-field">Access<select aria-label="Access" value={editing.visibility} onChange={event => setEditing({ ...editing, visibility: event.target.value as ContentRecord['visibility'] })}><option value="public">Public</option><option value="members">Members Only</option></select></label>
            <label className="hub-check"><input type="checkbox" checked={editing.status === 'published'} onChange={event => setEditing({ ...editing, status: event.target.checked ? 'published' : 'draft' })} />Published</label>
          </fieldset>
          <div className="hub-row-actions"><button className="hub-button" disabled={busy || uploading} type="submit">{busy ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />}Save {editing.kind === 'documentFolder' ? 'Folder' : 'Document'}</button>
            <button className="hub-button hub-secondary" type="button" disabled={busy || uploading} onClick={() => setEditing(null)}>Cancel</button></div>
        </form> : <>
          <div className="hub-document-folder-heading"><div><h2>{folder?.title || 'Unfiled'}</h2>{folder?.settings.description && <p>{folder.settings.description}</p>}</div>
            <div className="hub-row-actions">{folder && <>
              <button className="hub-icon" title="Edit Folder" aria-label={`Edit folder ${folder.title}`} disabled={busy || uploading} onClick={() => edit(folder)}><Pencil size={17} /></button>
              <button className="hub-icon hub-danger" title={assigned(folderId).length ? 'Move or remove files before removing this folder' : 'Remove Folder'} aria-label={`Remove folder ${folder.title}`} disabled={busy || uploading || !!assigned(folderId).length} onClick={() => setRemoving(folder)}><Trash2 size={17} /></button>
            </>}
              <button className="hub-button" disabled={busy || uploading} onClick={() => create('documentFile')}><FilePlus2 size={17} />Add Document</button>
            </div>
          </div>
          {folder && <p className="hub-document-folder-status">{folder.status === 'published' ? 'Published' : 'Draft'} | {folder.visibility === 'public' ? 'Public' : 'Members Only'}</p>}
          <ul className="hub-document-file-list">{currentFiles.map(row => <li key={row.id}><FileText size={20} /><div className="hub-document-file-info"><button type="button" onClick={() => edit(row)}><strong>{row.title}</strong></button>
            <p>{assets.find(asset => asset.id === row.settings.file?.asset?._ref)?.original_filename || 'No file'} | {row.status === 'published' ? 'Published' : 'Draft'} | {row.visibility === 'public' ? 'Public' : 'Members Only'}</p>
          </div>{fileActions(row)}</li>)}</ul>
          {!currentFiles.length && <p className="hub-empty">{query ? 'No matching files.' : 'No files in this folder.'}</p>}
        </>}
      </section>
    </div>
    <dialog ref={dialog} className="hub-dialog" onCancel={() => setRemoving(null)} aria-label="Remove document item">
      <h2>Remove {removing?.kind === 'documentFolder' ? 'folder' : 'document'}?</h2><p>{removing?.title}</p>
      <div className="hub-row-actions"><button className="hub-button hub-secondary" type="button" disabled={busy} onClick={() => setRemoving(null)}>Cancel</button><button className="hub-button hub-danger" type="button" disabled={busy} onClick={remove}>Remove</button></div>
    </dialog>
  </>;
}
