import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Gallery } from '@/components/product/gallery';
import { PurchasePanel } from '@/components/product/purchase-panel';
import { ConditionBadge, DemoBadge } from '@/components/site/badges';
import { BackButton } from '@/components/site/back-button';
import { DemoNotice } from '@/components/site/demo-notice';
import { ProductSection } from '@/components/site/product-section';
import { CONDITION_LABELS } from '@/lib/labels';
import { serverGetOrNotFound } from '@/lib/server-api';
import { getSettings } from '@/lib/settings';
import { SITE_URL } from '@/lib/site';
import type { ProductCard, ProductDetail } from '@/lib/types';

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };
type Data = { product: ProductDetail; related: ProductCard[] };

async function load(slug: string) {
  return serverGetOrNotFound<Data>(`/shop/products/${encodeURIComponent(slug)}`);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load((await params).slug);
  if (!data || data === 'not-found') return { title: 'Produit introuvable' };
  const p = data.product;
  const description = (p.shortDescription || p.description || `${p.name} — ${CONDITION_LABELS[p.condition]}`).slice(0, 160);
  const image = p.images[0]?.url;
  return {
    title: p.brand && !p.name.toLowerCase().includes(p.brand.name.toLowerCase()) ? `${p.brand.name} ${p.name}` : p.name,
    description,
    alternates: { canonical: `/produit/${p.slug}` },
    openGraph: { title: p.name, description, type: 'website', images: image ? [{ url: image }] : undefined },
    robots: p.isDemo ? { index: false, follow: true } : undefined,
  };
}

const SCHEMA_AVAILABILITY = { IN_STOCK: 'InStock', LOW_STOCK: 'LimitedAvailability', OUT_OF_STOCK: 'OutOfStock' } as const;
const SCHEMA_CONDITION = { NEW: 'NewCondition', USED: 'UsedCondition', REFURBISHED: 'RefurbishedCondition' } as const;

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [data, settings] = await Promise.all([load(slug), getSettings()]);
  if (data === 'not-found') notFound();
  if (!data) {
    return <p className="container-page pt-40 text-center text-muted">Cette fiche est momentanément indisponible. Réessayez dans quelques instants.</p>;
  }
  const { product: p, related } = data;
  const url = `${SITE_URL}/produit/${p.slug}`;
  const images = p.images.filter((i) => i.url);
  const specRows: [string, string][] = [
    ...(p.brand ? ([['Marque', p.brand.name]] as [string, string][]) : []),
    ...p.specs.map((s) => [s.label, s.value] as [string, string]),
    ['État', CONDITION_LABELS[p.condition]],
    ['Référence', p.sku],
  ];

  const prices = p.variants.length ? p.variants.map((v) => v.price) : [p.price];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.sku,
    description: p.shortDescription || p.description || undefined,
    image: images.map((i) => i.url),
    brand: p.brand ? { '@type': 'Brand', name: p.brand.name } : undefined,
    category: p.category.name,
    itemCondition: `https://schema.org/${SCHEMA_CONDITION[p.condition]}`,
    offers:
      prices.length > 1
        ? { '@type': 'AggregateOffer', priceCurrency: 'XOF', lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length, availability: `https://schema.org/${SCHEMA_AVAILABILITY[p.availability]}`, url }
        : { '@type': 'Offer', priceCurrency: 'XOF', price: p.price, availability: `https://schema.org/${SCHEMA_AVAILABILITY[p.availability]}`, url },
  };

  return (
    <>
      {!p.isDemo && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />}
      <div className="container-page pb-20 pt-36 md:pb-0 lg:pt-28">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <BackButton fallback={`/categorie/${p.category.slug}`} />
          <nav aria-label="Fil d’Ariane" className="text-[13px] text-muted">
            <Link href={`/categorie/${p.category.slug}`} className="hover:text-ink hover:underline">
              {p.category.name}
            </Link>
          </nav>
        </div>
        <DemoNotice show={p.isDemo} className="mt-5" />

        <div className="mt-6 grid gap-6 md:grid-cols-[1.1fr_1fr] md:gap-8 lg:gap-12">
          <Gallery images={images} name={p.name} />

          <div className="rounded-3xl border border-line bg-surface p-5 sm:p-7 md:self-start">
            <div className="flex flex-wrap items-center gap-2">
              {p.brand && (
                <Link href={`/marque/${p.brand.slug}`} className="eyebrow !text-accent hover:underline">
                  {p.brand.name}
                </Link>
              )}
              <ConditionBadge condition={p.condition} />
              {p.isDemo && <DemoBadge />}
            </div>
            <h1 className="display mt-3 text-[32px] sm:text-[40px]">{p.name}</h1>
            {p.shortDescription && <p className="mt-2 text-[15px] text-ink-2">{p.shortDescription}</p>}
            <div className="mt-6 border-t border-line pt-6">
              <PurchasePanel product={p} shopName={settings.shopName} whatsapp={settings.whatsapp} phone={settings.phone} url={url} />
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-2 lg:gap-12">
          <section aria-labelledby="specs-title">
            <h2 id="specs-title" className="display text-[26px] sm:text-[32px]">
              Caractéristiques
            </h2>
            <dl className="mt-5 overflow-hidden rounded-3xl border border-line bg-surface text-[14.5px]">
              {specRows.map(([label, value], i) => (
                <div key={label} className={`grid grid-cols-[42%_1fr] gap-4 px-5 py-3 ${i % 2 ? 'bg-paper/60' : ''}`}>
                  <dt className="text-muted">{label}</dt>
                  <dd className={label === 'Référence' ? 'font-mono text-[13px]' : 'text-ink'}>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          {p.description && (
            <section aria-labelledby="desc-title">
              <h2 id="desc-title" className="display text-[26px] sm:text-[32px]">
                Description
              </h2>
              <div className="glass-light mt-5 whitespace-pre-line rounded-3xl p-6 text-[15px] leading-relaxed text-ink-2">{p.description}</div>
            </section>
          )}
        </div>
      </div>

      <ProductSection title="Produits similaires" href={`/categorie/${p.category.slug}`} items={related} order={{ shopName: settings.shopName, whatsapp: settings.whatsapp }} />
    </>
  );
}
