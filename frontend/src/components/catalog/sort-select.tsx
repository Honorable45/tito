'use client';

import { useRouter } from 'next/navigation';
import { SORTS } from '@/lib/labels';

export function SortSelect({ value, hrefs }: { value: string; hrefs: Record<string, string> }) {
  const router = useRouter();
  return (
    <label className="inline-flex items-center gap-2 text-[13.5px]">
      <span className="hidden text-muted sm:inline">Trier par</span>
      <select
        value={value}
        onChange={(e) => router.push(hrefs[e.target.value], { scroll: false })}
        className="h-11 rounded-full border border-line-2 bg-surface pl-4 pr-9 text-[14px] font-medium text-ink outline-none focus:border-accent"
        aria-label="Trier les produits"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
