import { PenLine } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/site/page-hero';
import { ReviewList } from '@/components/site/review-list';
import { Stars } from '@/components/site/stars';
import { serverGet } from '@/lib/server-api';
import { getSettings } from '@/lib/settings';
import type { ReviewsPage } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Avis clients',
  description: 'Avis des clients, publiés avec un code remis après l’achat.',
  alternates: { canonical: '/avis' },
};

export default async function ReviewsPageView({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [data, settings] = await Promise.all([serverGet<ReviewsPage>(`/reviews/public?page=${page}&pageSize=12`, 120), getSettings()]);
  const s = data?.summary;
  const has = Boolean(s && s.count > 0 && s.average !== null);

  return (
    <>
      <PageHero title="Avis clients" image={settings.shopImageUrl ?? settings.heroImageUrl}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
          {has && s && (
            <div className="glass flex items-center gap-5 rounded-3xl px-6 py-4">
              <span className="display num text-[52px] leading-none">{s.average!.toLocaleString('fr-FR')}</span>
              <span>
                <Stars value={s.average!} size="md" />
                <span className="mt-1 block text-[13.5px] text-white/75">
                  {s.count} avis · {s.verifiedCount} vérifiés
                </span>
              </span>
            </div>
          )}
          <Link href="/avis/laisser" className="glass inline-flex h-14 items-center justify-center gap-2 self-start rounded-full px-7 text-[15.5px] font-medium text-white transition-colors hover:bg-white/25 sm:self-center">
            <PenLine className="size-4" aria-hidden="true" /> Laisser un avis
          </Link>
        </div>
      </PageHero>

      <div className="container-page mt-10">
        {!has || !data ? (
          <div className="glass-light mx-auto max-w-lg rounded-3xl p-10 text-center">
            <p className="display text-[26px]">Aucun avis pour le moment</p>
            <p className="mt-2 text-[15px] text-muted">Vous êtes client ? Votre avis aide les autres.</p>
            <Link href="/avis/laisser" className="glass-dark mt-6 inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-medium text-white">
              <PenLine className="size-4" aria-hidden="true" /> Donner mon avis
            </Link>
          </div>
        ) : (
          <>
            <ReviewList reviews={data.items} shopName={settings.shopName} />
            {data.pageCount > 1 && (
              <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3 text-[14px]">
                {page > 1 && <Link href={`/avis?page=${page - 1}`} className="glass-light rounded-full px-5 py-3 font-medium">← Plus récents</Link>}
                <span className="num text-muted">{page} / {data.pageCount}</span>
                {page < data.pageCount && <Link href={`/avis?page=${page + 1}`} className="glass-light rounded-full px-5 py-3 font-medium">Plus anciens →</Link>}
              </nav>
            )}
          </>
        )}
      </div>
    </>
  );
}
