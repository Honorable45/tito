import type { Metadata } from 'next';
import { PageHero } from '@/components/site/page-hero';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = { title: 'Mentions légales', alternates: { canonical: '/mentions-legales' } };

export default async function LegalPage() {
  const s = await getSettings();
  const address = [s.addressLine, s.city, s.country].filter(Boolean).join(', ');
  const rows: [string, string | null][] = [
    ['Nom commercial', s.shopName],
    ['Raison sociale', s.legal.legalName],
    ['Forme juridique', s.legal.legalForm],
    ['RCCM', s.legal.registrationNumber],
    ['Identifiant fiscal (NIF)', s.legal.taxId],
    ['Adresse', address || null],
    ['Téléphone', s.phone],
    ['E-mail', s.email],
    ['Directeur de la publication', s.legal.publicationDirector],
    ['Hébergement', s.legal.hostingProvider],
  ];
  return (
    <>
      <PageHero title="Mentions légales" />
      <div className="container-page mt-10 max-w-3xl space-y-6">
        <dl className="overflow-hidden rounded-3xl border border-line bg-surface text-[14.5px]">
          {rows
            .filter((r): r is [string, string] => Boolean(r[1]))
            .map(([label, value], i) => (
              <div key={label} className={`grid gap-1 px-5 py-3 sm:grid-cols-[38%_1fr] sm:gap-4 ${i % 2 ? 'bg-paper/60' : ''}`}>
                <dt className="text-muted">{label}</dt>
                <dd className="whitespace-pre-line">{value}</dd>
              </div>
            ))}
        </dl>
        <div className="glass-light space-y-3 rounded-3xl p-6 text-[14.5px] text-ink-2">
          <p>Prix en francs CFA (XOF). Une commande passée par WhatsApp n’est définitive qu’après confirmation de la disponibilité par la boutique. Aucun paiement n’est collecté sur ce site.</p>
          <p>Le site ne demande ni compte ni formulaire de commande. Les échanges ont lieu sur WhatsApp, selon les conditions de ce service.</p>
        </div>
      </div>
    </>
  );
}
