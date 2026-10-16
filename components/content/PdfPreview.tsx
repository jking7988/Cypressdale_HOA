'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentLoadingTask } from 'pdfjs-dist';

export default function PdfPreview({ url, name }: { url: string; name: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pages, setPages] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let task: PDFDocumentLoadingTask | undefined;
    const target = container.current!;
    target.replaceChildren(); setState('loading'); setPages(0);
    async function render() {
      const pdfjs = await import('pdfjs-dist');
      if (cancelled) return;
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      task = pdfjs.getDocument({ url, withCredentials: true,
        useSystemFonts: true, ownerDocument: target.ownerDocument });
      const pdf = await task.promise;
      if (cancelled) return;
      setPages(pdf.numPages);
      // Bound preview work for large documents; Open/Download retain the entire PDF.
      for (let number = 1; number <= Math.min(pdf.numPages, 10); number++) {
        const page = await pdf.getPage(number);
        if (cancelled) return;
        const size = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(1.5, 1600 / size.width, 2400 / size.height) });
        const canvas = target.ownerDocument.createElement('canvas');
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        canvas.className = 'block h-auto w-full max-w-full bg-white';
        canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `${name}, page ${number}`);
        target.append(canvas);
        await page.render({ canvas, viewport }).promise;
        page.cleanup();
      }
      if (!cancelled) setState('ready');
    }
    render().catch(() => { if (!cancelled) { target.replaceChildren(); setState('error'); } });
    return () => { cancelled = true; target.replaceChildren(); task?.destroy().catch(() => {}); };
  }, [url, name]);
  return <div aria-busy={state === 'loading'} data-pdf-state={state}>
    {state === 'loading' && <p role="status" className="py-3 text-sm">Loading PDF...</p>}
    <div ref={container} className="space-y-3" />
    {state === 'error' && <p className="py-3 text-sm">PDF preview unavailable. Open or download the file below.</p>}
    {state === 'ready' && pages > 10 && <p className="mt-2 text-sm">Pages 1-10 of {pages}</p>}
  </div>;
}
