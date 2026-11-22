'use client';

import { Minus, Phone, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AvailabilityLabel, DiscountBadge } from '@/components/site/badges';
import { Price } from '@/components/site/price';
import { WhatsAppIcon } from '@/components/site/whatsapp-icon';
import { formatPhone, formatPrice, telHref } from '@/lib/format';
import type { ProductDetail, Variant } from '@/lib/types';
import { cn } from '@/lib/cn';
import { orderMessage, waLink } from '@/lib/whatsapp';

interface Props {
  product: ProductDetail;
  shopName: string;
  whatsapp: string | null;
  phone: string | null;
  url: string;
}

const RANK = { IN_STOCK: 2, LOW_STOCK: 1, OUT_OF_STOCK: 0 } as const;

/** Choix des variantes, quantité et commande WhatsApp (avec barre fixe sur mobile). */
export function PurchasePanel({ product: p, shopName, whatsapp, phone, url }: Props) {
  const dims = p.variantOptions;
  const initial = useMemo(() => {
    const best = [...p.variants].sort((a, b) => RANK[b.availability] - RANK[a.availability])[0];
    return best?.options ?? {};
  }, [p.variants]);
  const [sel, setSel] = useState<Record<string, string>>(initial);
  const [qty, setQty] = useState(1);

  const matches = (v: Variant, s: Record<string, string>) => dims.every((d) => (v.options[d.key] ?? '') === (s[d.key] ?? ''));
  const variant = p.variants.find((v) => matches(v, sel)) ?? null;

  const choose = (key: string, value: string) => {
    const wanted = { ...sel, [key]: value };
    if (p.variants.some((v) => matches(v, wanted))) return setSel(wanted);
    // Combinaison inexistante : on garde la valeur choisie et on ajuste les autres options au plus proche.
    const candidates = p.variants.filter((v) => v.options[key] === value);
    const score = (v: Variant) => dims.filter((d) => v.options[d.key] === sel[d.key]).length * 10 + RANK[v.availability];
    const best = candidates.sort((a, b) => score(b) - score(a))[0];
    if (best) setSel(best.options);
  };

  const hasVariants = p.variants.length > 0;
  const price = variant?.price ?? p.price;
  const compareAt = hasVariants ? (variant?.compareAtPrice ?? null) : p.compareAtPrice;
  const discount = hasVariants ? (variant?.discountPercent ?? null) : p.discountPercent;
  const availability = variant?.availability ?? p.availability;
  const stockLeft = variant?.availableQuantity ?? p.availableQuantity;
  const maxQty = availability === 'OUT_OF_STOCK' ? 10 : Math.max(1, Math.min(stockLeft, 10));
  const quantity = Math.min(qty, maxQty);
  const reference = variant?.sku ?? p.sku;
  const incomplete = hasVariants && !variant;

  const message = orderMessage({
    shopName,
    product: p.name,
    reference,
    options: dims.filter((d) => sel[d.key]).map((d) => [d.label, sel[d.key]]),
    unitPrice: price,
    quantity,
    url,
  });
  const wa = waLink(whatsapp, message);
  const cta = availability === 'OUT_OF_STOCK' ? 'Demander la disponibilité' : 'Commander sur WhatsApp';

  return (
    <div>
      <div className="flex items-center gap-2">
        <Price price={price} compareAt={compareAt} size="xl" />
        <DiscountBadge percent={discount} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <AvailabilityLabel availability={availability} />
        {availability === 'LOW_STOCK' && stockLeft > 0 && <span className="text-[12.5px] text-muted">Plus que {stockLeft} disponible{stockLeft > 1 ? 's' : ''}</span>}
        <span className="text-[12.5px] text-muted">
          Réf. <span className="font-mono">{reference}</span>
        </span>
      </div>

      {dims.map((d) => (
        <fieldset key={d.key} className="mt-6">
          <legend className="mb-2.5 text-[13px] font-medium text-ink-2">
            {d.label} : <span className="font-medium text-ink">{sel[d.key] ?? '—'}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {d.values.map((value) => {
              const active = sel[d.key] === value;
              const combo = p.variants.find((v) => matches(v, { ...sel, [d.key]: value }));
              const out = combo?.availability === 'OUT_OF_STOCK';
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => choose(d.key, value)}
                  aria-pressed={active}
                  className={cn(
                    'min-h-11 min-w-11 rounded-full border px-4 text-[14px] transition-colors active:scale-[.98]',
                    active ? 'border-navy bg-navy font-medium text-white' : 'border-line-2 bg-surface text-ink hover:border-ink-2',
                    !combo && !active && 'border-dashed text-muted',
                    out && 'text-muted line-through decoration-faint',
                  )}
                  title={!combo ? 'Autre combinaison : les autres options seront ajustées' : out ? 'Rupture de stock' : undefined}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <p id="qty-label" className="mb-2.5 text-[13px] font-medium text-ink-2">
            Quantité
          </p>
          <div className="inline-flex h-12 items-center rounded-full border border-line-2 bg-surface" role="group" aria-labelledby="qty-label">
            <button type="button" onClick={() => setQty(Math.max(1, quantity - 1))} disabled={quantity <= 1} aria-label="Diminuer la quantité" className="inline-flex size-12 items-center justify-center text-ink-2 disabled:text-faint">
              <Minus className="size-4" />
            </button>
            <span className="num w-8 text-center text-[15px] font-medium" aria-live="polite">
              {quantity}
            </span>
            <button type="button" onClick={() => setQty(Math.min(maxQty, quantity + 1))} disabled={quantity >= maxQty} aria-label="Augmenter la quantité" className="inline-flex size-12 items-center justify-center text-ink-2 disabled:text-faint">
              <Plus className="size-4" />
            </button>
          </div>
        </div>
        {quantity > 1 && (
          <p className="pb-3 text-[13.5px] text-muted">
            Total : <span className="num font-medium text-ink">{formatPrice(price * quantity)}</span>
          </p>
        )}
      </div>

      <div className="mt-6 space-y-2">
        {wa && !incomplete ? (
          <a href={wa} target="_blank" rel="noopener" className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-wa text-[16px] font-medium text-white transition-colors hover:bg-wa-2 active:scale-[.98]">
            <WhatsAppIcon className="size-5" /> {cta}
          </a>
        ) : (
          <p className="rounded-full border border-dashed border-line-2 px-4 py-3.5 text-center text-[14px] text-muted">
            {incomplete ? 'Choisissez les options du produit.' : 'La commande par WhatsApp sera bientôt disponible.'}
          </p>
        )}
        {phone && (
          <a href={telHref(phone)} className="glass-dark flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-medium text-white transition-colors hover:bg-navy active:scale-[.98]">
            <Phone className="size-4" aria-hidden="true" /> Appeler le {formatPhone(phone)}
          </a>
        )}
        <p className="pt-1 text-center text-[12.5px] text-muted">Message prérempli · aucun paiement en ligne</p>
      </div>

      {/* Barre de commande fixe sur mobile, pour garder le bouton à portée de pouce. */}
      {wa && !incomplete && (
        <div className="glass-light fixed inset-x-2 bottom-2 z-30 rounded-full py-2 pl-5 pr-2 md:hidden" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="num truncate text-[16px] font-semibold text-accent">{formatPrice(price * quantity)}</p>
              <p className="truncate text-[12px] text-muted">{variant?.label || p.name}{quantity > 1 ? ` · ×${quantity}` : ''}</p>
            </div>
            <a href={wa} target="_blank" rel="noopener" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-wa px-5 text-[15px] font-medium text-white active:scale-[.98]">
              <WhatsAppIcon className="size-5" /> Commander
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
