'use client';

import type { NewsletterSettings } from '@/lib/newsletter/template';
import type { MediaAsset } from '@/lib/member-hub/content';

export default function NewsletterCustomization({ value, onChange, disabled, assets, onUploadBackground }: {
  value: NewsletterSettings; onChange: (value: NewsletterSettings) => void; disabled: boolean;
  assets: MediaAsset[]; onUploadBackground: (file: File | undefined) => void;
}) {
  function set<K extends keyof NewsletterSettings>(key: K, next: NewsletterSettings[K]) { onChange({ ...value, [key]: next }); }
  const text = (key: 'subject' | 'heading' | 'preheader' | 'greeting' | 'introduction' | 'footer' | 'newsHeading' | 'eventsHeading' | 'websiteLinkText' | 'unsubscribeLinkText', label: string, max: number, multiline = false) =>
    <label className="hub-editor-field">{label}{multiline
      ? <textarea rows={key === 'introduction' ? 5 : 3} maxLength={max} value={value[key]} onChange={event => set(key, event.target.value)} />
      : <input maxLength={max} value={value[key]} onChange={event => set(key, event.target.value)} />}</label>;
  const number = (key: 'maxNews' | 'maxEvents' | 'fontSize' | 'contentWidth' | 'cornerRadius', label: string, min: number, max: number) =>
    <label className="hub-editor-field">{label}<input type="number" min={min} max={max} value={value[key]}
      onChange={event => set(key, Number(event.target.value))}
      onBlur={event => set(key, Math.max(min, Math.min(max, Math.round(Number(event.target.value) || min))))} /></label>;
  return <fieldset disabled={disabled} className="hub-newsletter-controls" aria-label="Newsletter customization">
    <h2>Customization</h2>
    <details className="hub-section-controls" open><summary>Message</summary>
      {text('subject', 'Email Subject', 150)}{text('heading', 'Newsletter Heading', 200)}
      {text('preheader', 'Inbox Preview Text', 200)}{text('greeting', 'Greeting', 300)}
      {text('introduction', 'Introduction', 6000, true)}{text('footer', 'Footer Text', 3000, true)}
    </details>
    <details className="hub-section-controls" open><summary>Content</summary>
      {(['showNews', 'showEvents'] as const).map((key, index) => <label className="hub-check" key={key}>
        <input type="checkbox" checked={value[key]} onChange={event => set(key, event.target.checked)} />{['Include News', 'Include Events'][index]}</label>)}
      {text('newsHeading', 'News Heading', 100)}{number('maxNews', 'News Items', 1, 10)}
      <label className="hub-check"><input type="checkbox" checked={value.showNewsDates} onChange={event => set('showNewsDates', event.target.checked)} />Show News Dates</label>
      {text('eventsHeading', 'Events Heading', 100)}{number('maxEvents', 'Event Items', 1, 10)}
      <label className="hub-check"><input type="checkbox" checked={value.showEventDates} onChange={event => set('showEventDates', event.target.checked)} />Show Event Dates</label>
      <label className="hub-editor-field">Section Order<select value={value.sectionOrder} onChange={event => set('sectionOrder', event.target.value as NewsletterSettings['sectionOrder'])}>
        <option value="news-first">News, then Events</option><option value="events-first">Events, then News</option></select></label>
    </details>
    <details className="hub-section-controls" open><summary>Footer Links</summary>
      {text('websiteLinkText', 'Website Link Text', 100)}{text('unsubscribeLinkText', 'Unsubscribe Link Text', 100)}
      {([['websiteLinkColor', 'Website Link Color'], ['unsubscribeLinkColor', 'Unsubscribe Link Color']] as const).map(([key, label]) =>
        <div key={key} className="hub-color-field hub-newsletter-color">
          <label className="hub-check"><input type="checkbox" checked={value[key] !== null} onChange={event => set(key, event.target.checked ? value.accentColor : null)} />{label}</label>
          <input aria-label={label} type="color" disabled={value[key] === null} value={value[key] ?? value.accentColor} onChange={event => set(key, event.target.value)} />
        </div>)}
      <label className="hub-editor-field">Footer Link Size<select value={value.footerLinkSize ?? ''} onChange={event => set('footerLinkSize', event.target.value ? Number(event.target.value) : null)}>
        <option value="">Match Body</option>{Array.from({ length: 13 }, (_, index) => index + 12).map(size => <option key={size} value={size}>{size}px</option>)}</select></label>
      <label className="hub-editor-field">Footer Link Alignment<select value={value.footerLinkAlign} onChange={event => set('footerLinkAlign', event.target.value as NewsletterSettings['footerLinkAlign'])}>
        <option value="inherit">Match Body</option><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
      <label className="hub-check"><input type="checkbox" checked={value.footerLinkUnderline} onChange={event => set('footerLinkUnderline', event.target.checked)} />Underline Footer Links</label>
    </details>
    <details className="hub-section-controls" open><summary>Appearance</summary>
      <label className="hub-editor-field">Layout<select value={value.layout} onChange={event => set('layout', event.target.value as NewsletterSettings['layout'])}><option value="list">List</option><option value="blocks">Separate Blocks</option></select></label>
      <label className="hub-editor-field">Text Alignment<select value={value.textAlign} onChange={event => set('textAlign', event.target.value as NewsletterSettings['textAlign'])}>{['left', 'center', 'right'].map(alignment => <option key={alignment}>{alignment}</option>)}</select></label>
      <label className="hub-editor-field">Font<select value={value.fontFamily} onChange={event => set('fontFamily', event.target.value as NewsletterSettings['fontFamily'])}>{['Arial', 'Georgia', 'Verdana'].map(font => <option key={font}>{font}</option>)}</select></label>
      {number('fontSize', 'Text Size', 12, 22)}{number('contentWidth', 'Email Width', 480, 720)}
      {number('cornerRadius', 'Container Corner Radius (px)', 0, 48)}
      <label className="hub-editor-field">Background Image<select value={value.backgroundImage?._ref ?? ''} onChange={event => set('backgroundImage', event.target.value ? { _ref: event.target.value } : null)}>
        <option value="">None</option>{assets.filter(asset => asset.library !== 'documents' && ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(asset.mime_type)).map(asset => <option key={asset.id} value={asset.id}>{asset.original_filename}</option>)}</select></label>
      <label className="hub-editor-field">Upload Background Image<input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; onUploadBackground(file); }} /></label>
      {value.backgroundImage && <>
        <label className="hub-editor-field">Background Placement<select value={value.backgroundImageTarget} onChange={event => set('backgroundImageTarget', event.target.value as NewsletterSettings['backgroundImageTarget'])}>
          <option value="email">Email Background</option><option value="content">Content Container</option></select></label>
        <label className="hub-editor-field">Background Fit<select value={value.backgroundImageFit} onChange={event => set('backgroundImageFit', event.target.value as NewsletterSettings['backgroundImageFit'])}>
          <option value="cover">Cover</option><option value="contain">Contain</option><option value="tile">Tile</option></select></label>
      </>}
      {([['backgroundColor', 'Email Background'], ['contentColor', 'Content Background'], ['textColor', 'Text Color'], ['headingColor', 'Heading Color'], ['accentColor', 'Link / Accent Color']] as const).map(([key, label]) =>
        <label className="hub-color-field hub-newsletter-color" key={key}>{label}<input aria-label={label} type="color" value={value[key]} onChange={event => set(key, event.target.value)} /></label>)}
    </details>
  </fieldset>;
}
