'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  photos: string[];
  title: string;
};

export function YardLightbox({ photos, title }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!photos || photos.length === 0) return null;

  const openAt = (index: number) => {
    setActiveIndex(index);
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  const showNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const showPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') showNext();
      if (e.key === 'ArrowLeft') showPrev();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, showNext, showPrev]);

  const mainPhoto = photos[0];

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
          {photos.length > 1 && (
            <span className="text-[10px] opacity-80">
              ({photos.length} total)
            </span>
          )}
        </div>
      </button>

      {/* Thumbnails (extra photos) */}
      {photos.length > 1 && (
        <div className="grid gap-2 grid-cols-3 md:grid-cols-4">
          {photos.map((url, idx) => (
            <button
              type="button"
              key={url || idx}
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

      {/* Lightbox overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center">
          {/* Click background to close */}
          <button
            type="button"
            className="absolute inset-0 cursor-zoom-out"
            onClick={close}
            aria-label="Close lightbox"
          />

          {/* Image + controls */}
          <div className="relative z-10 max-w-5xl w-full px-4">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-3 text-white text-xs">
              <span className="truncate max-w-[70%]">{title}</span>
              <span>
                {activeIndex + 1} / {photos.length}
              </span>
            </div>

            <div className="relative bg-black/60 rounded-2xl overflow-hidden flex items-center justify-center max-h-[80vh]">
              {/* Prev */}
              {photos.length > 1 && (
                <button
                  type="button"
                  className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    showPrev();
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}

              {/* Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[activeIndex]}
                alt={`${title} photo ${activeIndex + 1}`}
                className="max-h-[80vh] w-auto mx-auto object-contain"
              />

              {/* Next */}
              {photos.length > 1 && (
                <button
                  type="button"
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    showNext();
                  }}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}

              {/* Close button */}
              <button
                type="button"
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black/90"
                onClick={(e) => {
                  e.stopPropagation();
                  close();
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
