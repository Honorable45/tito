import type { Metadata } from 'next';
import { CatalogView } from '@/components/catalog/catalog-view';
import { readParams, type RawParams } from '@/lib/catalog-params';
import { GROUP_PARAM } from '@/lib/labels';

function titleFor(p: ReturnType<typeof readParams>) {
  if (p.q) return `Résultats pour « ${p.q} »`;
  if (p.promo === '1') return 'Promotions';
  if (p.rayon && GROUP_PARAM[p.rayon]) return GROUP_PARAM[p.rayon].title;
  return 'Catalogue';
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawParams> }): Promise<Metadata> {
  const p = readParams(await searchParams);
  return {
    title: titleFor(p),
    description: 'Smartphones, ordinateurs, téléviseurs, écrans et accessoires : prix en FCFA, état indiqué, commande par WhatsApp.',
    alternates: { canonical: '/catalogue' },
    // Les recherches libres ne sont pas indexées (contenu dupliqué).
    robots: p.q ? { index: false, follow: true } : undefined,
  };
}

export default async function CataloguePage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const params = readParams(await searchParams);
  const raw = await searchParams;
  delete (params as Record<string, string>).recherche;
  return <CatalogView title={titleFor(params)} ctx={{ base: '/catalogue', params, fixed: {} }} autoFocusSearch={raw.recherche === '1'} />;
}
