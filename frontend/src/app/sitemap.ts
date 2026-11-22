import type { MetadataRoute } from 'next';
import { serverGet } from '@/lib/server-api';
import { SITE_URL } from '@/lib/site';
import type { CatalogPage, ShopBrand, ShopCategory } from '@/lib/types';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, brands, first] = await Promise.all([
    serverGet<ShopCategory[]>('/shop/categories', 3600),
    serverGet<ShopBrand[]>('/shop/brands', 3600),
    serverGet<CatalogPage>('/shop/products?pageSize=48', 3600),
  ]);
  // Toutes les pages du catalogue (48 produits par page), hors fiches d'exemple.
  const rest = first && first.pageCount > 1
    ? await Promise.all(Array.from({ length: Math.min(first.pageCount, 50) - 1 }, (_, i) => serverGet<CatalogPage>(`/shop/products?pageSize=48&page=${i + 2}`, 3600)))
    : [];
  const products = [first, ...rest].flatMap((p) => p?.items ?? []).filter((p) => !p.isDemo);
  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/catalogue`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/boutique`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/conseil`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/avis`, changeFrequency: 'weekly', priority: 0.5 },
    ...(categories ?? []).filter((c) => c.productCount > 0).map((c) => ({ url: `${SITE_URL}/categorie/${c.slug}`, changeFrequency: 'daily' as const, priority: 0.8 })),
    ...(brands ?? []).filter((b) => b.productCount > 0).map((b) => ({ url: `${SITE_URL}/marque/${b.slug}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...products.map((p) => ({ url: `${SITE_URL}/produit/${p.slug}`, changeFrequency: 'daily' as const, priority: 0.7 })),
  ];
}
