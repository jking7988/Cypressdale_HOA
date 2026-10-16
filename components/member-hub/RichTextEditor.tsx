'use client';

import { useEffect, useId, useRef, useState } from 'react';
import equal from 'fast-deep-equal';
import { EditorProvider, PortableTextEditable, PortableTextEditor, usePortableTextEditor, defineSchema, useEditor, useEditorSelector, type PortableTextBlock } from '@portabletext/editor';
import { isActiveDecorator, getActiveStyle, getActiveListItem, getActiveAnnotations, getSelection, getSelectedTextBlocks, isSelectionExpanded } from '@portabletext/editor/selectors';
import { EventListenerPlugin } from '@portabletext/editor/plugins';
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, List, ListOrdered, Link2, Unlink, Undo2, Redo2 } from 'lucide-react';
import { blockTextAlignment } from '@/lib/member-hub/text-alignment';
import { normalizeRichTextLink } from '@/lib/member-hub/rich-text-link';

const schema = defineSchema({
  block: { fields: [{ name: 'textAlign', type: 'string' }] },
  styles: [{ name: 'normal' }, { name: 'h1' }, { name: 'h2' }, { name: 'h3' }, { name: 'blockquote' }],
  decorators: [{ name: 'strong' }, { name: 'em' }, { name: 'underline' }, { name: 'strike-through' }, { name: 'code' }],
  lists: [{ name: 'bullet' }, { name: 'number' }],
  annotations: [
    { name: 'link', fields: [{ name: 'href', type: 'string' }, { name: 'openInNewTab', type: 'boolean' }] },
    { name: 'textStyle', fields: [{ name: 'color', type: 'object' }, { name: 'size', type: 'number' }, { name: 'weight', type: 'number' }] },
    { name: 'textColor', fields: [{ name: 'color', type: 'object' }] }, { name: 'textSize', fields: [{ name: 'size', type: 'number' }] },
    { name: 'textWeight', fields: [{ name: 'weight', type: 'number' }] },
  ],
});

function Toolbar({ title = false }: { title?: boolean }) {
  const editor = useEditor();
  const bold = useEditorSelector(editor, isActiveDecorator('strong'));
  const italic = useEditorSelector(editor, isActiveDecorator('em'));
  const underline = useEditorSelector(editor, isActiveDecorator('underline'));
  const activeStyle = useEditorSelector(editor, getActiveStyle);
  const activeList = useEditorSelector(editor, getActiveListItem);
  const selectedBlocks = useEditorSelector(editor, getSelectedTextBlocks);
  const selectionExpanded = useEditorSelector(editor, isSelectionExpanded);
  const activeAnnotations = useEditorSelector(editor, getActiveAnnotations);
  const [link, setLink] = useState(false);
  const [href, setHref] = useState('');
  const [linkError, setLinkError] = useState('');
  const linkErrorId = useId();
  const linkSelection = useRef<ReturnType<typeof getSelection>>(null);
  function send(event: Parameters<typeof editor.send>[0]) { editor.send(event); }
  function closeLink() {
    setLink(false); setLinkError('');
    send({ type: 'select', at: linkSelection.current });
    send({ type: 'focus' });
  }
  function openLink() {
    if (link) { closeLink(); return; }
    const snapshot = editor.getSnapshot();
    linkSelection.current = getSelection(snapshot);
    const activeLink = getActiveAnnotations(snapshot).find(annotation => annotation._type === 'link');
    setHref(typeof activeLink?.href === 'string' ? activeLink.href : '');
    setLinkError(''); setLink(true);
  }
  function applyLink() {
    const url = normalizeRichTextLink(href);
    if (!url) { setLinkError('Enter a valid website address, email link, phone link, or page path.'); return; }
    // The URL input takes focus, so restore the text selection before editing it.
    send({ type: 'select', at: linkSelection.current });
    const snapshot = editor.getSnapshot();
    const activeLink = getActiveAnnotations(snapshot).find(annotation => annotation._type === 'link');
    const value = { href: url, openInNewTab: true };
    if (isSelectionExpanded(snapshot)) {
      send({ type: 'annotation.add', annotation: { name: 'link', value } });
    } else if (activeLink) {
      getSelectedTextBlocks(snapshot).forEach(block => send({ type: 'annotation.set', at: [block.path[0], 'markDefs', { _key: activeLink._key }], props: value }));
    } else {
      send({ type: 'insert.span', text: href.trim(), annotations: [{ name: 'link', value }] });
    }
    setLink(false); setLinkError(''); send({ type: 'focus' });
  }
  return <div className="hub-rich-toolbar" role="toolbar" aria-label="Text formatting" data-selection-expanded={selectionExpanded} data-selected-blocks={selectedBlocks.length}>
    <select aria-label="Paragraph Style" value={activeStyle || 'normal'} onChange={event => { send({ type: 'style.toggle', style: event.target.value }); editor.send({ type: 'focus' }); }}>
      <option value="normal">Paragraph</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="blockquote">Quote</option>
    </select>
    {([{ alignment: 'left', title: 'Align Left', Icon: AlignLeft }, { alignment: 'center', title: 'Align Center', Icon: AlignCenter }, { alignment: 'right', title: 'Align Right', Icon: AlignRight }] as const).map(({ alignment, title, Icon }) =>
      <button type="button" key={alignment} title={title} aria-label={title} disabled={!selectedBlocks.length}
        aria-pressed={selectedBlocks.length > 0 && selectedBlocks.every(block => (blockTextAlignment(block.node) || 'left') === alignment)}
        onMouseDown={event => event.preventDefault()} onClick={() => {
          getSelectedTextBlocks(editor.getSnapshot()).forEach(block => editor.send({ type: 'block.set', at: block.path, props: { textAlign: alignment } }));
        }}><Icon size={17} /></button>)}
    {[{ name: 'strong', title: 'Bold', Icon: Bold }, { name: 'em', title: 'Italic', Icon: Italic }, { name: 'underline', title: 'Underline', Icon: Underline }].map(({ name, title, Icon }) =>
      <button type="button" key={name} title={title} aria-label={title} aria-pressed={name === 'strong' ? bold : name === 'em' ? italic : underline} onMouseDown={event => event.preventDefault()} onClick={() => send({ type: 'decorator.toggle', decorator: name })}><Icon size={17} /></button>)}
    <button type="button" title="Bullet List" aria-label="Bullet List" aria-pressed={activeList === 'bullet'} onMouseDown={event => event.preventDefault()} onClick={() => send({ type: 'list item.toggle', listItem: 'bullet' })}><List size={17} /></button>
    <button type="button" title="Numbered List" aria-label="Numbered List" aria-pressed={activeList === 'number'} onMouseDown={event => event.preventDefault()} onClick={() => send({ type: 'list item.toggle', listItem: 'number' })}><ListOrdered size={17} /></button>
    <button type="button" title="Add Link" aria-label="Add Link" aria-expanded={link} aria-pressed={activeAnnotations.some(annotation => annotation._type === 'link')} onMouseDown={event => event.preventDefault()} onClick={openLink}><Link2 size={17} /></button>
    <button type="button" title="Remove Link" aria-label="Remove Link" onMouseDown={event => event.preventDefault()} onClick={() => send({ type: 'annotation.remove', annotation: { name: 'link' } })}><Unlink size={17} /></button>
    <input type="color" aria-label="Text Color" title="Text Color" defaultValue="#172a24" onChange={event => editor.send({ type: 'annotation.add', annotation: { name: 'textColor', value: { color: { hex: event.target.value } } } })} />
    <input type="number" aria-label="Text Size" title="Text Size" defaultValue={title ? 24 : 16} min={10} max={64} onChange={event => {
      const size = Number(event.target.value);
      if (Number.isFinite(size) && size >= 10 && size <= 64) editor.send({ type: 'annotation.add', annotation: { name: 'textSize', value: { size } } });
    }} />
    <button type="button" title="Undo" aria-label="Undo" onMouseDown={event => event.preventDefault()} onClick={() => send({ type: 'history.undo' })}><Undo2 size={17} /></button>
    <button type="button" title="Redo" aria-label="Redo" onMouseDown={event => event.preventDefault()} onClick={() => send({ type: 'history.redo' })}><Redo2 size={17} /></button>
    {link && <div className="hub-link-controls"><div className="hub-link-input"><input autoFocus aria-label="Link URL" type="text" inputMode="url" placeholder="https://" value={href}
      aria-invalid={!!linkError} aria-describedby={linkError ? linkErrorId : undefined}
      onChange={event => { setHref(event.target.value); setLinkError(''); }}
      onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); applyLink(); } if (event.key === 'Escape') { event.preventDefault(); closeLink(); } }} />
      <button type="button" onClick={applyLink}>Apply Link</button><button type="button" onClick={closeLink}>Cancel</button></div>
      {linkError && <p id={linkErrorId} role="alert" className="hub-error">{linkError}</p>}</div>}
  </div>;
}

function ValueReader({ register, changed }: { register?: (reader: () => any[] | null) => () => void; changed: React.MutableRefObject<boolean> }) {
  const editor = usePortableTextEditor();
  useEffect(() => register?.(() => changed.current ? PortableTextEditor.getValue(editor) || [] : null), [register, editor, changed]);
  return null;
}

export default function RichTextEditor({ value, onChange, label, readOnly = false, register, variant = 'body' }: { value: any[]; onChange: (value: any[]) => void; label: string; readOnly?: boolean; register?: (reader: () => any[] | null) => () => void; variant?: 'body' | 'title' }) {
  const [error, setError] = useState('');
  const changed = useRef(false);
  const currentValue = useRef(value);
  currentValue.current = value;
  return <div className={`hub-rich-editor${variant === 'title' ? ' hub-rich-editor-title' : ''}`} data-editor-label={label}><EditorProvider initialConfig={{ schemaDefinition: schema, initialValue: value as PortableTextBlock[] }}>
    <EventListenerPlugin on={event => {
      if (event.type === 'patch' || event.type === 'mutation') changed.current = true;
      // Replayed mutations after a save must not mark identical text as unsaved.
      if (event.type === 'mutation' && !equal(currentValue.current, event.value || [])) {
        currentValue.current = event.value || [];
        onChange(currentValue.current);
      }
      if (event.type === 'invalid value') setError('Some formatting needs review before editing this text.');
    }} />
    <ValueReader register={register} changed={changed} />
    <Toolbar title={variant === 'title'} />
    <PortableTextEditable readOnly={readOnly} aria-label={label} className="hub-rich-editable" renderDecorator={({ children, value: decorator }) =>
      decorator === 'strong' ? <strong>{children}</strong> : decorator === 'em' ? <em>{children}</em> : decorator === 'underline' ? <u>{children}</u> : <span>{children}</span>}
      renderStyle={({ children, value: style, block }) => {
        const alignment = { textAlign: blockTextAlignment(block) };
        return style === 'h1' ? <h1 style={alignment}>{children}</h1> : style === 'h2' ? <h2 style={alignment}>{children}</h2>
          : style === 'h3' ? <h3 style={alignment}>{children}</h3> : style === 'blockquote' ? <blockquote style={alignment}>{children}</blockquote> : <p style={alignment}>{children}</p>;
      }}
      renderAnnotation={({ children, value: annotation }) => <span data-link-href={annotation?._type === 'link' ? String(annotation.href || '') : undefined} title={annotation?._type === 'link' ? String(annotation.href || '') : undefined} style={{ color: (annotation?.color as { hex?: string })?.hex,
        fontSize: typeof annotation?.size === 'number' ? annotation.size : undefined, fontWeight: typeof annotation?.weight === 'number' ? annotation.weight : undefined,
        textDecoration: annotation?._type === 'link' ? 'underline' : undefined }}>{children}</span>} />
    {error && <p className="hub-message hub-error">{error}</p>}
  </EditorProvider></div>;
}
