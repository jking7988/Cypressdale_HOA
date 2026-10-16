'use client';
import SuccessMessage from './SuccessMessage';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { Save, Eye, Columns2, PencilLine, Settings, Upload, Plus, Paperclip, ArrowUp, ArrowDown, Trash2, LoaderCircle, Globe, LockKeyhole, GripVertical } from 'lucide-react';
import { contentKinds, kindLabels, assetUrl, eventScheduleError, plainTitle, titleEditorValue, type ContentRecord, type MediaAsset } from '@/lib/member-hub/content';
import { saveContent, uploadMedia } from '@/lib/member-hub/content-actions';
import PublishedPreview from './PublishedPreview';
import type { PreviewDevice } from './PagePreviewFrame';
import { sidebarOptions } from '@/lib/member-hub/sidebar';

const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false,
  loading: () => <div className="hub-rich-editor" aria-busy="true"><div className="hub-rich-toolbar" style={{ minHeight: 44 }} /><div className="hub-rich-editable" /></div>,
});

export default function ContentEditor({ initial, assets: originalAssets, folders, publishedVersion, initialMode = 'edit' }: {
  initial: ContentRecord; assets: MediaAsset[]; folders: { id: string; title: string }[]; publishedVersion: number | null; initialMode?: 'edit' | 'preview';
}) {
  const router = useRouter();
  const [document, setDocument] = useState<ContentRecord>(() => {
    const sidebar = sidebarOptions(initial.kind, initial.settings);
    return { ...initial, id: initial.id === 'new' ? crypto.randomUUID() : initial.id,
      settings: { ...initial.settings, ...(['post', 'event', 'page'].includes(initial.kind) ? { titleRichText: titleEditorValue(initial.title, initial.settings.titleRichText) } : {}),
        showCalendar: sidebar.calendar, showNewsletterSignup: sidebar.newsletter } };
  });
  const [assets, setAssets] = useState(originalAssets);
  const [mode, setMode] = useState<'edit' | 'split' | 'preview' | 'settings'>(initialMode);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [splitPercent, setSplitPercent] = useState(52);
  const [resizing, setResizing] = useState(false);
  const workspace = useRef<HTMLDivElement>(null);
  const resizePointer = useRef<number | null>(null);
  const editorPaneId = useId();
  const previewPaneId = useId();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const [dirty, setDirty] = useState(false);
  const readers = useRef(new Map<string, () => any[] | null>());
  function register(key: string) { return (reader: () => any[] | null) => { readers.current.set(key, reader); return () => { readers.current.delete(key); }; }; }
  // Read the live editor state before save/preview, including its debounced last keystroke.
  function readDocument() {
    const body = readers.current.get('body')?.();
    const excerpt = readers.current.get('excerpt')?.();
    const title = readers.current.get('title')?.();
    const settings = { ...document.settings, ...(excerpt ? { excerpt } : {}), ...(title ? { titleRichText: title } : {}) };
    return { ...document, title: Array.isArray(settings.titleRichText) ? plainTitle(settings.titleRichText) : document.title, body: body ?? document.body, settings,
      sections: document.sections.map(item => ({ ...item, body: readers.current.get(item._key)?.() ?? item.body })) };
  }
  function changeView(next: typeof mode) { resizePointer.current = null; setResizing(false); setDocument(readDocument()); setMode(next); }
  useEffect(() => {
    function prevent(event: BeforeUnloadEvent) { if (dirty) event.preventDefault(); }
    window.addEventListener('beforeunload', prevent); return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  function update(patch: Partial<ContentRecord>) { setDocument(previous => ({ ...previous, ...patch })); setDirty(true); }
  function setting(key: string, value: any) { update({ settings: { ...document.settings, [key]: value } }); }
  function section(index: number, patch: any) { update({ sections: document.sections.map((item, position) => position === index ? { ...item, ...patch } : item) }); }
  function move(index: number, direction: number) { const sections = [...document.sections]; const item = sections.splice(index, 1)[0]; sections.splice(index + direction, 0, item); update({ sections }); }
  async function save(status = document.status) {
    const current = { ...readDocument(), status };
    const scheduleError = eventScheduleError(current);
    if (scheduleError) { setDocument({ ...current, status: document.status }); setMessage({ error: scheduleError }); setMode('settings'); return; }
    setBusy(true); setMessage({});
    try {
      const result = await saveContent(current, document.version || null, publishedVersion);
      if (result.error) setMessage({ error: result.error });
      else if (result.content) {
        setDocument(result.content); setDirty(false); setMessage({ success: 'Page saved.' });
        router.replace(`/admin/content/${encodeURIComponent(result.content.id)}`); router.refresh();
      }
    } catch { setMessage({ error: 'Unable to save this page. Please try again.' }); }
    finally { setBusy(false); }
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true); setMessage({});
    try {
      const form = new FormData(); form.set('file', file); const result = await uploadMedia(form);
      if (result.error) setMessage({ error: result.error });
      else if (result.asset) { setAssets(previous => [result.asset!, ...previous]); setMessage({ success: `${file.name} uploaded.` }); return result.asset; }
    } catch { setMessage({ error: 'Unable to upload this file.' }); }
    finally { setUploading(false); }
  }
  async function uploadSectionFile(key: string, file: File | undefined) {
    const asset = await upload(file);
    if (!asset) return;
    setDocument(previous => ({ ...previous, sections: previous.sections.map(item => item._key === key
      ? { ...item, file: { _type: 'file', asset: { _type: 'reference', _ref: asset.id } } } : item) }));
    setDirty(true);
  }
  function media(label: string, value: any, onChange: (value: any) => void, imageOnly = false) {
    return <label className="hub-editor-field">{label}<select aria-label={label} value={value?.asset?._ref || ''} onChange={event => onChange(event.target.value ? { ...(value || {}), _type: imageOnly ? 'image' : 'file', asset: { _type: 'reference', _ref: event.target.value } } : undefined)}>
      <option value="">None</option>{assets.filter(asset => (asset.library !== 'documents' || asset.id === value?.asset?._ref) && (!imageOnly || asset.mime_type.startsWith('image/'))).map(asset => <option key={asset.id} value={asset.id} disabled={asset.library === 'documents'}>{asset.original_filename}{asset.library === 'documents' ? ' (existing document use)' : ''}</option>)}
    </select>{imageOnly && assetUrl(value) && <img className="hub-media-thumbnail" src={assetUrl(value)} alt={value.alt || ''} />}</label>;
  }
  function dateInput(key: string, label: string) {
    const date = document.settings[key];
    return <label className="hub-editor-field">{label}<input type="datetime-local" aria-label={label} value={date && !Number.isNaN(Date.parse(date)) ? formatInTimeZone(date, 'America/Chicago', "yyyy-MM-dd'T'HH:mm") : ''}
      onChange={event => setting(key, event.target.value ? fromZonedTime(event.target.value, 'America/Chicago').toISOString() : undefined)} /></label>;
  }
  const sidePreview = mode === 'split' || mode === 'settings';
  const publishedRoutes: Partial<Record<ContentRecord['kind'], string>> = { post: 'news', event: 'events', yardWinner: 'yard-of-the-month' };
  const savedRoute = initial.status === 'published' ? publishedRoutes[initial.kind] || 'content' : 'content';
  const savedId = document.id.startsWith('drafts.') && publishedVersion !== null ? document.id.slice(7) : document.id;
  const hasPublishedVersion = document.status === 'published' || (document.id.startsWith('drafts.') && publishedVersion !== null);
  return <>
    <div className="hub-editor-heading"><div><Link className="hub-back" href="/admin/content">Content</Link><h1>{initial.version ? 'Edit Content' : 'New Content'}</h1></div>
      <div className="hub-editor-save"><span className={`hub-status hub-status-${document.status === 'published' ? 'approved' : 'pending'}`}>{document.status === 'published' ? 'Published' : 'Draft'}</span>
        <span className="hub-editor-save-state" aria-live="polite">{busy ? 'Saving...' : dirty ? 'Unsaved changes' : document.version ? 'Saved' : ''}</span>
        <button type="button" className="hub-button" disabled={busy || uploading} onClick={() => save()}>{busy ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />}Save Changes</button>
        <button type="button" className="hub-button hub-secondary" disabled={busy || uploading} onClick={() => save(document.status === 'draft' ? 'published' : 'draft')}>{document.status === 'draft' ? 'Publish' : 'Unpublish'}</button>
      </div>
    </div>
    {message.error && <p className="hub-message hub-error" role="alert">{message.error}</p>}<SuccessMessage notice={message} />
    <div className="hub-editor-tabs"><div className="hub-tabs hub-editor-view-controls" role="group" aria-label="Content view">
      <button type="button" title="Edit" aria-pressed={mode === 'edit'} onClick={() => changeView('edit')}><PencilLine size={16} />Edit</button>
      <button type="button" title="Side-by-side preview" aria-pressed={mode === 'split'} onClick={() => changeView('split')}><Columns2 size={16} />Side by Side</button>
      <button type="button" title="Preview" aria-pressed={mode === 'preview'} onClick={() => changeView('preview')}><Eye size={16} />Preview</button>
      <button type="button" title="Page Settings" aria-pressed={mode === 'settings'} onClick={() => changeView('settings')}><Settings size={16} />Page Settings</button></div>
      {!!document.version && hasPublishedVersion && <Link href={`/${savedRoute}/${encodeURIComponent(savedId)}`} target="_blank" className="hub-back"><Eye size={17} />Open Saved Page</Link>}</div>
    <div ref={workspace} className={`hub-editor-workspace${sidePreview ? ' hub-editor-workspace-split' : ''}${resizing ? ' hub-editor-workspace-resizing' : ''}`}
      style={{ '--hub-editor-left': `${splitPercent}fr`, '--hub-editor-right': `${100 - splitPercent}fr` } as CSSProperties}>
    {(mode === 'edit' || mode === 'split') && <fieldset id={editorPaneId} disabled={busy || uploading} className="hub-editor-grid" aria-label="Content editing controls">
      <div className="hub-editor-main">
        {['post', 'event', 'page'].includes(document.kind) ? <>
          <p className="hub-editor-title-label">Title</p>
          <RichTextEditor register={register('title')} readOnly={busy} label="Title" variant="title"
            value={titleEditorValue(document.title, document.settings.titleRichText)}
            onChange={titleRichText => update({ title: plainTitle(titleRichText), settings: { ...document.settings, titleRichText } })} />
        </> : <label className="hub-editor-field">Title<input aria-label="Title" maxLength={300} value={document.title} onChange={event => update({ title: event.target.value })} /></label>}
        {(document.kind === 'post' || document.kind === 'event' || document.kind === 'page') && <>
          <h2>Page Body</h2><RichTextEditor register={register('body')} readOnly={busy} label="Page Body" value={document.body} onChange={body => update({ body })} />
          {(document.kind === 'post' || document.kind === 'event') && <details className="hub-section-controls"><summary>Summary</summary><RichTextEditor register={register('excerpt')} readOnly={busy} label="Summary" value={document.settings.excerpt || []} onChange={value => setting('excerpt', value)} /></details>}
          <section className="hub-section"><h2>Page Sections</h2>{document.sections.map((item, index) => <details key={item._key} open={index === 0} className="hub-section-controls">
            <summary>{index + 1}. {item.title || (item._type === 'fileSection' ? 'File / Flyer' : item._type === 'imageWithText' ? 'Image & Text' : item._type === 'topicSection' ? 'Topic Section' : 'Text Section')}</summary>
            <div className="hub-section-actions"><button type="button" className="hub-icon" title="Move Up" aria-label={`Move section ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={17} /></button>
              <button type="button" className="hub-icon" title="Move Down" aria-label={`Move section ${index + 1} down`} disabled={index === document.sections.length - 1} onClick={() => move(index, 1)}><ArrowDown size={17} /></button>
              <button type="button" className="hub-icon hub-danger" title="Remove Section" aria-label={`Remove section ${index + 1}`} onClick={() => update({ sections: document.sections.filter((_, position) => position !== index) })}><Trash2 size={17} /></button></div>
            {item._type !== 'fileSection' && <label className="hub-editor-field">Section Title<input aria-label={`Section ${index + 1} Title`} value={item.title || ''} onChange={event => section(index, { title: event.target.value })} /></label>}
            {item._type === 'topicSection' && <label className="hub-editor-field">Topic Label<input value={item.topicLabel || ''} onChange={event => section(index, { topicLabel: event.target.value })} /></label>}
            {item._type === 'fileSection' ? <>
              {media(`Section ${index + 1} File`, item.file, file => section(index, { file }))}
              <label className="hub-button hub-secondary hub-upload"><Upload size={17} />{uploading ? 'Uploading...' : 'Upload File / Flyer'}
                <input type="file" aria-label={`Upload section ${index + 1} file`} accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" disabled={uploading}
                  onChange={event => { uploadSectionFile(item._key, event.target.files?.[0]); event.target.value = ''; }} /></label>
            </> : <RichTextEditor register={register(item._key)} readOnly={busy} label={`Section ${index + 1} Text`} value={item.body || []} onChange={body => section(index, { body })} />}
            {item._type === 'imageWithText' && <>{media(`Section ${index + 1} Image`, item.image, image => section(index, { image }), true)}
              <label className="hub-editor-field">Image Description<input value={item.image?.alt || ''} onChange={event => section(index, { image: { ...item.image, alt: event.target.value } })} /></label>
              <label className="hub-editor-field">Image Position<select value={item.imagePosition || 'left'} onChange={event => section(index, { imagePosition: event.target.value })}><option value="left">Left</option><option value="right">Right</option></select></label></>}
            {item._type !== 'fileSection' && <div className="hub-editor-fields">{[['alignment', 'Alignment', ['left', 'center', 'right']], ['width', 'Width', ['default', 'narrow', 'wide', 'full']], ['spacing', 'Spacing', ['tight', 'normal', 'spacious']], ['borderStyle', 'Border', ['none', 'subtle', 'strong']], ['borderThickness', 'Border Thickness', ['thin', 'medium', 'thick']]].map(([key, label, options]) =>
              <label className="hub-editor-field" key={key as string}>{label}<select aria-label={`Section ${index + 1} ${label}`} value={item[key as string] || (options as string[])[0]} onChange={event => section(index, { [key as string]: event.target.value })}>{(options as string[]).map(value => <option key={value}>{value}</option>)}</select></label>)}
              {[['backgroundColor', 'Background'], ['backgroundColorEnd', 'Gradient End'], ['titleColor', 'Title Color'], ['borderColor', 'Border Color']].map(([key, label]) => <label key={key} className="hub-color-field"><input type="checkbox" checked={!!item[key]} onChange={event => section(index, { [key]: event.target.checked ? { hex: '#ffffff' } : undefined })} />{label}<input type="color" aria-label={`Section ${index + 1} ${label}`} disabled={!item[key]} value={item[key]?.hex || '#ffffff'} onChange={event => section(index, { [key]: { ...item[key], hex: event.target.value } })} /></label>)}
              <label className="hub-editor-field">Title Size<input type="number" min={12} max={64} value={typeof item.titleSize === 'number' ? item.titleSize : 20} onChange={event => section(index, { titleSize: Number(event.target.value) })} /></label>
              <label className="hub-editor-field">Title Weight<select value={item.titleWeight || 600} onChange={event => section(index, { titleWeight: Number(event.target.value) })}>{[400,500,600,700,800,900].map(value => <option key={value}>{value}</option>)}</select></label>
              <label className="hub-editor-field">Gradient Direction<select value={item.gradientDirection || 'vertical'} onChange={event => section(index, { gradientDirection: event.target.value })}><option value="vertical">Top to Bottom</option><option value="horizontal">Left to Right</option><option value="to top">Bottom to Top</option><option value="to left">Right to Left</option></select></label>
            </div>}
            {item._type === 'topicSection' && <>{media(`Section ${index + 1} Background Image`, item.backgroundImage, backgroundImage => section(index, { backgroundImage }), true)}
              <label className="hub-color-field">Background Opacity<input type="range" min={0} max={1} step={.05} value={item.backgroundImageOpacity ?? .18} onChange={event => section(index, { backgroundImageOpacity: Number(event.target.value) })} /></label>
              <label className="hub-check"><input type="checkbox" checked={!!item.showDividerAbove} onChange={event => section(index, { showDividerAbove: event.target.checked })} />Divider Above</label>
              <label className="hub-check"><input type="checkbox" checked={!!item.showDividerBelow} onChange={event => section(index, { showDividerBelow: event.target.checked })} />Divider Below</label></>}
          </details>)}
            <div className="hub-toolbar">{[['textSection', 'Text'], ['imageWithText', 'Image & Text'], ['topicSection', 'Topic'], ['fileSection', 'File / Flyer']].map(([type, label]) => <button className="hub-button hub-secondary" type="button" key={type}
              onClick={() => update({ sections: [...document.sections, { _key: crypto.randomUUID(), _type: type, ...(type === 'fileSection' ? {} : { body: [], spacing: 'normal', alignment: 'left' }) }] })}>{type === 'fileSection' ? <Paperclip size={16} /> : <Plus size={16} />}{label}</button>)}</div>
          </section>
        </>}
        {['event', 'documentFile', 'documentFolder', 'yardWinner', 'holidayWinner'].includes(document.kind) && <label className="hub-editor-field">Description<textarea value={document.settings.description || ''} onChange={event => setting('description', event.target.value)} rows={4} /></label>}
      </div>
    </fieldset>}
    {mode === 'settings' && <fieldset id={editorPaneId} disabled={busy || uploading} className="hub-page-settings" aria-label="Page Settings"><h2>Page Settings</h2>
      <div className="hub-page-settings-grid"><div>
        <label className="hub-editor-field">Content Type<select aria-label="Content Type" value={document.kind} onChange={event => update({ kind: event.target.value as ContentRecord['kind'] })}>{contentKinds.filter(kind => ['post', 'event', 'page'].includes(kind)).map(kind => <option value={kind} key={kind}>{kindLabels[kind]}</option>)}</select></label>
        <fieldset className="hub-visibility"><legend>Visibility</legend><label><input type="radio" name="visibility" value="public" checked={document.visibility === 'public'} onChange={() => update({ visibility: 'public' })} /><Globe size={16} />Public</label>
          <label><input type="radio" name="visibility" value="members" checked={document.visibility === 'members'} onChange={() => update({ visibility: 'members' })} /><LockKeyhole size={16} />Members Only</label></fieldset>
        {['post','event','page'].includes(document.kind) && <><label className="hub-editor-field">Page Width<select aria-label="Page Width" value={document.settings.layoutVariant || 'standard'} onChange={event => setting('layoutVariant', event.target.value)}><option>standard</option><option>narrow</option><option>wide</option></select></label>
          <label className="hub-check"><input type="checkbox" checked={!!document.settings.showRightSidebar} onChange={event => setting('showRightSidebar', event.target.checked)} />Community Sidebar</label>
          <label className="hub-check"><input type="checkbox" checked={!!document.settings.showCalendar} onChange={event => setting('showCalendar', event.target.checked)} />Calendar</label>
          <label className="hub-check"><input type="checkbox" checked={!!document.settings.showNewsletterSignup} onChange={event => setting('showNewsletterSignup', event.target.checked)} />Email Newsletter Signup</label></>}
      </div><div>
        {document.kind === 'event' && <section className="hub-section"><h2>Event Details</h2><label className="hub-editor-field">Location<input value={document.settings.location || ''} onChange={event => setting('location', event.target.value)} /></label>
          <div className="hub-editor-fields">{dateInput('startDate', 'Start (Central Time)')}{dateInput('endDate', 'End (Central Time)')}</div>
          <label className="hub-check"><input type="checkbox" checked={!!document.settings.isMultiDayEvent} onChange={event => setting('isMultiDayEvent', event.target.checked)} />Second Day</label>
          {document.settings.isMultiDayEvent && <div className="hub-editor-fields">{dateInput('secondStartDate', 'Second Start (Central Time)')}{dateInput('secondEndDate', 'Second End (Central Time)')}</div>}
          {media('Flyer', document.settings.flyer, value => setting('flyer', value))}</section>}
        {document.kind === 'documentFile' && <>{media('Document File', document.settings.file, value => setting('file', value))}
          <label className="hub-editor-field">Folder<select aria-label="Folder" value={document.settings.folder?._ref || ''} onChange={event => setting('folder', event.target.value ? { _type: 'reference', _ref: event.target.value } : undefined)}><option value="">Unfiled</option>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.title}</option>)}</select></label>
          <label className="hub-editor-field">Category<input value={document.settings.category || ''} onChange={event => setting('category', event.target.value)} /></label></>}
        {document.kind === 'documentFolder' && <label className="hub-editor-field">Sort Order<input type="number" value={document.settings.sortOrder || 0} onChange={event => setting('sortOrder', Number(event.target.value))} /></label>}
        {document.kind === 'post' && <><label className="hub-editor-field">News Date<input type="date" value={(document.settings.newsDate || '').slice(0, 10)} onChange={event => setting('newsDate', event.target.value)} /></label>
          <label className="hub-editor-field">Topic<select value={document.settings.topic || 'general'} onChange={event => setting('topic', event.target.value)}>{['general','elections','pool','events','maintenance'].map(topic => <option key={topic}>{topic}</option>)}</select></label></>}
        {(document.kind === 'yardWinner' || document.kind === 'holidayWinner') && <section className="hub-section"><h2>Winner Details</h2>
          <label className="hub-editor-field">Street / Block<input value={document.settings.streetOrBlock || ''} onChange={event => setting('streetOrBlock', event.target.value)} /></label>
          {document.kind === 'yardWinner' ? <label className="hub-editor-field">Month<input type="date" value={document.settings.month || ''} onChange={event => setting('month', event.target.value)} /></label> : <div className="hub-editor-fields">
            <label className="hub-editor-field">Holiday<select value={document.settings.holiday || 'christmas'} onChange={event => setting('holiday', event.target.value)}><option value="christmas">Christmas</option><option value="halloween">Halloween</option></select></label>
            <label className="hub-editor-field">Year<input type="number" value={document.settings.year || ''} onChange={event => setting('year', Number(event.target.value))} /></label>
            <label className="hub-editor-field">Place<select value={document.settings.place || '1'} onChange={event => setting('place', event.target.value)}>{['1','2','3','4','shoutout','hm'].map(value => <option key={value}>{value}</option>)}</select></label>
            <label className="hub-editor-field">Judging Section<select value={document.settings.section || ''} onChange={event => setting('section', event.target.value)}><option value="">None</option>{['1','2','3','4'].map(value => <option key={value}>{value}</option>)}</select></label>
          </div>}
          {(document.settings.photos || []).map((photo: any, index: number) => <div key={photo._key || index} className="hub-photo-edit">{media(`Photo ${index + 1}`, photo, value => setting('photos', document.settings.photos.map((item: any, position: number) => index === position ? value : item)), true)}
            <button type="button" className="hub-icon hub-danger" title="Remove Photo" aria-label={`Remove photo ${index + 1}`} onClick={() => setting('photos', document.settings.photos.filter((_: any, position: number) => index !== position))}><Trash2 size={17} /></button></div>)}
          <button type="button" className="hub-button hub-secondary" onClick={() => setting('photos', [...document.settings.photos || [], { _key: crypto.randomUUID(), _type: 'image' }])}><Plus size={16} />Add Photo</button>
          {document.settings.photo && media('Main Photo', document.settings.photo, value => setting('photo', value), true)}
        </section>}
        <section className="hub-section"><h2>Media</h2><label className="hub-button hub-secondary hub-upload"><Upload size={17} />{uploading ? 'Uploading...' : 'Upload Image or PDF'}<input type="file" aria-label="Upload Image or PDF" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" disabled={uploading} onChange={event => { upload(event.target.files?.[0]); event.target.value = ''; }} /></label></section>
      </div></div>
    </fieldset>}
    {sidePreview && <div className="hub-editor-divider" role="separator" tabIndex={0} aria-label="Resize editor and preview" aria-orientation="vertical"
      aria-controls={`${editorPaneId} ${previewPaneId}`} aria-valuemin={30} aria-valuemax={70} aria-valuenow={Math.round(splitPercent)}
      aria-valuetext={`${Math.round(splitPercent)}% editor, ${Math.round(100 - splitPercent)}% preview`}
      title="Drag to resize panels. Double-click to reset."
      onPointerDown={event => {
        if (event.button !== 0 || resizePointer.current !== null) return;
        event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
        resizePointer.current = event.pointerId; setResizing(true);
      }}
      onPointerMove={event => {
        if (resizePointer.current !== event.pointerId || !workspace.current) return;
        const bounds = workspace.current.getBoundingClientRect();
        const dividerWidth = event.currentTarget.offsetWidth;
        setSplitPercent(Math.max(30, Math.min(70, (event.clientX - bounds.left - dividerWidth / 2) / (bounds.width - dividerWidth) * 100)));
      }}
      onPointerUp={event => {
        if (resizePointer.current !== event.pointerId) return;
        resizePointer.current = null; setResizing(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { resizePointer.current = null; setResizing(false); }}
      onLostPointerCapture={() => { resizePointer.current = null; setResizing(false); }}
      onDoubleClick={() => setSplitPercent(52)}
      onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'].includes(event.key)) return;
        event.preventDefault();
        const step = event.shiftKey ? 10 : 2;
        setSplitPercent(previous => event.key === 'Home' ? 30 : event.key === 'End' ? 70 : event.key === 'Enter' ? 52
          : Math.max(30, Math.min(70, previous + (event.key === 'ArrowRight' ? step : -step))));
      }}><GripVertical size={16} aria-hidden="true" /></div>}
    {(mode === 'preview' || sidePreview) && <section id={previewPaneId} className={sidePreview ? 'hub-editor-live-preview' : 'hub-editor-full-preview'} aria-label="Content preview">
      {sidePreview && <h2 className="hub-editor-preview-heading">Preview</h2>}
      <PublishedPreview content={document} assets={assets} device={previewDevice} onDeviceChange={setPreviewDevice} />
    </section>}
    </div>
  </>;
}
