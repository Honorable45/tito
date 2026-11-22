'use client';

import { LayoutGrid, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { contactMessage, waLink } from '@/lib/whatsapp';
import { Logo } from './logo';
import { WhatsAppIcon } from './whatsapp-icon';

const NAV = [
  { href: '/', label: 'Accueil' },
  { href: '/conseil', label: 'Conseil' },
  { href: '/avis', label: 'Avis' },
];

/**
 * En-tête flottant en verre dépoli. Tout reste visible, sans menu caché :
 * sur mobile, les rubriques occupent une seconde ligne d'onglets de largeur égale.
 */
export function Header({ shopName, logoUrl, whatsapp }: { shopName: string; logoUrl: string | null; whatsapp: string | null }) {
  const pathname = usePathname();
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const catalogActive = /^\/(catalogue|categorie|marque|produit)/.test(pathname);
  const wa = waLink(whatsapp, contactMessage(shopName));

  const links = (compact: boolean) =>
    NAV.map((item) => (
      <li key={item.href} className={compact ? 'flex-1' : undefined}>
        <Link
          href={item.href}
          aria-current={active(item.href) ? 'page' : undefined}
          className={cn(
            'inline-flex items-center justify-center rounded-full transition-colors',
            compact ? 'h-9 w-full px-1 text-[13px]' : 'h-10 px-4 text-[14.5px]',
            active(item.href) ? 'bg-navy font-medium text-white' : 'text-ink-2 hover:bg-white/80 hover:text-ink',
          )}
        >
          {item.label}
        </Link>
      </li>
    ));

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5">
      <div className="glass-light mx-auto max-w-6xl rounded-[28px] lg:rounded-full">
        <div className="flex h-14 items-center justify-between gap-2 pl-3 pr-2 sm:pl-4">
          <Logo name={shopName} logoUrl={logoUrl} compact />
          <nav aria-label="Navigation principale" className="hidden lg:block">
            <ul className="flex items-center gap-0.5">{links(false)}</ul>
          </nav>
          <div className="flex items-center gap-1.5">
            <Link href="/catalogue?recherche=1" aria-label="Rechercher un produit" className="inline-flex size-10 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-white hover:text-ink">
              <Search className="size-[18px]" strokeWidth={1.8} />
            </Link>
            <Link
              href="/catalogue"
              aria-current={catalogActive ? 'page' : undefined}
              className={cn('inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-medium text-white transition-colors active:scale-[.98]', catalogActive ? 'bg-navy' : 'glass-dark hover:bg-navy')}
            >
              <LayoutGrid className="size-[17px]" strokeWidth={1.8} />
              Catalogue
            </Link>
            {wa && (
              <a href={wa} target="_blank" rel="noopener" aria-label="Écrire sur WhatsApp" className="inline-flex h-10 items-center gap-2 rounded-full bg-wa px-3 text-[14px] font-medium text-white transition-colors hover:bg-wa-2 active:scale-[.98] sm:px-4">
                <WhatsAppIcon className="size-[18px]" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}
          </div>
        </div>
        <nav aria-label="Navigation principale" className="border-t border-white/70 px-1.5 py-1.5 lg:hidden">
          <ul className="flex items-center gap-0.5">{links(true)}</ul>
        </nav>
      </div>
    </header>
  );
}
