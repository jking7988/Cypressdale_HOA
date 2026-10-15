'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trophy, Settings, Plus, Upload, Save, Trash2, Pencil, ExternalLink, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { newContent, assetUrl, type ContentRecord, type MediaAsset } from '@/lib/member-hub/content';
import { programs, programSettings, formatWinnerMonth, type Program, type YardSettings, type HolidaySettings } from '@/lib/member-hub/programs';
import { projectContent } from '@/lib/member-hub/content-projection';
import { saveProgram, saveWinner, removeWinner } from '@/lib/member-hub/program-actions';
import { uploadMedia } from '@/lib/member-hub/content-actions';
import YardProgramPage from '@/components/content/YardProgramPage';
import HolidayProgramPage from '@/components/content/HolidayProgramPage';
import PagePreviewFrame from './PagePreviewFrame';
import SuccessMessage from './SuccessMessage';
import HolidaySwitcher from '@/components/content/HolidaySwitcher';
import { holidayPages, winnerHoliday, type Holiday } from '@/lib/member-hub/holidays';

export default function ProgramWorkspace({ program, page, initial, originalAssets, selected, holiday = 'christmas' }: {
  program: Program; page: ContentRecord; initial: ContentRecord[]; originalAssets: MediaAsset[]; selected?: string; holiday?: Holiday;
}) {
  const router = useRouter(); const info = program === 'holiday' ? { ...programs.holiday, ...holidayPages[holiday] } : programs[program];
  const [records, setRecords] = useState(initial);
  const [assets, setAssets] = useState(originalAssets);
  const [config, setConfig] = useState<Record<string, any>>(() => programSettings(program, page.settings.programSettings));
  const [savedConfig, setSavedConfig] = useState<Record<string, any>>(() => programSettings(program, page.settings.programSettings));
  const [pageVersion, setPageVersion] = useState(page.version);
  const [view, setView] = useState<'winners' | 'settings'>('winners');
  const [editing, setEditing] = useState<ContentRecord | null>(() => initial.find(row => row.id === selected) || null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const [removing, setRemoving] = useState<ContentRecord | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => setRecords(initial), [initial]);
  useEffect(() => setAssets(originalAssets), [originalAssets]);
  useEffect(() => { if (removing) dialog.current?.showModal(); else dialog.current?.close(); }, [removing]);
  const configDirty = JSON.stringify(config) !== JSON.stringify(savedConfig);
  const winnerDirty = !!editing && (editing.version ? JSON.stringify(editing) !== JSON.stringify(records.find(row => row.id === editing.id)) : !!(editing.title || editing.settings.photos?.length));
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) { if (configDirty || winnerDirty) event.preventDefault(); }
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [configDirty, winnerDirty]);
  function setting(key: string, value: unknown) { setConfig(previous => ({ ...previous, [key]: value })); }
  function winnerSetting(key: string, value: unknown) { setEditing(previous => previous ? { ...previous, settings: { ...previous.settings, [key]: value } } : null); }
  function edit(row: ContentRecord) { if (winnerDirty && !window.confirm('Discard unsaved winner changes?')) return; setEditing({ ...row, settings: { ...row.settings } }); setView('winners'); setMessage({}); }
  function showWinners() {
    if (winnerDirty && !window.confirm('Discard unsaved winner changes?')) return;
    setEditing(null); setView('winners'); setQuery(''); setMessage({});
  }
  function create() {
    const row = newContent(info.kind);
    row.settings = program === 'yard' ? { month: '', photos: [] } : { holiday, year: Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric' }).format(new Date())), place: '1', photos: [] };
    edit(row);
  }
  function switchHoliday(next: Holiday) {
    if (busy || next === holiday) return;
    if ((configDirty || winnerDirty) && !window.confirm('Discard unsaved changes before switching holidays?')) return;
    router.push(holidayPages[next].adminPath);
  }
  async function savePage(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage({});
    try {
      const result = await saveProgram(program, config, pageVersion, holiday);
      if (result.error) setMessage({ error: result.error });
      else if ('content' in result && result.content) { const saved = programSettings(program, result.content.settings.programSettings); setPageVersion(result.content.version); setConfig(saved); setSavedConfig(saved); setMessage({ success: 'Page settings saved.' }); router.refresh(); }
    } catch { setMessage({ error: 'Unable to save page settings.' }); }
    finally { setBusy(false); }
  }
  async function saveEntry(event: React.FormEvent) {
    event.preventDefault(); if (!editing) return;
    setBusy(true); setMessage({});
    try {
      const result = await saveWinner(program, editing, editing.version || null, holiday);
      if (result.error) setMessage({ error: result.error });
      else if ('content' in result && result.content) {
        const saved = result.content as ContentRecord;
        setRecords(previous => [...previous.filter(row => row.id !== saved.id), saved]); setEditing(null);
        setMessage({ success: 'Winner saved.' }); router.refresh();
      }
    } catch { setMessage({ error: 'Unable to save winner.' }); }
    finally { setBusy(false); }
  }
  async function upload(files: File[], target: 'winner' | 'background' | number) {
    if (!files.length) return;
    setBusy(true); setMessage({});
    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) { setMessage({ error: 'Choose a JPEG, PNG, WebP, or GIF photo.' }); return; }
        const form = new FormData(); form.set('file', file); const result = await uploadMedia(form);
        if (result.error) { setMessage({ error: result.error }); return; }
        if (result.asset) {
          if (!result.asset.mime_type.startsWith('image/')) { setMessage({ error: 'Choose a JPEG, PNG, WebP, or GIF photo.' }); return; }
          const asset = result.asset; setAssets(previous => [asset, ...previous]);
          const image = { _type: 'image', asset: { _type: 'reference', _ref: asset.id } };
          if (target === 'winner') setEditing(previous => previous ? { ...previous, settings: { ...previous.settings, photos: [...previous.settings.photos || [], { ...image, _key: crypto.randomUUID() }] } } : null);
          else if (target === 'background') setting('backgroundImage', image);
          else setConfig(previous => ({ ...previous, mapImages: previous.mapImages.map((item: unknown, index: number) => index === target ? image : item) }));
        }
      }
      setMessage({ success: 'Photos uploaded.' });
    } catch { setMessage({ error: 'Unable to upload photos.' }); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!removing) return;
    setBusy(true); setMessage({});
    try {
      const result = await removeWinner(removing.id, removing.version);
      if (result.error) setMessage({ error: result.error });
      else { setRecords(previous => previous.filter(row => row.id !== removing.id)); if (editing?.id === removing.id) setEditing(null); setMessage({ success: 'Winner removed.' }); router.refresh(); }
    } catch { setMessage({ error: 'Unable to remove winner.' }); }
    finally { setBusy(false); setRemoving(null); }
  }
  function field(label: string, key: string, multiline = false) {
    return <label className="hub-editor-field">{label}{multiline ? <textarea aria-label={label} rows={4} value={config[key]} onChange={event => setting(key, event.target.value)} /> : <input aria-label={label} value={config[key]} onChange={event => setting(key, event.target.value)} />}</label>;
  }
  function toggle(label: string, key: string) { return <label className="hub-check"><input type="checkbox" checked={config[key]} onChange={event => setting(key, event.target.checked)} />{label}</label>; }
  function imagePicker(label: string, value: any, change: (value: any) => void) {
    return <label className="hub-editor-field">{label}<select aria-label={label} value={value?.asset?._ref || ''} onChange={event => change(event.target.value ? { _type: 'image', asset: { _type: 'reference', _ref: event.target.value } } : null)}>
      <option value="">Default / None</option>{assets.filter(asset => asset.library !== 'documents' || asset.id === value?.asset?._ref).map(asset => <option key={asset.id} value={asset.id} disabled={asset.library === 'documents'}>{asset.original_filename}</option>)}
    </select></label>;
  }
  function movePhoto(index: number, direction: number) {
    if (!editing) return;
    const photos = [...editing.settings.photos]; const [photo] = photos.splice(index, 1); photos.splice(index + direction, 0, photo); winnerSetting('photos', photos);
  }
  function uploader(label: string, target: 'winner' | 'background' | number, multiple = false) {
    return <label className="hub-button hub-secondary hub-upload"><Upload size={17} />{label}<input type="file" aria-label={label} disabled={busy} multiple={multiple} accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => { upload(Array.from(event.target.files || []), target); event.target.value = ''; }} /></label>;
  }
  const visible = records.filter(row => (program !== 'holiday' || winnerHoliday(row.settings.holiday) === holiday) && row.title.toLowerCase().includes(query.toLowerCase())).sort((a, b) => program === 'yard' ? String(b.settings.month || '').localeCompare(a.settings.month || '') : Number(b.settings.year || 0) - Number(a.settings.year || 0) || String(a.settings.place).localeCompare(String(b.settings.place)));
  const projected = [...records.filter(row => row.status === 'published' && row.visibility === 'public' && row.id !== editing?.id), ...(editing ? [editing] : [])]
    .sort((a, b) => program === 'yard' ? String(b.settings.month || '').localeCompare(String(a.settings.month || '')) : Number(b.settings.year || 0) - Number(a.settings.year || 0))
    .map(row => projectContent({ ...row, title: row.title || 'New Winner' }, new Map(assets.map(asset => [asset.id, asset])), new Map()));
  return <>
    <div className="hub-page-heading"><div><p className="hub-eyebrow">Administration</p><h1>{info.title}</h1></div><div className="hub-row-actions">
      <Link className="hub-icon" href={info.publicPath} target="_blank" aria-label="Open Public Page" title="Open Public Page"><ExternalLink size={17} /></Link>
      <button type="button" className="hub-button" disabled={busy} onClick={create}><Plus size={17} />New Winner</button></div></div>
    {program === 'holiday' && <HolidaySwitcher holiday={holiday} admin onChange={switchHoliday} disabled={busy} />}
    <div className="hub-tabs hub-program-tabs" role="group" aria-label="Program view"><button type="button" aria-pressed={view === 'winners'} disabled={busy} onClick={showWinners}><Trophy size={16} />Winners</button><button type="button" aria-pressed={view === 'settings'} onClick={() => setView('settings')}><Settings size={16} />Page Settings</button></div>
    {message.error && <p className="hub-message hub-error" role="alert">{message.error}</p>}<SuccessMessage notice={message} />
    <div className="hub-program-workspace">
      <section className="hub-program-controls" aria-label={view === 'settings' ? 'Program page settings' : 'Winner management'}>
        {view === 'settings' ? <form onSubmit={savePage}><fieldset disabled={busy}><h2>Page Settings</h2>
          {field('Page Title', 'pageTitle')}{field('Introduction', 'introduction', true)}
          {program === 'holiday' && field('Schedule', 'scheduleCopy', true)}
          <label className="hub-editor-field">Page Width<select aria-label="Page Width" value={config.pageWidth} onChange={event => setting('pageWidth', event.target.value)}><option value="standard">Standard</option><option value="narrow">Narrow</option><option value="wide">Wide</option></select></label>
          {imagePicker('Background Image', config.backgroundImage, value => setting('backgroundImage', value))}{uploader('Upload Background', 'background')}
          {program === 'yard' ? <>
            <details className="hub-section-controls"><summary>Program Overview</summary>{toggle('Show Overview', 'showOverview')}{field('Overview Heading', 'overviewTitle')}{field('Overview', 'overviewIntro', true)}{field('Selection Overview', 'overviewSelection', true)}
              {config.eligibility.map((rule: string, index: number) => <div className="hub-program-repeat" key={index}><label className="hub-editor-field">Eligibility {index + 1}<input aria-label={`Eligibility ${index + 1}`} value={rule} onChange={event => setting('eligibility', config.eligibility.map((item: string, position: number) => position === index ? event.target.value : item))} /></label><button type="button" className="hub-icon hub-danger" title="Remove Rule" aria-label={`Remove eligibility ${index + 1}`} onClick={() => setting('eligibility', config.eligibility.filter((_: string, position: number) => position !== index))}><Trash2 size={16} /></button></div>)}
              <button type="button" className="hub-button hub-secondary" onClick={() => setting('eligibility', [...config.eligibility, ''])}><Plus size={16} />Add Rule</button>
            </details>
            <details className="hub-section-controls"><summary>Selection Criteria</summary>{toggle('Show Criteria', 'showCriteria')}{field('Criteria Heading', 'criteriaTitle')}{field('Criteria Introduction', 'criteriaIntro', true)}
              {config.criteria.map((item: { title: string; description: string }, index: number) => <div key={index} className="hub-program-criterion"><label className="hub-editor-field">Criterion {index + 1}<input aria-label={`Criterion ${index + 1}`} value={item.title} onChange={event => setting('criteria', config.criteria.map((row: unknown, position: number) => position === index ? { ...item, title: event.target.value } : row))} /></label><label className="hub-editor-field">Details<input aria-label={`Criterion ${index + 1} Details`} value={item.description} onChange={event => setting('criteria', config.criteria.map((row: unknown, position: number) => position === index ? { ...item, description: event.target.value } : row))} /></label><button type="button" className="hub-icon hub-danger" title="Remove Criterion" aria-label={`Remove criterion ${index + 1}`} onClick={() => setting('criteria', config.criteria.filter((_: unknown, position: number) => position !== index))}><Trash2 size={16} /></button></div>)}
              <button type="button" className="hub-button hub-secondary" onClick={() => setting('criteria', [...config.criteria, { title: '', description: '' }])}><Plus size={16} />Add Criterion</button>{field('Criteria Note', 'criteriaNote', true)}
            </details>
            <details className="hub-section-controls"><summary>Winner Sections</summary>{field('Current Winner Heading', 'currentTitle')}{toggle('Show Past Winners', 'showPast')}{field('Past Winners Heading', 'pastTitle')}{field('Empty Winner Badge', 'emptyBadge')}{field('Empty Winner Heading', 'emptyTitle')}{field('Empty Winner Message', 'emptyCopy', true)}</details>
          </> : <>
            <details className="hub-section-controls"><summary>Winners and Prizes</summary>{config.prizes.map((prize: number, index: number) => <label key={index} className="hub-editor-field">Place {index + 1} Prize<input aria-label={`Place ${index + 1} Prize`} type="number" min={0} max={100000} value={prize} onChange={event => setting('prizes', config.prizes.map((value: number, position: number) => position === index ? Number(event.target.value) : value))} /></label>)}{field('Empty Winner Heading', 'emptyTitle')}{field('Empty Winner Message', 'emptyCopy', true)}{toggle('Show Shout-outs', 'showShoutouts')}{field('Shout-outs Heading', 'shoutoutsTitle')}</details>
            <details className="hub-section-controls"><summary>Judging Maps</summary>{toggle('Show Judging Maps', 'showMaps')}{field('Maps Heading', 'mapsTitle')}{field('Maps Description', 'mapsCopy', true)}
              {config.mapLabels.map((label: string, index: number) => <div key={index} className="hub-section"><label className="hub-editor-field">Map {index + 1} Label<input aria-label={`Map ${index + 1} Label`} value={label} onChange={event => setting('mapLabels', config.mapLabels.map((value: string, position: number) => position === index ? event.target.value : value))} /></label>{imagePicker(`Map ${index + 1} Image`, config.mapImages[index], value => setting('mapImages', config.mapImages.map((item: unknown, position: number) => position === index ? value : item)))}{uploader(`Upload Map ${index + 1}`, index)}</div>)}
            </details>
          </>}
          <details className="hub-section-controls"><summary>Contact Section</summary>{toggle('Show Contact', 'showContact')}{field('Contact Heading', 'contactTitle')}{field('Contact Message', 'contactCopy', true)}</details>
        </fieldset><button className="hub-button" type="submit" disabled={busy}><Save size={17} />Save Page Settings</button></form> : editing ? <form onSubmit={saveEntry}><fieldset disabled={busy}><h2>{editing.version ? 'Edit Winner' : 'New Winner'}</h2>
          <label className="hub-editor-field">Winner Title<input aria-label="Winner Title" required maxLength={300} value={editing.title} onChange={event => setEditing({ ...editing, title: event.target.value })} /></label>
          {program === 'yard' ? <label className="hub-editor-field">Month<input aria-label="Month" required type="month" value={(editing.settings.month || '').slice(0, 7)} onChange={event => winnerSetting('month', event.target.value ? `${event.target.value}-01` : '')} /></label> : <div className="hub-editor-fields">
            <label className="hub-editor-field">Holiday<input aria-label="Holiday" readOnly value={holidayPages[holiday].label} /></label>
            <label className="hub-editor-field">Year<input aria-label="Year" required type="number" min={1900} max={9999} value={editing.settings.year || ''} onChange={event => winnerSetting('year', Number(event.target.value))} /></label>
            <label className="hub-editor-field">Placement<select aria-label="Placement" value={String(editing.settings.place || '1')} onChange={event => winnerSetting('place', event.target.value)}>{[['1','1st Place'],['2','2nd Place'],['3','3rd Place'],['4','4th Place'],['shoutout','Shout-out'],['hm','Honorable Mention']].map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="hub-editor-field">Judging Section<select aria-label="Judging Section" value={editing.settings.section || ''} onChange={event => winnerSetting('section', event.target.value)}><option value="">None</option>{['1','2','3','4'].map(value => <option value={value} key={value}>Section {value}</option>)}</select></label>
          </div>}
          <label className="hub-editor-field">Street / Block<input aria-label="Street / Block" value={editing.settings.streetOrBlock || ''} onChange={event => winnerSetting('streetOrBlock', event.target.value)} /></label>
          <label className="hub-editor-field">Description<textarea aria-label="Description" rows={4} value={editing.settings.description || ''} onChange={event => winnerSetting('description', event.target.value)} /></label>
          <h3>Photos</h3>{editing.settings.photo && <>{imagePicker('Main Photo', editing.settings.photo, value => winnerSetting('photo', value))}<img className="hub-media-thumbnail" src={assetUrl(editing.settings.photo)} alt="Main photo" /></>}
          <div className="hub-program-photo-list">{(editing.settings.photos || []).map((photo: any, index: number) => <div key={photo._key || index}><img src={assetUrl(photo)} alt={`Photo ${index + 1}`} /><div className="hub-row-actions"><button type="button" className="hub-icon" aria-label={`Move photo ${index + 1} up`} title="Move Photo Up" disabled={index === 0} onClick={() => movePhoto(index, -1)}><ArrowUp size={16} /></button><button type="button" className="hub-icon" aria-label={`Move photo ${index + 1} down`} title="Move Photo Down" disabled={index === editing.settings.photos.length - 1} onClick={() => movePhoto(index, 1)}><ArrowDown size={16} /></button><button type="button" className="hub-icon hub-danger" aria-label={`Remove photo ${index + 1}`} title="Remove Photo" onClick={() => winnerSetting('photos', editing.settings.photos.filter((_: unknown, position: number) => position !== index))}><Trash2 size={16} /></button></div></div>)}</div>
          {imagePicker('Add Existing Photo', null, value => { if (value) winnerSetting('photos', [...editing.settings.photos || [], { ...value, _key: crypto.randomUUID() }]); })}{uploader('Upload Winner Photos', 'winner', true)}
          <label className="hub-editor-field">Access<select aria-label="Access" value={editing.visibility} onChange={event => setEditing({ ...editing, visibility: event.target.value as ContentRecord['visibility'] })}><option value="public">Public</option><option value="members">Members Only</option></select></label>
          <label className="hub-check"><input type="checkbox" checked={editing.status === 'published'} onChange={event => setEditing({ ...editing, status: event.target.checked ? 'published' : 'draft' })} />Published</label>
        </fieldset><div className="hub-row-actions"><button className="hub-button" type="submit" disabled={busy}><Save size={17} />Save Winner</button><button className="hub-button hub-secondary" type="button" disabled={busy} onClick={() => setEditing(null)}>Cancel</button></div></form> : <>
          <label className="hub-search"><Search size={17} /><input aria-label="Search winners" placeholder="Search winners" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <ul className="hub-program-winners">{visible.map(row => <li key={row.id}><div><button type="button" onClick={() => edit(row)}><strong>{row.title}</strong></button><p>{program === 'yard' ? formatWinnerMonth(row.settings.month) : [row.settings.holiday, row.settings.year, row.settings.place === 'shoutout' || row.settings.place === 'hm' ? 'Shout-out' : `Place ${row.settings.place || ''}`, row.settings.section ? `Section ${row.settings.section}` : ''].filter(Boolean).join(' | ')} | {row.status === 'published' ? 'Published' : 'Draft'}{row.visibility === 'members' ? ' | Members Only' : ''}</p></div><div className="hub-row-actions"><button className="hub-icon" type="button" title="Edit Winner" aria-label={`Edit ${row.title}`} disabled={busy} onClick={() => edit(row)}><Pencil size={17} /></button><button className="hub-icon hub-danger" type="button" title="Remove Winner" aria-label={`Remove ${row.title}`} disabled={busy} onClick={() => setRemoving(row)}><Trash2 size={17} /></button></div></li>)}</ul>{!visible.length && <p className="hub-empty">No winners match this view.</p>}
        </>}
      </section>
      <section className="hub-program-preview" aria-label="Program preview"><h2>Preview</h2><PagePreviewFrame>{program === 'yard' ? <YardProgramPage winners={projected} config={config as YardSettings} /> : <HolidayProgramPage holiday={holiday} winners={projected} config={config as HolidaySettings} />}</PagePreviewFrame></section>
    </div>
    <dialog ref={dialog} className="hub-dialog" aria-label="Remove winner" onCancel={() => setRemoving(null)}><h2>Remove winner?</h2><p>{removing?.title}</p><div className="hub-row-actions"><button className="hub-button hub-secondary" disabled={busy} onClick={() => setRemoving(null)}>Cancel</button><button className="hub-button hub-danger" disabled={busy} onClick={remove}>Remove</button></div></dialog>
  </>;
}
