import type { Metadata } from 'next';
import { PageHero } from '@/components/site/page-hero';
import { ReviewForm } from '@/components/site/review-form';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Donner mon avis',
  description: 'Notez votre achat avec le code reçu de la boutique.',
  alternates: { canonical: '/avis/laisser' },
  robots: { index: false, follow: true },
};

export default async function LeaveReviewPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const [{ code }, settings] = await Promise.all([searchParams, getSettings()]);
  return (
    <>
      <PageHero title="Votre avis" text="Avec le code reçu après votre achat. Une minute, sans compte." image={settings.shopImageUrl ?? settings.heroImageUrl} back="/avis" />
      <div className="container-page relative -mt-6">
        <div className="mx-auto max-w-xl rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8">
          <ReviewForm initialCode={code ?? ''} />
        </div>
      </div>
    </>
  );
}
