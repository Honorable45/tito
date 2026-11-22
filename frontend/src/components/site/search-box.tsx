'use client';

import { Search, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { cn } from '@/lib/cn';

/** Recherche : simple formulaire GET vers le catalogue (fonctionne aussi sans JavaScript). */
function Box({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const params = useSearchParams();
  const [value, setValue] = useState(params.get('q') ?? '');
  return (
    <form action="/catalogue" role="search" className={cn('relative flex w-full items-center', className)}>
      <label htmlFor={autoFocus ? 'q-menu' : 'q'} className="sr-only">
        Rechercher un produit
      </label>
      <Search className="pointer-events-none absolute left-4 size-[18px] text-muted" aria-hidden="true" />
      <input
        id={autoFocus ? 'q-menu' : 'q'}
        name="q"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Rechercher un produit"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={120}
        autoFocus={autoFocus}
        className="h-12 w-full rounded-full border border-line-2 bg-surface pl-11 pr-28 text-[15px] text-ink outline-none placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent-soft [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={() => setValue('')} aria-label="Effacer la recherche" className="absolute right-[100px] inline-flex size-8 items-center justify-center text-faint hover:text-ink">
          <X className="size-4" />
        </button>
      )}
      <button type="submit" className="glass-dark absolute right-1.5 h-9 rounded-full px-4 text-[13.5px] font-medium text-white hover:bg-navy active:scale-[.98]">
        Chercher
      </button>
    </form>
  );
}

export function SearchBox(props: { className?: string; autoFocus?: boolean }) {
  return (
    <Suspense fallback={<div className={cn('h-12 w-full rounded-full border border-line-2 bg-surface', props.className)} />}>
      <Box {...props} />
    </Suspense>
  );
}
