'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export default function PagePreviewFrame({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);
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
    <iframe ref={frame} title="Page preview" srcDoc="<!doctype html><html><head></head><body></body></html>" className="hub-published-preview" />
    {body && createPortal(<div onSubmitCapture={event => { event.preventDefault(); event.stopPropagation(); }}
      onClickCapture={event => { if ((event.target as Element).closest('a')) { event.preventDefault(); event.stopPropagation(); } }}>
      <main className="container py-8">{children}</main>
    </div>, body)}
  </>;
}
