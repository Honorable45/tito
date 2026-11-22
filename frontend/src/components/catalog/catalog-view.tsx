import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';
import { DemoNotice } from '@/components/site/demo-notice';
import { PageHero } from '@/components/site/page-hero';
import { ProductGrid } from '@/components/site/product-section';
import { SearchBox } from '@/components/site/search-box';
import { WhatsAppIcon } from '@/components/site/whatsapp-icon';
import { apiQuery, hrefWith, type Params } from '@/lib/catalog-params';
import { formatPrice } from '@/lib/format';
import { CONDITION_LABELS, CONDITION_PARAM, GROUP_PARAM, SORTS } from '@/lib/labels';
import { serverGet } from '@/lib/server-api';
import { getCategories, getSettings } from '@/lib/settings';
import type { CatalogPage } from '@/lib/types';
import { cn } from '@/lib/cn';
import { waLink } from '@/lib/whatsapp';
import { FilterSheet } from './filter-sheet';
import { CategoryTabs, Filters, type CatalogContext } from './filters';
import { SortSelect } from './sort-select';

interface Props {
  title: string;
  intro?: string | null;
  back?: string;
  ctx: CatalogContext;
  autoFocusSearch?: boolean;
}

/** Vue catalogue partagée par /catalogue, /categorie/[slug] et /marque/[slug]. */
export async function CatalogView({ title, intro, back = '/', ctx, autoFocusSearch }: Props) {
  const { base, params, fixed } = ctx;
  const [data, categories, settings] = await Promise.all([serverGet<CatalogPage>(`/shop/products?${apiQuery(params, fixed)}`, 30), getCategories(), getSettings()]);
  const order = { shopName: settings.shopName, whatsapp: settings.whatsapp };
  const heroImage = settings.heroImageUrl;

  const hero = (
    <PageHero title={title} text={intro} image={heroImage} back={back}>
      <div className="glass max-w-2xl rounded-full p-1.5">
        <SearchBox autoFocus={autoFocusSearch} />
      </div>
    </PageHero>
  );

  if (!data) {
    return (
      <>
        {hero}
        <p className="container-page mt-12 text-center text-muted">Le catalogue est momentanément indisponible. Réessayez dans quelques instants.</p>
      </>
    );
  }

  // Filtres actifs, en pastilles supprimables.
  const chips: { label: string; href: string }[] = [];
  if (params.q) chips.push({ label: `« ${params.q} »`, href: hrefWith(base, params, { q: null }) });
  if (params.rayon && GROUP_PARAM[params.rayon]) chips.push({ label: GROUP_PARAM[params.rayon].title, href: hrefWith(base, params, { rayon: null }) });
  if (params.marque && !fixed.brand) chips.push({ label: data.facets.brands.find((b) => b.slug === params.marque)?.name ?? params.marque, href: hrefWith(base, params, { marque: null }) });
  if (params.etat && CONDITION_PARAM[params.etat]) chips.push({ label: CONDITION_LABELS[CONDITION_PARAM[params.etat]], href: hrefWith(base, params, { etat: null }) });
  if (params.min || params.max) chips.push({ label: `${params.min ? formatPrice(Number(params.min)) : '0'} – ${params.max ? formatPrice(Number(params.max)) : '…'}`, href: hrefWith(base, params, { min: null, max: null }) });
  if (params.dispo === '1') chips.push({ label: 'En stock', href: hrefWith(base, params, { dispo: null }) });
  if (params.promo === '1') chips.push({ label: 'En promotion', href: hrefWith(base, params, { promo: null }) });

  const sort = SORTS.find((s) => s.value === params.tri)?.value ?? 'nouveautes';
  const sortHrefs = Object.fromEntries(SORTS.map((s) => [s.value, hrefWith(base, params, { tri: s.value === 'nouveautes' ? null : s.value })]));
  const filters = <Filters ctx={ctx} data={data} />;
  const wa = waLink(settings.whatsapp, `Bonjour ${settings.shopName}, je cherche un produit${params.q ? ` : ${params.q}` : ''}.`);

  return (
    <>
      {hero}
      <div className="container-page mt-8">
        <CategoryTabs ctx={ctx} categories={categories} />
        <DemoNotice show={data.items.some((p) => p.isDemo)} className="mt-4" />

        <div className="mt-8 lg:grid lg:grid-cols-[260px_1fr] lg:gap-10">
          <aside className="hidden lg:block" aria-label="Filtres">
            {filters}
          </aside>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="num text-[14px] text-muted">
                {data.total} produit{data.total > 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <FilterSheet count={data.total} active={chips.length}>
                  {filters}
                </FilterSheet>
                <SortSelect value={sort} hrefs={sortHrefs} />
              </div>
            </div>

            {chips.length > 0 && (
              <ul className="mt-4 flex flex-wrap items-center gap-2">
                {chips.map((c) => (
                  <li key={c.label}>
                    <Link href={c.href} scroll={false} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-navy px-3.5 text-[13px] font-medium text-white hover:bg-navy-2">
                      {c.label} <X className="size-3.5" aria-label="retirer" />
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={base} className="px-1 text-[13.5px] font-medium text-accent underline">
                    Tout effacer
                  </Link>
                </li>
              </ul>
            )}

            {data.items.length === 0 ? (
              <div className="glass-light mt-6 rounded-3xl p-10 text-center">
                <p className="display text-[26px]">Aucun produit</p>
                <p className="mt-2 text-[15px] text-muted">Retirez un filtre ou demandez-nous.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                  <Link href={base} className="glass-dark inline-flex h-12 items-center rounded-full px-6 text-[15px] font-medium text-white">
                    Effacer les filtres
                  </Link>
                  {wa && (
                    <a href={wa} target="_blank" rel="noopener" className="inline-flex h-12 items-center gap-2 rounded-full bg-wa px-6 text-[15px] font-medium text-white hover:bg-wa-2">
                      <WhatsAppIcon className="size-[18px]" /> Demander
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <ProductGrid items={data.items} order={order} />
              </div>
            )}

            <Pagination base={base} params={params} page={data.page} pageCount={data.pageCount} />
          </div>
        </div>
      </div>
    </>
  );
}

function Pagination({ base, params, page, pageCount }: { base: string; params: Params; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const pages = [...new Set([1, page - 1, page, page + 1, pageCount])].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const href = (p: number) => hrefWith(base, params, { page: p === 1 ? null : String(p) });
  const item = 'num inline-flex size-11 items-center justify-center rounded-full text-[14px] transition-colors';
  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center">
      <div className="glass-light flex items-center gap-1 rounded-full p-1.5">
        {page > 1 && (
          <Link href={href(page - 1)} className={cn(item, 'hover:bg-white')} aria-label="Page précédente">
            <ChevronLeft className="size-4" />
          </Link>
        )}
        {pages.map((p, i) => (
          <span key={p} className="flex items-center gap-1">
            {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-faint">…</span>}
            <Link href={href(p)} aria-current={p === page ? 'page' : undefined} className={cn(item, p === page ? 'bg-navy font-medium text-white' : 'hover:bg-white')}>
              {p}
            </Link>
          </span>
        ))}
        {page < pageCount && (
          <Link href={href(page + 1)} className={cn(item, 'hover:bg-white')} aria-label="Page suivante">
            <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
    </nav>
  );
}
