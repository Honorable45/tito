'use client';
import { useSiteUrl } from '@/lib/site-url';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';
import { ImageManager } from '@/components/admin/image-manager';
import { ProductForm } from '@/components/admin/product-form';
import { useCan } from '@/components/admin/session';
import { StockStatus } from '@/components/admin/stock-status';
import { VariantsPanel } from '@/components/admin/variants-panel';
import { ConfirmDialog, DetailList, Metric, PageHeader, Panel } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/empty-state';
import { LoadingBlock } from '@/components/ui/spinner';
import { Tag } from '@/components/ui/status';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import type { AdminProduct, BrandWithModels, CatalogMeta, CategoryRow, SupplierRow } from '@/lib/admin-types';
import { cn } from '@/lib/cn';
import { formatDateTime, formatPrice } from '@/lib/format';
import { CONDITION_LABELS, MOVEMENT_TYPES } from '@/lib/labels';
import { useResource } from '@/lib/use-resource';

interface Movement {
  id: string;
  type: string;
  quantity: number;
  unitCost: number | null;
  stockAfter: number;
  reason: string | null;
  createdAt: string;
  user: { name: string } | null;
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const siteUrl = useSiteUrl();
  const { id } = use(params);
  const can = useCan();
  const { notify } = useToast();
  const { data: p, error, reload, setData } = useResource<AdminProduct>(`/products/${id}`);
  const movements = useResource<{ items: Movement[] }>(can('stock.read') ? `/inventory/movements?productId=${id}&pageSize=15` : null);
  const categories = useResource<CategoryRow[]>(can('catalog.write') ? '/categories' : null);
  const brands = useResource<BrandWithModels[]>(can('catalog.write') ? '/brands' : null);
  const suppliers = useResource<SupplierRow[]>(can('suppliers.manage') ? '/suppliers' : null);
  const meta = useResource<CatalogMeta>('/shop/meta');
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!p) return <LoadingBlock />;

  const toggleArchive = async () => {
    try {
      setData(await api.post<AdminProduct>(`/products/${p.id}/${p.status === 'ACTIVE' ? 'archive' : 'restore'}`));
      notify(p.status === 'ACTIVE' ? 'Article archivé : il n’est plus proposé à la vente.' : 'Article réactivé.');
      setArchiving(false);
    } catch (err) {
      notify(errorMessage(err), 'bad');
    }
  };

  const togglePublished = async () => {
    try {
      setData(await api.patch<AdminProduct>(`/products/${p.id}`, { published: !p.published }));
      notify(p.published ? 'Produit retiré du site.' : 'Produit publié sur le site.');
    } catch (err) {
      notify(errorMessage(err), 'bad');
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/products/${p.id}`);
      notify('Produit supprimé.');
      router.push('/produits');
    } catch (err) {
      setDeleting(false);
      notify(errorMessage(err), 'bad');
    }
  };

  const editable = can('catalog.write');
  return (
    <>
      <PageHeader
        back={{ href: `/produits${p.kind === 'PART' ? '?onglet=PART' : ''}`, label: 'Produits' }}
        title={p.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{p.sku}</span>
            <span>· {p.category.name}</span>
            {p.brand && <span>· {p.brand.name}</span>}
            {p.kind === 'ACCESSORY' && <Tag>{CONDITION_LABELS[p.condition]}</Tag>}
            {p.discountPercent ? <Tag tone="bad">Promo −{p.discountPercent} %</Tag> : null}
            {p.kind === 'ACCESSORY' && !p.published && <Tag tone="warn">Non publié</Tag>}
            {p.kind === 'PART' && <Tag>Pièce détachée</Tag>}
            {p.status === 'ARCHIVED' && <Tag tone="bad">Archivé</Tag>}
            {p.isDemo && <Tag tone="warn">Démo</Tag>}
            {p.kind === 'ACCESSORY' && p.status === 'ACTIVE' && p.published && (
              <Link href={`${siteUrl}/produit/${p.slug}`} target="_blank" className="text-accent underline">
                Voir sur le site
              </Link>
            )}
          </span>
        }
        actions={
          editable && (
            <div className="flex flex-wrap gap-2">
              {p.kind === 'ACCESSORY' && p.status === 'ACTIVE' && (
                <Button variant={p.published ? 'ghost' : 'primary'} size="sm" onClick={togglePublished}>
                  {p.published ? 'Dépublier' : 'Publier'}
                </Button>
              )}
              <Button variant={p.status === 'ACTIVE' ? 'ghost' : 'secondary'} size="sm" onClick={() => (p.status === 'ACTIVE' ? setArchiving(true) : toggleArchive())}>
                {p.status === 'ACTIVE' ? 'Archiver' : 'Réactiver'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleting(true)}>
                Supprimer
              </Button>
            </div>
          )
        }
      />

      <section className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4">
        <div className="bg-surface px-5 py-4">
          <p className="text-[12.5px] text-muted">Disponible</p>
          <div className="mt-2 text-[20px]">
            <StockStatus p={p} />
          </div>
          <p className="mt-1 text-[12.5px] text-muted">
            {p.stockQuantity} en stock · seuil {p.lowStockThreshold}
          </p>
        </div>
        <div className="bg-surface px-5 py-4">
          <Metric label="Prix de vente" value={formatPrice(p.salePrice)} />
        </div>
        {p.averageCost !== null && (
          <>
            <div className="bg-surface px-5 py-4">
              <Metric label="Coût moyen pondéré" value={formatPrice(p.averageCost)} note={p.salePrice ? `Marge unitaire ${formatPrice(p.unitMargin)}` : undefined} tone={p.unitMargin !== null && p.unitMargin < 0 && p.salePrice > 0 ? 'bad' : undefined} />
            </div>
            <div className="bg-surface px-5 py-4">
              <Metric label="Valeur du stock" value={formatPrice(p.stockValue)} note="Quantité × coût moyen" />
            </div>
          </>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          {p.kind === 'ACCESSORY' && (
            <Panel title="Photos">
              {editable ? <ImageManager images={p.images} endpoint={`/products/${p.id}`} max={10} onChange={reload} reorder /> : <p className="text-[13.5px] text-muted">{p.images.length} photo(s).</p>}
            </Panel>
          )}
          {p.kind === 'ACCESSORY' && editable && meta.data && <VariantsPanel product={p} meta={meta.data} onChange={setData} />}
          {editable ? (
            categories.data && brands.data && meta.data ? <ProductForm key={p.updatedAt} product={p} kind={p.kind} categories={categories.data} brands={brands.data} suppliers={suppliers.data ?? []} meta={meta.data} /> : <LoadingBlock />
          ) : (
            <Panel title="Fiche">
              <DetailList
                items={[
                  ['Description', p.description || null],
                  ['Caractéristiques', p.specs.length ? p.specs.map((x) => `${x.label} : ${x.value}`).join(' · ') : null],
                  ['Variantes', p.variants.length ? p.variants.map((v) => v.label).join(', ') : null],
                  ['Compatibilité', p.compatibility.length ? p.compatibility.map((c) => `${c.brand}${c.model ? ` ${c.model}` : ''}`).join(', ') : 'Universel'],
                  ['Fournisseur', p.supplier?.name],
                ]}
              />
            </Panel>
          )}
        </div>
        {movements.data && (
          <Panel
            title="Derniers mouvements"
            className="lg:col-span-5"
            bodyClassName=""
            actions={
              <Link href={`/stocks?onglet=movements&produit=${p.id}`} className="text-[13px] text-accent hover:underline">
                Tout voir
              </Link>
            }
          >
            {movements.data.items.length === 0 ? (
              <p className="px-5 py-6 text-[13.5px] text-muted">Aucun mouvement.</p>
            ) : (
              <ul className="divide-y divide-line">
                {movements.data.items.map((m) => (
                  <li key={m.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-[13.5px] sm:px-5">
                    <div className="min-w-0">
                      <p>{MOVEMENT_TYPES[m.type]}</p>
                      <p className="truncate text-[12px] text-muted">
                        {formatDateTime(m.createdAt)}
                        {m.user ? ` · ${m.user.name}` : ''}
                        {m.reason ? ` · ${m.reason}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn('num font-medium', m.quantity > 0 ? 'text-ok' : 'text-ink')}>
                        {m.quantity > 0 ? '+' : '−'}
                        {Math.abs(m.quantity)}
                      </p>
                      <p className="num text-[12px] text-muted">→ {m.stockAfter}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>

      <ConfirmDialog open={deleting} onClose={() => setDeleting(false)} onConfirm={remove} title="Supprimer définitivement ce produit ?" confirmLabel="Supprimer">
        La fiche, ses photos et ses variantes sont supprimées. Si le produit a déjà un historique (stock, ventes, achats), la suppression est refusée : archivez-le alors.
      </ConfirmDialog>

      <ConfirmDialog open={archiving} onClose={() => setArchiving(false)} onConfirm={toggleArchive} title="Archiver cet article ?" confirmLabel="Archiver">
        L’article disparaît du site et de la caisse. Son historique (ventes, mouvements) est conservé et il peut être réactivé.
      </ConfirmDialog>
    </>
  );
}
