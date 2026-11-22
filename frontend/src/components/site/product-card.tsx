import { ArrowUpRight, ImageOff } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { CONDITION_LABELS } from '@/lib/labels';
import { SITE_URL } from '@/lib/site';
import type { ProductCard as Card } from '@/lib/types';
import { cn } from '@/lib/cn';
import { orderMessage, waLink } from '@/lib/whatsapp';
import { AvailabilityLabel, ConditionBadge, DemoBadge, DiscountBadge } from './badges';
import { Price } from './price';
import { WhatsAppIcon } from './whatsapp-icon';

export interface OrderContext {
  shopName: string;
  whatsapp: string | null;
}

/**
 * Carte produit : fond blanc, photo carrée, badges en haut à gauche, bouton d'action en verre posé sur la photo.
 * Produit simple : « Commander » ouvre WhatsApp directement. Avec variantes : « Choisir » ouvre la fiche.
 * Toute la carte mène à la fiche ; le bouton est un lien distinct placé au-dessus.
 */
export function ProductCard({ product: p, order, priority = false, className }: { product: Card; order?: OrderContext; priority?: boolean; className?: string }) {
  const img = p.images[0];
  const href = `/produit/${p.slug}`;
  const direct =
    order && p.variantCount === 0 && p.availability !== 'OUT_OF_STOCK'
      ? waLink(order.whatsapp, orderMessage({ shopName: order.shopName, product: p.name, reference: p.sku, options: [], unitPrice: p.price, quantity: 1, url: `${SITE_URL}${href}` }))
      : null;
  return (
    <article className={cn('group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:-translate-y-0.5 hover:shadow-card', className)}>
      <div className="relative aspect-square overflow-hidden bg-paper-2">
        {img?.url ? (
          <Image
            src={img.url}
            alt={img.alt || p.name}
            fill
            sizes="(min-width: 1024px) 280px, (min-width: 640px) 31vw, 46vw"
            className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-[1.03]"
            priority={priority}
          />
        ) : (
          <ImageOff className="absolute inset-0 m-auto size-6 text-faint" aria-hidden="true" />
        )}
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1">
          <DiscountBadge percent={p.discountPercent} />
          <ConditionBadge condition={p.condition} />
          {p.isDemo && <DemoBadge />}
        </div>
        {direct ? (
          <a href={direct} target="_blank" rel="noopener" aria-label={`Commander ${p.name} sur WhatsApp`} className="glass-dark absolute bottom-2.5 right-2.5 z-10 inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-white transition-colors hover:bg-navy active:scale-[.98]">
            <WhatsAppIcon className="size-4" /> Commander
          </a>
        ) : (
          <span aria-hidden="true" className="glass-dark absolute bottom-2.5 right-2.5 inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13px] font-medium text-white">
            {p.variantCount > 0 ? 'Choisir' : 'Voir'} <ArrowUpRight className="size-3.5" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <h3 className="line-clamp-2 text-[14.5px] font-medium leading-snug text-ink">
          <Link href={href} className="after:absolute after:inset-0">
            {p.name}
          </Link>
        </h3>
        <p className="mt-1 truncate text-[12.5px] text-muted">{[p.brand?.name, CONDITION_LABELS[p.condition]].filter(Boolean).join(' · ')}</p>
        <div className="mt-auto pt-3">
          <Price price={p.price} compareAt={p.compareAtPrice} from={p.priceFrom} />
          <AvailabilityLabel availability={p.availability} className="mt-1" />
        </div>
      </div>
    </article>
  );
}
