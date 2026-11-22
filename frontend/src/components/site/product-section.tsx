import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ProductCard as Card } from '@/lib/types';
import { ProductCard, type OrderContext } from './product-card';

/** Titre de section : serif, court, lien « voir tout » souligné en accent. */
export function SectionHeading({ title, href, eyebrow, linkLabel = 'Voir tout' }: { title: string; href?: string; eyebrow?: string; linkLabel?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="display text-[26px] sm:text-[36px]">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 pb-1 text-[14px] font-medium text-accent underline">
          {linkLabel} <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

/** Section de produits : grille 2 / 3 / 4 colonnes, sans défilement horizontal. */
export function ProductSection({ title, href, eyebrow, items, order, limit = 4 }: { title: string; href?: string; eyebrow?: string; items: Card[]; order: OrderContext; limit?: number }) {
  if (!items.length) return null;
  return (
    <section className="container-page mt-16 sm:mt-24">
      <SectionHeading title={title} href={href} eyebrow={eyebrow} />
      <ProductGrid items={items.slice(0, limit)} order={order} />
    </section>
  );
}

export function ProductGrid({ items, order }: { items: Card[]; order: OrderContext }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
      {items.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} order={order} priority={i < 2} />
        </li>
      ))}
    </ul>
  );
}
