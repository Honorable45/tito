'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ProductForm } from '@/components/admin/product-form';
import { useCan } from '@/components/admin/session';
import { PageHeader } from '@/components/admin/ui';
import { LoadingBlock } from '@/components/ui/spinner';
import type { BrandWithModels, CatalogMeta, CategoryRow, SupplierRow } from '@/lib/admin-types';
import { useResource } from '@/lib/use-resource';

function NewProduct() {
  const kind = useSearchParams().get('type') === 'piece' ? 'PART' : 'ACCESSORY';
  const can = useCan();
  const categories = useResource<CategoryRow[]>('/categories');
  const brands = useResource<BrandWithModels[]>('/brands');
  const suppliers = useResource<SupplierRow[]>(can('suppliers.manage') ? '/suppliers' : null);
  const meta = useResource<CatalogMeta>('/shop/meta');
  if (!categories.data || !brands.data || !meta.data) return <LoadingBlock />;
  return (
    <div className="max-w-3xl">
      <PageHeader title={kind === 'PART' ? 'Nouvelle pièce détachée' : 'Nouveau produit'} back={{ href: `/produits${kind === 'PART' ? '?onglet=PART' : ''}`, label: 'Produits' }} />
      <ProductForm kind={kind} categories={categories.data} brands={brands.data} suppliers={suppliers.data ?? []} meta={meta.data} />
    </div>
  );
}

export default function NewProductPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <NewProduct />
    </Suspense>
  );
}
