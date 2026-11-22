import Link from 'next/link';
import { hrefWith, type Params } from '@/lib/catalog-params';
import { formatPrice } from '@/lib/format';
import { CONDITION_LABELS, CONDITION_TO_PARAM } from '@/lib/labels';
import type { CatalogPage, ShopCategory } from '@/lib/types';
import { cn } from '@/lib/cn';

export interface CatalogContext {
  /** Chemin de la page courante : /catalogue, /categorie/x ou /marque/y. */
  base: string;
  params: Params;
  fixed: { category?: string; brand?: string };
}

/** Pastille de filtre : blanche bordée, bleu nuit quand elle est active. */
export function Pill({ href, active, children, count }: { href: string; active: boolean; children: React.ReactNode; count?: number }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[14px] transition-colors sm:min-h-10',
        active ? 'border-navy bg-navy font-medium text-white' : 'border-line-2 bg-surface text-ink-2 hover:border-ink-2 hover:text-ink',
      )}
    >
      {children}
      {count !== undefined && <span className={cn('num text-[12px]', active ? 'text-white/70' : 'text-faint')}>{count}</span>}
    </Link>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-4 first:pt-0">
      <p className="eyebrow mb-3">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/** Onglets de catégories dans un conteneur de verre clair ; l'onglet actif est bleu nuit plein. */
export function CategoryTabs({ ctx, categories }: { ctx: CatalogContext; categories: ShopCategory[] }) {
  const { base, params, fixed } = ctx;
  const rest = { ...params, categorie: undefined, page: undefined } as Params;
  // Adresse propre /categorie/x, sauf sur une page marque (paramètre).
  const href = (slug: string | null) => (fixed.brand ? hrefWith(base, params, { categorie: slug }) : hrefWith(slug ? `/categorie/${slug}` : '/catalogue', rest, {}));
  const current = fixed.category ?? params.categorie;
  const tab = (active: boolean) => cn('inline-flex h-10 items-center whitespace-nowrap rounded-full px-4 text-[14px] transition-colors', active ? 'bg-navy font-medium text-white' : 'text-ink-2 hover:bg-white hover:text-ink');
  // Mobile : une seule ligne d'onglets qui défile dans son conteneur (la page, elle, ne déborde jamais).
  return (
    <nav aria-label="Catégories" className="glass-light rounded-full p-1.5 sm:rounded-[28px]">
      <ul className="scrollbar-none flex gap-1 overflow-x-auto sm:flex-wrap sm:overflow-visible">
        <li className="shrink-0">
          <Link href={href(null)} scroll={false} aria-current={!current ? 'page' : undefined} className={tab(!current)}>
            Tout
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.id} className="shrink-0">
            <Link href={href(c.slug)} scroll={false} aria-current={current === c.slug ? 'page' : undefined} className={tab(current === c.slug)}>
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Filtres : de simples liens (et un formulaire pour le prix). Ils fonctionnent sans JavaScript,
 * se partagent par adresse et restent lisibles par les moteurs de recherche.
 */
export function Filters({ ctx, data }: { ctx: CatalogContext; data: CatalogPage }) {
  const { base, params, fixed } = ctx;
  const conditionCount = (c: string) => data.facets.conditions.find((x) => x.value === c)?.count ?? 0;
  return (
    <div className="divide-y divide-line">
      {!fixed.brand && data.facets.brands.length > 0 && (
        <Group title="Marque">
          {data.facets.brands.map((b) => (
            <Pill key={b.id} href={hrefWith(base, params, { marque: params.marque === b.slug ? null : b.slug })} active={params.marque === b.slug} count={b.count}>
              {b.name}
            </Pill>
          ))}
        </Group>
      )}
      <Group title="État">
        {(['NEW', 'REFURBISHED', 'USED'] as const).map((c) => {
          const value = CONDITION_TO_PARAM[c];
          const count = conditionCount(c);
          if (!count && params.etat !== value) return null;
          return (
            <Pill key={c} href={hrefWith(base, params, { etat: params.etat === value ? null : value })} active={params.etat === value} count={count}>
              {CONDITION_LABELS[c]}
            </Pill>
          );
        })}
      </Group>
      <Group title="Disponibilité">
        <Pill href={hrefWith(base, params, { dispo: params.dispo === '1' ? null : '1' })} active={params.dispo === '1'}>
          En stock
        </Pill>
        <Pill href={hrefWith(base, params, { promo: params.promo === '1' ? null : '1' })} active={params.promo === '1'}>
          En promotion
        </Pill>
      </Group>
      <div className="py-4">
        <p className="eyebrow mb-3">Prix (FCFA)</p>
        <form action={base} className="space-y-3">
          {Object.entries(params)
            .filter(([k, v]) => v && !['min', 'max', 'page'].includes(k))
            .map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium">Minimum</span>
              <input name="min" type="number" inputMode="numeric" min={0} step={1000} defaultValue={params.min} placeholder={String(data.priceRange.min)} className="num h-11 w-full rounded-xl border border-line-2 bg-surface px-3 text-[14px] outline-none focus:border-accent" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium">Maximum</span>
              <input name="max" type="number" inputMode="numeric" min={0} step={1000} defaultValue={params.max} placeholder={String(data.priceRange.max)} className="num h-11 w-full rounded-xl border border-line-2 bg-surface px-3 text-[14px] outline-none focus:border-accent" />
            </label>
          </div>
          <p className="text-[12.5px] text-muted">
            De {formatPrice(data.priceRange.min)} à {formatPrice(data.priceRange.max)}
          </p>
          <button type="submit" className="glass-dark inline-flex h-11 w-full items-center justify-center rounded-full text-[14px] font-medium text-white hover:bg-navy active:scale-[.98]">
            Appliquer
          </button>
        </form>
      </div>
    </div>
  );
}
