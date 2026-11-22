import { ArrowRight, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import heroPhoto from '../../../public/brand/hero-boutique.jpg';
import logo from '../../../public/brand/titotrade-mark-transparent.png';
import { CategoryTiles } from '@/components/site/category-tiles';
import { LOGO_ASSEMBLED_AT, LogoAssemble } from '@/components/site/logo-assemble';
import { DemoNotice } from '@/components/site/demo-notice';
import { ProductSection, SectionHeading } from '@/components/site/product-section';
import { Reveal, revealEnd } from '@/components/site/reveal';
import { ReviewList } from '@/components/site/review-list';
import { SearchBox } from '@/components/site/search-box';
import { SocialLinks } from '@/components/site/social';
import { ContactButtons } from '@/components/site/store-info';
import { GROUP_TO_PARAM } from '@/lib/labels';
import { serverGet } from '@/lib/server-api';
import { getSettings } from '@/lib/settings';
import type { HomeData, ReviewsPage } from '@/lib/types';

export const revalidate = 60;

/** Accroche : 7 mots, 3 verbes. */
const TAGLINE = 'Choisir, comparer et commander en toute confiance';

const QUICK = [
  ['/catalogue?rayon=smartphones', 'Smartphones'],
  ['/catalogue?rayon=ordinateurs', 'Ordinateurs'],
  ['/catalogue?rayon=ecrans', 'Téléviseurs'],
] as const;

export default async function HomePage() {
  const [home, settings, reviews] = await Promise.all([serverGet<HomeData>('/shop/home'), getSettings(), serverGet<ReviewsPage>('/reviews/public?pageSize=3', 300)]);
  const order = { shopName: settings.shopName, whatsapp: settings.whatsapp };
  const name = settings.shopName.replace(/([a-zà-ÿ])([A-ZÀ-Ý])/g, '$1 $2');
  // Photo de la boutique par défaut ; une photo d'accueil téléversée dans l'administration la remplace.
  const heroImage = settings.heroImageUrl ?? heroPhoto.src;
  const heroAlt = settings.heroImageUrl ? (settings.heroImageAlt ?? '') : 'iPhone présentés en main devant les rayons de la boutique';
  const taglineEnd = revealEnd(TAGLINE, LOGO_ASSEMBLED_AT - 300);
  const all = home ? [...home.latest, ...home.bestSellers.items, ...home.promotions, ...home.groups.flatMap((g) => g.items)] : [];
  const contactImage = settings.shopImageUrl ?? home?.banners[1]?.imageUrl ?? heroImage;

  return (
    <>
      {/* Accueil : photo plein cadre, voile uni, nom et accroche révélés mot par mot. */}
      <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-navy text-white">
        <Image src={heroImage} alt={heroAlt} fill priority sizes="100vw" className="object-cover object-[center_30%]" />
        <span className="absolute inset-0 bg-navy/55" aria-hidden="true" />
        <div className="relative px-6 pb-20 pt-44 text-center lg:pt-32">
          {/* Le logo se forme à partir de pièces détachées ; le nom reste dans le titre pour les lecteurs d'écran et le SEO. */}
          <h1 className="sr-only">{name}</h1>
          <LogoAssemble src={logo.src} label={name} />
          <p className="mx-auto mt-10 max-w-2xl font-serif text-[22px] italic leading-snug text-white/90 sm:text-[30px]">
            <Reveal text={TAGLINE} start={LOGO_ASSEMBLED_AT - 300} />
          </p>
          <nav aria-label="Rayons" className="reveal-word mt-12 flex flex-wrap justify-center gap-3" style={{ animationDelay: `${taglineEnd}ms` }}>
            {QUICK.map(([href, label]) => (
              <Link key={href} href={href} className="glass inline-flex h-12 items-center rounded-full px-7 text-[15.5px] font-medium text-white transition hover:-translate-y-0.5 hover:bg-white/25 active:scale-[.98]">
                {label}
              </Link>
            ))}
          </nav>
          <div className="reveal-word mt-6" style={{ animationDelay: `${taglineEnd + 250}ms` }}>
            <SocialLinks settings={settings} className="justify-center" />
          </div>
        </div>
      </section>

      {/* Recherche, en verre clair, à cheval sur la photo. */}
      <div className="container-page relative z-10 -mt-8">
        <div className="glass-light mx-auto max-w-3xl rounded-full p-1.5">
          <SearchBox />
        </div>
      </div>

      {!home && <p className="container-page mt-16 text-center text-muted">Le catalogue est momentanément indisponible.</p>}

      {home && (
        <>
          {all.some((p) => p.isDemo) && (
            <div className="container-page mt-10">
              <DemoNotice show className="mx-auto max-w-3xl" />
            </div>
          )}

          {home.categories.length > 0 && (
            <section className="container-page mt-16 sm:mt-24">
              <SectionHeading title="Catégories" href="/catalogue" linkLabel="Tout le catalogue" />
              <CategoryTiles categories={home.categories} />
            </section>
          )}

          <ProductSection title="Promotions" eyebrow="Prix réduits" href="/catalogue?promo=1" items={home.promotions} order={order} />
          <ProductSection title="Nouveautés" href="/catalogue" items={home.latest} order={order} />
          <ProductSection title={home.bestSellers.source === 'sales' ? 'Meilleures ventes' : 'Notre sélection'} items={home.bestSellers.items} order={order} />
          {home.groups.map((g) => (
            <ProductSection key={g.key} title={g.title} href={`/catalogue?rayon=${GROUP_TO_PARAM[g.key]}`} items={g.items} order={order} />
          ))}

          {/* À la une : bannières de l'administration, photo et panneau de verre. */}
          {home.banners.length > 0 && (
            <section className="container-page mt-16 sm:mt-24">
              <ul className="grid gap-4 md:grid-cols-2">
                {home.banners.slice(0, 4).map((b) => (
                  <li key={b.id} className="relative flex min-h-[320px] items-end overflow-hidden rounded-3xl bg-navy p-4 text-white sm:p-5">
                    {b.imageUrl && <Image src={b.imageUrl} alt={b.imageAlt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />}
                    <span className="absolute inset-0 bg-navy/40" aria-hidden="true" />
                    <div className="glass relative w-full rounded-3xl p-5">
                      <h2 className="display text-[26px] sm:text-[30px]">{b.title}</h2>
                      {b.subtitle && <p className="mt-1.5 text-[14.5px] text-white/80">{b.subtitle}</p>}
                      {b.linkUrl && (
                        <Link href={b.linkUrl} className="glass-dark mt-4 inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-medium text-white transition hover:bg-navy active:scale-[.98]">
                          {b.ctaLabel || 'Découvrir'} <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {reviews && reviews.items.length > 0 && (
        <section className="container-page mt-16 sm:mt-24">
          <SectionHeading title="Avis clients" href="/avis" linkLabel="Tous les avis" />
          <ReviewList reviews={reviews.items} shopName={settings.shopName} />
        </section>
      )}

      {/* Nous trouver : photo plein cadre, voile, panneau de verre. */}
      <section className="relative -mb-16 mt-16 overflow-hidden bg-navy text-white sm:-mb-24 sm:mt-24">
        {contactImage && <Image src={contactImage} alt="" fill sizes="100vw" className="object-cover" />}
        <span className="absolute inset-0 bg-navy/[.62]" aria-hidden="true" />
        <div className="container-page relative py-20 sm:py-28">
          <div className="glass max-w-xl rounded-3xl p-6 sm:p-8">
            <h2 className="display text-[32px] sm:text-[44px]">Une question ?</h2>
            <p className="mt-2 text-[15.5px] text-white/80">Disponibilité, conseil, retrait ou livraison.</p>
            <div className="mt-6">
              <ContactButtons settings={settings} tone="dark" />
            </div>
            <Link href="/conseil" className="mt-5 inline-flex items-center gap-1.5 text-[14.5px] font-medium text-white underline">
              <Search className="size-4" aria-hidden="true" /> Être conseillé pour choisir
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
