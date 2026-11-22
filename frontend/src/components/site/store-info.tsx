import { MapPin, Navigation, Phone } from 'lucide-react';
import { formatPhone, telHref } from '@/lib/format';
import type { PublicSettings } from '@/lib/types';
import { contactMessage, waLink } from '@/lib/whatsapp';
import { OpeningHours } from './opening-hours';
import { WhatsAppIcon } from './whatsapp-icon';

export function directionsUrl(s: PublicSettings) {
  if (s.mapUrl) return s.mapUrl;
  if (s.location) return `https://www.google.com/maps/dir/?api=1&destination=${s.location.latitude},${s.location.longitude}`;
  const address = [s.addressLine, s.city, s.country].filter(Boolean).join(', ');
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
}

/** Boutons de contact : WhatsApp (vert plein), appel et itinéraire. `tone="dark"` sur photo. */
export function ContactButtons({ settings: s, tone = 'light' }: { settings: PublicSettings; tone?: 'light' | 'dark' }) {
  const wa = waLink(s.whatsapp, contactMessage(s.shopName));
  const directions = directionsUrl(s);
  const secondary = tone === 'dark' ? 'glass text-white hover:bg-white/25' : 'glass-dark text-white hover:bg-navy';
  return (
    <div className="flex flex-wrap gap-2.5">
      {wa && (
        <a href={wa} target="_blank" rel="noopener" className="inline-flex h-12 items-center gap-2 rounded-full bg-wa px-5 text-[15px] font-medium text-white transition-colors hover:bg-wa-2 active:scale-[.98]">
          <WhatsAppIcon className="size-[18px]" /> WhatsApp
        </a>
      )}
      {s.phone && (
        <a href={telHref(s.phone)} className={`inline-flex h-12 items-center gap-2 rounded-full px-5 text-[15px] font-medium transition-colors active:scale-[.98] ${secondary}`}>
          <Phone className="size-4" aria-hidden="true" /> {formatPhone(s.phone)}
        </a>
      )}
      {directions && (
        <a href={directions} target="_blank" rel="noopener" className={`inline-flex h-12 items-center gap-2 rounded-full px-5 text-[15px] font-medium transition-colors active:scale-[.98] ${secondary}`}>
          <Navigation className="size-4" aria-hidden="true" /> Itinéraire
        </a>
      )}
    </div>
  );
}

/** Encadré coordonnées et horaires (seules les informations renseignées s'affichent). */
export function StoreCard({ settings: s }: { settings: PublicSettings }) {
  const address = [s.addressLine, s.city, s.country].filter(Boolean).join(', ');
  const empty = !address && !s.phone && !s.whatsapp && !s.openingHours.length;
  return (
    <div className="glass-light rounded-3xl p-6">
      <p className="eyebrow">Coordonnées</p>
      {empty && <p className="mt-3 text-[14.5px] text-muted">Coordonnées bientôt disponibles.</p>}
      {address && (
        <p className="mt-3 flex gap-2.5 text-[15px]">
          <MapPin className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" /> {address}
        </p>
      )}
      {s.checkout.deliveryEnabled && <p className="mt-2 text-[14px] text-muted">Livraison{s.checkout.deliveryArea ? ` : ${s.checkout.deliveryArea}` : ' possible'}</p>}
      {s.openingHours.length > 0 && (
        <div className="mt-5 border-t border-line pt-5">
          <p className="eyebrow mb-3">Horaires</p>
          <OpeningHours hours={s.openingHours} />
        </div>
      )}
      <div className="mt-6">
        <ContactButtons settings={s} />
      </div>
    </div>
  );
}
