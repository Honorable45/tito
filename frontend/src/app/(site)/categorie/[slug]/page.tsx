import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CatalogView } from '@/components/catalog/catalog-view';
import { readParams, type RawParams } from '@/lib/catalog-params';
import { getCategories } from '@/lib/settings';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawParams> };

async function find(slug: string) {
  return (await getCategories()).find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await find((await params).slug);
  if (!category) return { title: 'Catégorie introuvable' };
  return {
    title: category.name,
    description: category.description ?? `${category.name} : prix en FCFA, état indiqué, commande par WhatsApp.`,
    alternates: { canonical: `/categorie/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  const category = await find(slug);
  if (!category) notFound();
  const query = readParams(raw);
  delete query.categorie;
  return (
    <CatalogView
      title={category.name}
      intro={category.description}
      back="/catalogue"
      ctx={{ base: `/categorie/${category.slug}`, params: query, fixed: { category: category.slug } }}
    />
  );
}
