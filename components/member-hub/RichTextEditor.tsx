'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorProvider, PortableTextEditable, PortableTextEditor, usePortableTextEditor, defineSchema, useEditor, useEditorSelector, type PortableTextBlock } from '@portabletext/editor';
import { isActiveDecorator, getActiveStyle, getActiveListItem } from '@portabletext/editor/selectors';
import { EventListenerPlugin } from '@portabletext/editor/plugins';
import { Bold, Italic, Underline, List, ListOrdered, Link2, Unlink, Undo2, Redo2 } from 'lucide-react';

const schema = defineSchema({
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

function Toolbar() {
  const editor = useEditor();
  const bold = useEditorSelector(editor, isActiveDecorator('strong'));
  const italic = useEditorSelector(editor, isActiveDecorator('em'));
  const underline = useEditorSelector(editor, isActiveDecorator('underline'));
  const activeStyle = useEditorSelector(editor, getActiveStyle);
  const activeList = useEditorSelector(editor, getActiveListItem);
  const [link, setLink] = useState(false);
  const [href, setHref] = useState('');
  function send(event: Parameters<typeof editor.send>[0]) { editor.send(event); editor.send({ type: 'focus' }); }
  return <div className="hub-rich-toolbar" role="toolbar" aria-label="Text formatting">
    <select aria-label="Paragraph Style" value={activeStyle || 'normal'} onChange={event => send({ type: 'style.toggle', style: event.target.value })}>
      <option value="normal">Paragraph</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="blockquote">Quote</option>
    </select>
    {[{ name: 'strong', title: 'Bold', Icon: Bold }, { name: 'em', title: 'Italic', Icon: Italic }, { name: 'underline', title: 'Underline', Icon: Underline }].map(({ name, title, Icon }) =>
      <button type="button" key={name} title={title} aria-label={title} aria-pressed={name === 'strong' ? bold : name === 'em' ? italic : underline} onMouseDown={event => event.preventDefault()} onClick={() => send({ type: 'decorator.toggle', decorator: name })}><Icon size={17} /></button>)}
    <button type="button" title="Bullet List" aria-label="Bullet List" aria-pressed={activeList === 'bullet'} onMouseDown={event => event.preventDefault()} onClick={() => send({ type: 'list item.toggle', listItem: 'bullet' })}><List size={17} /></button>
    <button type="button" title="Numbered List" aria-label="Numbered List" aria-pressed={activeList === 'number'} onMouseDown={event => event.preventDefault()} onClick={() => send({ type: 'list item.toggle', listItem: 'number' })}><ListOrdered size={17} /></button>
    <button type="button" title="Add Link" aria-label="Add Link" onMouseDown={event => event.preventDefault()} onClick={() => setLink(!link)}><Link2 size={17} /></button>
    <button type="button" title="Remove Link" aria-label="Remove Link" onMouseDown={event => event.preventDefault()} onClick={() => send({ type: 'annotation.remove', annotation: { name: 'link' } })}><Unlink size={17} /></button>
    <input type="color" aria-label="Text Color" title="Text Color" defaultValue="#172a24" onChange={event => send({ type: 'annotation.add', annotation: { name: 'textColor', value: { color: { hex: event.target.value } } } })} />
    <input type="number" aria-label="Text Size" title="Text Size" defaultValue={16} min={10} max={64} onChange={event => send({ type: 'annotation.add', annotation: { name: 'textSize', value: { size: Number(event.target.value) } } })} />
    <button type="button" title="Undo" aria-label="Undo" onMouseDown={event => event.preventDefault()} onClick={() => send({ type: 'history.undo' })}><Undo2 size={17} /></button>
    <button type="button" title="Redo" aria-label="Redo" onMouseDown={event => event.preventDefault()} onClick={() => send({ type: 'history.redo' })}><Redo2 size={17} /></button>
    {link && <div className="hub-link-input"><input aria-label="Link URL" type="url" placeholder="https://" value={href} onChange={event => setHref(event.target.value)} />
      <button type="button" onClick={() => { if (/^(https?:|mailto:|tel:|\/|#)/i.test(href)) { send({ type: 'annotation.add', annotation: { name: 'link', value: { href, openInNewTab: true } } }); setLink(false); } }}>Apply Link</button></div>}
  </div>;
}

function ValueReader({ register, changed }: { register?: (reader: () => any[] | null) => () => void; changed: React.MutableRefObject<boolean> }) {
  const editor = usePortableTextEditor();
  useEffect(() => register?.(() => changed.current ? PortableTextEditor.getValue(editor) || [] : null), [register, editor, changed]);
  return null;
}

export default function RichTextEditor({ value, onChange, label, readOnly = false, register }: { value: any[]; onChange: (value: any[]) => void; label: string; readOnly?: boolean; register?: (reader: () => any[] | null) => () => void }) {
  const [error, setError] = useState('');
  const changed = useRef(false);
  return <div className="hub-rich-editor"><EditorProvider initialConfig={{ schemaDefinition: schema, initialValue: value as PortableTextBlock[] }}>
    <EventListenerPlugin on={event => {
      if (event.type === 'patch' || event.type === 'mutation') changed.current = true;
      if (event.type === 'mutation') onChange(event.value || []);
      if (event.type === 'invalid value') setError('Some formatting needs review before editing this text.');
    }} />
    <ValueReader register={register} changed={changed} />
    <Toolbar />
    <PortableTextEditable readOnly={readOnly} aria-label={label} className="hub-rich-editable" renderDecorator={({ children, value: decorator }) =>
      decorator === 'strong' ? <strong>{children}</strong> : decorator === 'em' ? <em>{children}</em> : decorator === 'underline' ? <u>{children}</u> : <span>{children}</span>}
      renderStyle={({ children, value: style }) => style === 'h1' ? <h1>{children}</h1> : style === 'h2' ? <h2>{children}</h2> : style === 'h3' ? <h3>{children}</h3> : <p>{children}</p>}
      renderAnnotation={({ children, value: annotation }) => <span style={{ color: (annotation?.color as { hex?: string })?.hex,
        fontSize: typeof annotation?.size === 'number' ? annotation.size : undefined, fontWeight: typeof annotation?.weight === 'number' ? annotation.weight : undefined,
        textDecoration: annotation?._type === 'link' ? 'underline' : undefined }}>{children}</span>} />
    {error && <p className="hub-message hub-error">{error}</p>}
  </EditorProvider></div>;
}
