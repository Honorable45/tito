'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

/** Filtres sur mobile : panneau plein écran ouvert par un bouton, refermé à chaque changement de filtre. */
function Sheet({ count, active, children }: { count: number; active: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => setOpen(false), [pathname, search]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-full border border-line-2 bg-surface px-4 text-[14px] font-medium lg:hidden">
        <SlidersHorizontal className="size-4" aria-hidden="true" /> Filtres
        {active > 0 && <span className="num inline-flex size-5 items-center justify-center rounded-full bg-navy text-[11px] text-white">{active}</span>}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex animate-slide-up flex-col bg-paper lg:hidden" role="dialog" aria-modal="true" aria-label="Filtres">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
            <span className="display text-[24px]">Filtres</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer les filtres" className="-mr-2 inline-flex size-10 items-center justify-center">
              <X className="size-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
          <div className="shrink-0 border-t border-line p-4">
            <button type="button" onClick={() => setOpen(false)} className="glass-dark h-12 w-full rounded-full text-[15px] font-medium text-white active:scale-[.98]">
              Voir {count} produit{count > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function FilterSheet(props: { count: number; active: number; children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Sheet {...props} />
    </Suspense>
  );
}
