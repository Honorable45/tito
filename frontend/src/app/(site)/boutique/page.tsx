import type { Metadata } from 'next';
import { PageHero } from '@/components/site/page-hero';
import { ContactButtons, StoreCard } from '@/components/site/store-info';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'La boutique',
  description: 'Adresse, horaires, téléphone, WhatsApp et itinéraire.',
  alternates: { canonical: '/boutique' },
};

const STEPS = ['Choisissez un produit et ses options', 'Envoyez le message WhatsApp prérempli', 'La boutique confirme la disponibilité'];

export default async function StorePage() {
  const s = await getSettings();
  const loc = s.location;
  // Carte OpenStreetMap (sans clé ni traceur) centrée sur la position de la boutique.
  const map = loc
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${loc.longitude - 0.006}%2C${loc.latitude - 0.004}%2C${loc.longitude + 0.006}%2C${loc.latitude + 0.004}&layer=mapnik&marker=${loc.latitude}%2C${loc.longitude}`
    : null;
  return (
    <>
      <PageHero title="La boutique" text={s.aboutText || s.tagline} image={s.shopImageUrl ?? s.heroImageUrl}>
        <ContactButtons settings={s} tone="dark" />
      </PageHero>
      <div className="container-page mt-10 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <StoreCard settings={s} />
        <div className="space-y-6">
          {map && (
            <div className="overflow-hidden rounded-3xl border border-line bg-paper-2">
              <iframe title={`Plan d’accès à ${s.shopName}`} src={map} className="aspect-[4/3] w-full sm:aspect-[16/10]" loading="lazy" referrerPolicy="no-referrer" />
            </div>
          )}
          <div id="commander" className="glass-light rounded-3xl p-6">
            <p className="eyebrow">Commander</p>
            <ol className="mt-4 space-y-3">
              {STEPS.map((step, i) => (
                <li key={step} className="flex items-center gap-3 text-[15px]">
                  <span className="num inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-navy font-mono text-[12px] text-white">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}
