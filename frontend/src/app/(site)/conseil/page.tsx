import type { Metadata } from 'next';
import { Advisor } from '@/components/site/advisor';
import { PageHero } from '@/components/site/page-hero';
import { serverGet } from '@/lib/server-api';
import { getCategories, getSettings } from '@/lib/settings';
import type { ShopBrand } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Conseil personnalisé',
  description: 'Quatre questions pour trouver le smartphone, l’ordinateur ou le téléviseur adapté à votre budget.',
  alternates: { canonical: '/conseil' },
};

export default async function AdvisorPage() {
  const [settings, categories, brands] = await Promise.all([getSettings(), getCategories(), serverGet<ShopBrand[]>('/shop/brands', 300)]);
  return (
    <>
      <PageHero title="Conseil" text="Quatre questions, puis un message à la boutique." image={settings.heroImageUrl} />
      <div className="container-page relative -mt-6">
        <Advisor categories={categories} brands={(brands ?? []).filter((b) => b.productCount > 0)} shopName={settings.shopName} whatsapp={settings.whatsapp} />
      </div>
    </>
  );
}
