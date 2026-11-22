'use client';

import { ChevronLeft, ChevronRight, ImageOff, Maximize2, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { ImageRef } from '@/lib/types';
import { cn } from '@/lib/cn';

/**
 * Galerie : grande image (produit entier visible), miniatures sur ordinateur,
 * balayage horizontal sur mobile, plein écran au clic pour examiner les détails.
 */
export function Gallery({ images, name }: { images: ImageRef[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const count = images.length;

  const show = (i: number) => {
    const next = ((i % count) + count) % count;
    setIndex(next);
    track.current?.scrollTo({ left: next * track.current.clientWidth, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!zoom) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoom(false);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % count);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + count) % count);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [zoom, count]);

  if (!count) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-3xl bg-paper-2 text-faint">
        <ImageOff className="size-8" aria-hidden="true" />
        <span className="sr-only">Pas de photo</span>
      </div>
    );
  }

  return (
    <div className="md:flex md:flex-row-reverse md:gap-4">
      <div className="relative min-w-0 flex-1 overflow-hidden rounded-3xl bg-paper-2">
        <div
          ref={track}
          className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto md:overflow-hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / el.clientWidth);
            if (i !== index) setIndex(i);
          }}
        >
          {images.map((img, i) => (
            <button key={img.id} type="button" onClick={() => { setIndex(i); setZoom(true); }} className="relative aspect-square w-full shrink-0 snap-center bg-paper-2 md:cursor-zoom-in" aria-label={`Agrandir la photo ${i + 1}`}>
              <Image src={img.url!} alt={img.alt || name} fill sizes="(min-width: 1024px) 640px, (min-width: 768px) 55vw, 100vw" className="object-contain" priority={i === 0} />
            </button>
          ))}
        </div>
        {count > 1 && (
          <>
            <span className="glass-dark num absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-[12px] text-white md:hidden">
              {index + 1} / {count}
            </span>
            <button type="button" onClick={() => show(index - 1)} aria-label="Photo précédente" className="glass-light absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full text-ink hover:bg-white md:inline-flex">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => show(index + 1)} aria-label="Photo suivante" className="glass-light absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full text-ink hover:bg-white md:inline-flex">
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
        <span className="glass-light pointer-events-none absolute right-3 top-3 hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-ink-2 md:inline-flex">
          <Maximize2 className="size-3.5" aria-hidden="true" /> Cliquer pour agrandir
        </span>
      </div>

      {count > 1 && (
        <ul className="mt-3 hidden gap-2 md:mt-0 md:flex md:w-[76px] md:flex-col" aria-label="Miniatures">
          {images.map((img, i) => (
            <li key={img.id}>
              <button type="button" onClick={() => show(i)} aria-label={`Photo ${i + 1}`} aria-current={i === index} className={cn('relative block size-[76px] overflow-hidden rounded-2xl border-2 bg-paper-2', i === index ? 'border-navy' : 'border-transparent hover:border-line-2')}>
                <Image src={img.url!} alt="" fill sizes="76px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {zoom && (
        <div className="fixed inset-0 z-50 flex animate-fade-in flex-col bg-navy/95" role="dialog" aria-modal="true" aria-label={`Photos de ${name}`}>
          <div className="flex h-14 shrink-0 items-center justify-between px-4 text-white">
            <span className="num text-[13px] text-white/70">
              {index + 1} / {count}
            </span>
            <button type="button" onClick={() => setZoom(false)} aria-label="Fermer" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-white/10" autoFocus>
              <X className="size-6" />
            </button>
          </div>
          <div className="relative flex-1">
            <Image src={images[index].url!} alt={images[index].alt || name} fill sizes="100vw" className="object-contain" quality={85} />
            {count > 1 && (
              <>
                <button type="button" onClick={() => setIndex((index - 1 + count) % count)} aria-label="Photo précédente" className="absolute left-2 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full text-white hover:bg-white/10">
                  <ChevronLeft className="size-7" />
                </button>
                <button type="button" onClick={() => setIndex((index + 1) % count)} aria-label="Photo suivante" className="absolute right-2 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full text-white hover:bg-white/10">
                  <ChevronRight className="size-7" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
