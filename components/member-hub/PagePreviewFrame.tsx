'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Monitor, Smartphone } from 'lucide-react';

export type PreviewDevice = 'desktop' | 'mobile';

export default function PagePreviewFrame({ children, device: selectedDevice, onDeviceChange }: {
  children: ReactNode;
  device?: PreviewDevice;
  onDeviceChange?: (device: PreviewDevice) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);
  const [localDevice, setLocalDevice] = useState<PreviewDevice>('desktop');
  const device = selectedDevice ?? localDevice;
  const [size, setSize] = useState({ width: 1280, height: 640 });
  const width = device === 'mobile' ? 390 : Math.max(1280, size.width);
  const scale = Math.min(1, size.width / width);
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    function measure() {
      if (!element || !element.clientWidth || !element.clientHeight) return;
      setSize(previous => previous.width === element.clientWidth && previous.height === element.clientHeight
        ? previous : { width: element.clientWidth, height: element.clientHeight });
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element); measure();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = frame.current;
    function connect() {
      const document = element?.contentDocument;
      if (document?.readyState === 'complete') setBody(document.body);
    }
    // Server-rendered frames can finish loading before hydration attaches events.
    element?.addEventListener('load', connect); connect();
    return () => element?.removeEventListener('load', connect);
  }, []);
  useEffect(() => {
    if (!body) return;
    const target = body.ownerDocument;
    // Keep responsive styles and page backgrounds isolated from the admin UI.
    function syncStyles() {
      target.head.querySelectorAll('[data-preview-style]').forEach(node => node.remove());
      document.head.querySelectorAll('link[rel="stylesheet"], style').forEach(node => {
        const copy = node.cloneNode(true) as HTMLElement;
        copy.setAttribute('data-preview-style', ''); target.head.append(copy);
      });
    }
    syncStyles();
    const observer = new MutationObserver(syncStyles);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    body.className = 'min-h-screen text-brand-900 overflow-x-hidden';
    body.style.background = 'var(--bg)'; body.style.color = 'var(--fg)';
    target.documentElement.lang = 'en';
    return () => observer.disconnect();
  }, [body]);
  return <>
    <div className="hub-preview-device-controls" role="group" aria-label="Preview device">
      {([{ value: 'desktop', label: 'Desktop', Icon: Monitor }, { value: 'mobile', label: 'Mobile', Icon: Smartphone }] as const).map(({ value, label, Icon }) =>
        <button key={value} type="button" title={`${label} preview`} aria-label={`${label} preview`} aria-pressed={device === value}
          onClick={() => { setLocalDevice(value); onDeviceChange?.(value); }}><Icon size={16} />{label}</button>)}
    </div>
    <div ref={stage} className="hub-preview-stage" data-preview-device={device}>
      <div className="hub-preview-viewport" style={{ width: width * scale }}>
        <iframe ref={frame} title="Page preview" srcDoc="<!doctype html><html><head></head><body></body></html>" className="hub-published-preview"
          style={{ width, height: size.height / scale, transform: `scale(${scale})` }} />
      </div>
    </div>
    {body && createPortal(<div onSubmitCapture={event => { event.preventDefault(); event.stopPropagation(); }}
      onClickCapture={event => { if ((event.target as Element).closest('a')) { event.preventDefault(); event.stopPropagation(); } }}>
      <main className="container py-8">{children}</main>
    </div>, body)}
  </>;
}
