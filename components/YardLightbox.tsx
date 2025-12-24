'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  photos: string[];
  title: string;
};

export function YardLightbox({ photos, title }: Props) {
  const list = useMemo(() => (photos ?? []).filter(Boolean), [photos]);
  const [activeIndex, setActiveIndex] = useState(0);

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const lastActiveEl = useRef<HTMLElement | null>(null);

  if (!list.length) return null;

  const isOpen = () => !!dialogRef.current?.open;

  const openAt = (index: number) => {
    const d = dialogRef.current;
    if (!d) return;

    lastActiveEl.current = document.activeElement as HTMLElement | null;

    setActiveIndex(Math.max(0, Math.min(index, list.length - 1)));

    // showModal puts it in the browser "top layer" (always in front)
    if (!d.open) d.showModal();
  };

  const close = () => {
    const d = dialogRef.current;
    if (!d) return;
    if (d.open) d.close();
  };

  const showNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % list.length);
  }, [list.length]);

  const showPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + list.length) % list.length);
  }, [list.length]);

  // Keyboard navigation (while open)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight' && list.length > 1) showNext();
      if (e.key === 'ArrowLeft' && list.length > 1) showPrev();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [list.length, showNext, showPrev]);

  // When the dialog closes, restore focus
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;

    const onClose = () => lastActiveEl.current?.focus?.();
    d.addEventListener('close', onClose);
    return () => d.removeEventListener('close', onClose);
  }, []);

  const mainPhoto = list[0];

  return (
    <div className="space-y-3">
      {/* Main image */}
      <button
        type="button"
        className="relative w-full max-h-[380px] overflow-hidden rounded-2xl border border-emerald-100 group"
        onClick={() => openAt(0)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mainPhoto}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
        <div className="absolute bottom-3 right-3 rounded-full bg-black/70 text-white text-xs px-3 py-1 flex items-center gap-1">
          <span>View photos</span>
          {list.length > 1 && (
            <span className="text-[10px] opacity-80">({list.length} total)</span>
          )}
        </div>
      </button>

      {/* Thumbnails (extra photos) */}
      {list.length > 1 && (
        <div className="grid gap-2 grid-cols-3 md:grid-cols-4">
          {list.map((url, idx) => (
            <button
              type="button"
              key={`${url}-${idx}`}
              className="relative h-20 md:h-24 rounded-xl overflow-hidden border border-emerald-100 hover:border-emerald-300"
              onClick={() => openAt(idx)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`${title} photo ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX (Top-layer dialog) */}
      <dialog
        ref={dialogRef}
        className="p-0 m-0 border-0 bg-transparent max-w-none w-screen h-screen"
        // Esc / browser cancel
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/90"
          onMouseDown={(e) => {
            // click backdrop to close
            if (e.target === e.currentTarget) close();
          }}
        >
          {/* Content */}
          <div className="fixed inset-0 flex items-center justify-center">
            <div className="relative w-full max-w-6xl px-4">
              {/* Top bar */}
              <div className="flex items-center justify-between mb-3 text-white text-xs">
                <span className="truncate max-w-[70%]">{title}</span>
                <span>
                  {activeIndex + 1} / {list.length}
                </span>
              </div>

              <div className="relative bg-black/60 rounded-2xl overflow-hidden flex items-center justify-center max-h-[80vh]">
                {/* Prev */}
                {list.length > 1 && (
                  <button
                    type="button"
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      showPrev();
                    }}
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}

                {/* Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={list[activeIndex]}
                  alt={`${title} photo ${activeIndex + 1}`}
                  className="max-h-[80vh] w-auto mx-auto object-contain"
                />

                {/* Next */}
                {list.length > 1 && (
                  <button
                    type="button"
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      showNext();
                    }}
                    aria-label="Next photo"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}

                {/* Close */}
                <button
                  type="button"
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black/90"
                  onClick={(e) => {
                    e.stopPropagation();
                    close();
                  }}
                  aria-label="Close lightbox"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {list.length > 1 && (
                <div className="mt-3 text-center text-[11px] text-white/70">
                  Use ← → keys to navigate · Esc to close
                </div>
              )}
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
}
