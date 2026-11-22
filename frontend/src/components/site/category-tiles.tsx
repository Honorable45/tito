import { Package } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ShopCategory } from '@/lib/types';

/** Catégories : vignettes photo arrondies avec le nom dans une pastille de verre. */
export function CategoryTiles({ categories }: { categories: ShopCategory[] }) {
  if (!categories.length) return null;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      {categories.map((c) => (
        <li key={c.id}>
          <Link href={`/categorie/${c.slug}`} className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-navy transition duration-200 hover:-translate-y-0.5 hover:shadow-card sm:aspect-square">
            {c.imageUrl ? (
              <Image src={c.imageUrl} alt="" fill sizes="(min-width: 1024px) 230px, (min-width: 640px) 31vw, 46vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            ) : (
              <Package className="absolute inset-0 m-auto size-7 text-white/50" aria-hidden="true" />
            )}
            <span className="absolute inset-0 bg-navy/35" aria-hidden="true" />
            <span className="glass absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-full px-3 py-2 text-white">
              <span className="truncate text-[13.5px] font-medium">{c.name}</span>
              <span className="num shrink-0 text-[12px] text-white/75">{c.productCount}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
