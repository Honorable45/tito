import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CatalogView } from '@/components/catalog/catalog-view';
import { readParams, type RawParams } from '@/lib/catalog-params';
import { serverGet } from '@/lib/server-api';
import type { ShopBrand } from '@/lib/types';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawParams> };

async function find(slug: string) {
  return ((await serverGet<ShopBrand[]>('/shop/brands', 300)) ?? []).find((b) => b.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const brand = await find((await params).slug);
  if (!brand) return { title: 'Marque introuvable' };
  return {
    title: `${brand.name} : smartphones, ordinateurs et accessoires`,
    description: `Produits ${brand.name} : prix en FCFA, neufs, d’occasion ou reconditionnés, commande par WhatsApp.`,
    alternates: { canonical: `/marque/${brand.slug}` },
  };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  const brand = await find(slug);
  if (!brand) notFound();
  const query = readParams(raw);
  delete query.marque;
  return (
    <CatalogView
      title={brand.name}
      back="/catalogue"
      ctx={{ base: `/marque/${brand.slug}`, params: query, fixed: { brand: brand.slug } }}
    />
  );
}
