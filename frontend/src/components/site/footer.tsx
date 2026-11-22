import { Mail, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import { formatPhone, telHref } from '@/lib/format';
import type { PublicSettings } from '@/lib/types';
import { contactMessage, waLink } from '@/lib/whatsapp';
import { Logo } from './logo';
import { OpeningHours } from './opening-hours';
import { SocialLinks } from './social';
import { WhatsAppIcon } from './whatsapp-icon';

const LINKS = [
  ['/catalogue', 'Catalogue'],
  ['/catalogue?promo=1', 'Promotions'],
  ['/conseil', 'Conseil personnalisé'],
  ['/avis', 'Avis clients'],
  ['/boutique', 'La boutique'],
] as const;

export function Footer({ settings: s }: { settings: PublicSettings }) {
  const wa = waLink(s.whatsapp, contactMessage(s.shopName));
  const address = [s.addressLine, s.city, s.country].filter(Boolean).join(', ');
  const link = 'text-paper/85 hover:text-white hover:underline';
  return (
    <footer className="border-t border-white/10 bg-navy text-[14px] text-paper/85">
      <div className="container-page grid gap-10 py-14 md:grid-cols-3">
        <div>
          <Logo name={s.shopName} invert />
          {s.tagline && <p className="mt-4 max-w-xs">{s.tagline}</p>}
          <SocialLinks settings={s} className="mt-5" />
        </div>
        <nav aria-label="Liens du pied de page">
          <p className="eyebrow mb-4 text-paper/50">Rubriques</p>
          <ul className="space-y-2.5">
            {LINKS.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className={link}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="eyebrow mb-4 text-paper/50">Nous trouver</p>
          <ul className="space-y-2.5">
            {address && (
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-paper/50" aria-hidden="true" /> {address}
              </li>
            )}
            {s.phone && (
              <li>
                <a href={telHref(s.phone)} className={`inline-flex items-center gap-2.5 ${link}`}>
                  <Phone className="size-4 text-paper/50" aria-hidden="true" /> {formatPhone(s.phone)}
                </a>
              </li>
            )}
            {wa && (
              <li>
                <a href={wa} target="_blank" rel="noopener" className={`inline-flex items-center gap-2.5 ${link}`}>
                  <WhatsAppIcon className="size-4 text-paper/50" /> WhatsApp
                </a>
              </li>
            )}
            {s.email && (
              <li>
                <a href={`mailto:${s.email}`} className={`inline-flex items-center gap-2.5 ${link}`}>
                  <Mail className="size-4 text-paper/50" aria-hidden="true" /> {s.email}
                </a>
              </li>
            )}
          </ul>
          {s.openingHours.length > 0 && (
            <div className="mt-6 [&_dt]:text-paper/55">
              <OpeningHours hours={s.openingHours} />
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-1 py-5 text-[12.5px] text-paper/50 sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {s.legal.legalName || s.shopName} · Prix en FCFA
          </p>
          <Link href="/mentions-legales" className="hover:text-white">
            Mentions légales
          </Link>
        </div>
      </div>
    </footer>
  );
}
