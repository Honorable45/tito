import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

const COLS = 7;
const ROWS = 6;
const STEP = 32; // décalage entre deux pièces (ms)
const DURATION = 950; // durée d'arrivée d'une pièce (ms)
const START = 150;

/** Pseudo-aléatoire déterministe : même dispersion au rendu serveur et dans le navigateur. */
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Ordre d'arrivée : du centre vers les bords, pour que le T se forme en premier. */
const ORDER = Array.from({ length: COLS * ROWS }, (_, i) => i).sort((a, b) => {
  const d = (i: number) => Math.hypot((i % COLS) - (COLS - 1) / 2, Math.floor(i / COLS) - (ROWS - 1) / 2 + 0.8);
  return d(a) - d(b);
});

/** Moment où la dernière pièce est en place (ms), pour enchaîner l'accroche et les boutons. */
export const LOGO_ASSEMBLED_AT = START + (COLS * ROWS - 1) * STEP + DURATION;

/**
 * Monogramme (T et ruban, fond transparent, sans texte) qui se forme à partir de pièces détachées :
 * l'image est découpée en une grille de pièces,
 * chacune part d'une position dispersée (décalée, tournée, floue) et rejoint sa place.
 * Si l'utilisateur réduit les animations, le logo s'affiche directement assemblé.
 */
export function LogoAssemble({ src, label, className }: { src: string; label: string; className?: string }) {
  return (
    <div role="img" aria-label={label} className={cn('relative mx-auto aspect-[588/518] w-[min(58vw,250px)] drop-shadow-[0_18px_40px_rgb(8_18_40/0.55)] sm:w-[300px] lg:w-[340px]', className)}>
      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }} aria-hidden="true">
        {Array.from({ length: COLS * ROWS }, (_, i) => {
          const c = i % COLS;
          const r = Math.floor(i / COLS);
          // Direction d'éclatement : vers l'extérieur depuis le centre, avec une part d'aléatoire.
          const ox = c - (COLS - 1) / 2;
          const oy = r - (ROWS - 1) / 2;
          const style = {
            backgroundImage: `url(${src})`,
            backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
            backgroundPosition: `${(c / (COLS - 1)) * 100}% ${(r / (ROWS - 1)) * 100}%`,
            '--dx': `${ox * 70 + (rand(i, 1) - 0.5) * 260}%`,
            '--dy': `${oy * 70 + (rand(i, 2) - 0.5) * 260 - 40}%`,
            '--rot': `${(rand(i, 3) - 0.5) * 220}deg`,
            '--sc': `${0.55 + rand(i, 4) * 0.4}`,
            animationDelay: `${START + ORDER.indexOf(i) * STEP}ms`,
            animationDuration: `${DURATION}ms`,
          } as CSSProperties;
          // Légère sur-épaisseur (0,6 px) pour qu'aucun interstice n'apparaisse entre deux pièces.
          return <span key={i} className="logo-piece block size-full scale-[1.006]" style={style} />;
        })}
      </div>
      {/* Image entière posée en fondu à la fin : aucun raccord visible entre les pièces une fois assemblées. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden="true" className="logo-seal absolute inset-0 size-full" style={{ animationDelay: `${LOGO_ASSEMBLED_AT - 150}ms` }} />
    </div>
  );
}
