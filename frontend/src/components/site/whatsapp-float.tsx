'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { contactMessage, waLink } from '@/lib/whatsapp';
import { WhatsAppIcon } from './whatsapp-icon';

/** Bouton WhatsApp flottant. Sur mobile, masqué sur les fiches produit (la barre de commande le remplace). */
export function WhatsAppFloat({ whatsapp, shopName }: { whatsapp: string | null; shopName: string }) {
  const pathname = usePathname();
  const href = waLink(whatsapp, contactMessage(shopName));
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-label="Écrire à la boutique sur WhatsApp"
      className={cn(
        'fixed bottom-4 right-4 z-30 size-14 items-center justify-center rounded-full bg-wa text-white shadow-pop transition-colors hover:bg-wa-2 active:scale-[.98] md:bottom-6 md:right-6',
        pathname.startsWith('/produit/') ? 'hidden md:inline-flex' : 'inline-flex',
      )}
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
