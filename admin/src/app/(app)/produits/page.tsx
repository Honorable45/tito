'use client';

import { ImageOff, Package, Plus } from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback } from 'react';
import { useCan } from '@/components/admin/session';
import { DataTable, PageHeader, Pagination, SearchInput, Tabs, Toolbar } from '@/components/admin/ui';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/field';
import { LoadingBlock } from '@/components/ui/spinner';
import { Tag } from '@/components/ui/status';
import { StockStatus } from '@/components/admin/stock-status';
import type { AdminProduct, BrandWithModels, CategoryRow } from '@/lib/admin-types';
import { formatAmount } from '@/lib/format';
import { CONDITION_LABELS } from '@/lib/labels';
import { useList } from '@/lib/use-list';
import { useResource } from '@/lib/use-resource';

const TAB_PARAMS: Record<string, Record<string, string>> = {
  ACCESSORY: { kind: 'ACCESSORY' },
  PROMO: { kind: 'ACCESSORY', promo: 'true' },
  DRAFT: { kind: 'ACCESSORY', published: 'no' },
  PART: { kind: 'PART' },
  ARCHIVED: { status: 'ARCHIVED' },
};

function ProductsList() {
  const can = useCan();
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const categoryId = search.get('categorie') ?? '';
  const brandId = search.get('marque') ?? '';
  const condition = search.get('etat') ?? '';
  const params = useCallback(
    (tab: string) => ({ ...(TAB_PARAMS[tab] ?? TAB_PARAMS.ACCESSORY), categoryId: categoryId || undefined, brandId: brandId || undefined, condition: condition || undefined }),
    [categoryId, brandId, condition],
  );
  const list = useList<AdminProduct>('/products', params, 'ACCESSORY');
  const categories = useResource<CategoryRow[]>('/categories');
  const brands = useResource<BrandWithModels[]>('/brands');
  const costs = can('costs.read');
  const part = list.tab === 'PART';

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(search.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false });
  };

  return (
    <>
      <PageHeader
        title="Produits"
        description="Catalogue publié sur le site : smartphones, ordinateurs, téléviseurs, accessoires…"
        actions={
          can('catalog.write') && (
            <ButtonLink href={`/produits/nouveau${part ? '?type=piece' : ''}`}>
              <Plus className="size-4" /> {part ? 'Nouvelle pièce' : 'Nouveau produit'}
            </ButtonLink>
          )
        }
      />
      <Tabs
        value={list.tab}
        onChange={list.setTab}
        items={[
          { value: 'ACCESSORY', label: 'Tous les produits' },
          { value: 'PROMO', label: 'En promotion' },
          { value: 'DRAFT', label: 'Non publiés' },
          { value: 'PART', label: 'Pièces d’atelier' },
          { value: 'ARCHIVED', label: 'Archivés' },
        ]}
      />
      <div className="mt-4 rounded-md border border-line bg-surface">
        <Toolbar>
          <SearchInput value={list.q} onChange={list.setQ} placeholder="Nom, marque ou référence" className="sm:max-w-sm sm:flex-1" />
          <Select value={categoryId} onChange={(e) => setFilter('categorie', e.target.value)} aria-label="Catégorie" className="sm:w-52">
            <option value="">Toutes les catégories</option>
            {categories.data
              ?.filter((c) => c.kind === (part ? 'PART' : 'ACCESSORY'))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
          {!part && (
            <>
              <Select value={brandId} onChange={(e) => setFilter('marque', e.target.value)} aria-label="Marque" className="sm:w-44">
                <option value="">Toutes les marques</option>
                {brands.data?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
              <Select value={condition} onChange={(e) => setFilter('etat', e.target.value)} aria-label="État" className="sm:w-40">
                <option value="">Tous les états</option>
                {Object.entries(CONDITION_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </>
          )}
        </Toolbar>
        {list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : !list.data ? (
          <LoadingBlock />
        ) : (
          <>
            <DataTable
              rows={list.data.items}
              href={(p) => `/produits/${p.id}`}
              columns={[
                {
                  key: 'name',
                  header: 'Produit',
                  cell: (p) => (
                    <span className="flex items-center gap-3">
                      <span className="relative hidden size-10 shrink-0 overflow-hidden rounded-xs bg-paper-2 md:block">
                        {p.images[0]?.url ? <Image src={p.images[0].url} alt="" fill sizes="40px" className="object-cover" /> : <ImageOff className="m-auto mt-3 size-4 text-faint" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{p.name}</span>
                        <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                          <span className="font-mono">{p.sku}</span>
                          {p.brand && <span>· {p.brand.name}</span>}
                          {p.kind === 'ACCESSORY' && p.condition !== 'NEW' && <Tag>{CONDITION_LABELS[p.condition]}</Tag>}
                          {p.variants.length > 0 && <Tag>{p.variants.length} variante{p.variants.length > 1 ? 's' : ''}</Tag>}
                          {p.kind === 'ACCESSORY' && !p.published && <Tag tone="warn">Non publié</Tag>}
                          {p.featured && <Tag>Mis en avant</Tag>}
                          {p.isDemo && <Tag tone="warn">Exemple</Tag>}
                        </span>
                      </span>
                    </span>
                  ),
                },
                { key: 'category', header: 'Catégorie', cell: (p) => p.category.name },
                { key: 'stock', header: 'Disponible', cell: (p) => <StockStatus p={p} /> },
                {
                  key: 'price',
                  header: 'Prix (FCFA)',
                  align: 'right',
                  cell: (p) =>
                    p.kind === 'PART' && !p.salePrice ? (
                      '—'
                    ) : (
                      <span className="flex flex-col items-end">
                        <span className={p.discountPercent ? 'text-bad' : undefined}>{formatAmount(p.salePrice)}</span>
                        {p.discountPercent ? <s className="text-[12px] text-faint">{formatAmount(p.compareAtPrice)}</s> : null}
                      </span>
                    ),
                },
                ...(costs
                  ? [
                      { key: 'cost', header: 'Coût moyen', align: 'right' as const, cell: (p: AdminProduct) => formatAmount(p.averageCost) },
                      { key: 'value', header: 'Valeur stock', align: 'right' as const, cell: (p: AdminProduct) => formatAmount(p.stockValue) },
                    ]
                  : []),
              ]}
              empty={<EmptyState icon={Package} title="Aucun produit" className="py-12">{list.q || categoryId || brandId || condition ? 'Aucun produit ne correspond à ces filtres.' : 'Ajoutez votre premier produit.'}</EmptyState>}
            />
            <Pagination page={list.data.page} pageCount={list.data.pageCount} total={list.data.total} onPage={list.setPage} />
          </>
        )}
      </div>
    </>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <ProductsList />
    </Suspense>
  );
}
