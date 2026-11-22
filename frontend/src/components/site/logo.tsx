import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import mark from '../../../public/brand/titotrade-mark-transparent.png';

/**
 * Logo : monogramme TitoTrade (T et ruban) suivi du nom en capitales espacées, comme sur le logo officiel.
 * Monogramme détouré (fond transparent) : lisible sur l'en-tête clair comme sur le pied de page bleu nuit.
 * Un logo téléversé dans l'administration remplace l'ensemble.
 */
export function Logo({ name, logoUrl, invert = false, compact = false, className }: { name: string; logoUrl?: string | null; invert?: boolean; compact?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn('flex shrink-0 items-center gap-2.5', className)} aria-label={`${name} — accueil`}>
      {logoUrl ? (
        <Image src={logoUrl} alt={name} width={160} height={40} className="h-10 w-auto object-contain" priority />
      ) : (
        <>
          <span className={cn('flex shrink-0 items-center justify-center', invert && 'rounded-sm bg-white p-1')}>
            <Image src={mark} alt="" className="h-10 w-auto md:h-12" priority />
          </span>
          <span className={cn('flex-col leading-none', compact ? 'hidden sm:flex' : 'flex', invert ? 'text-white' : 'text-navy')}>
            <span className="text-[15px] font-medium tracking-[0.16em]">{wordmark(name)}</span>
            <span className={cn('mt-1 text-[8.5px] font-medium tracking-[0.2em]', (compact || invert) && 'hidden', compact && 'xl:block', invert ? 'text-white/60' : 'text-muted')}>EFFICACITÉ · QUALITÉ · SATISFACTION</span>
          </span>
        </>
      )}
    </Link>
  );
}

/** « TitoTrade » → « TITO TRADE » (mots séparés comme sur le logo). */
function wordmark(name: string) {
  return name.replace(/([a-zà-ÿ])([A-ZÀ-Ý])/g, '$1 $2').toUpperCase();
}
