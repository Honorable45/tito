import { AVAILABILITY_LABELS, CONDITION_LABELS } from '@/lib/labels';
import type { Availability, Condition } from '@/lib/types';
import { cn } from '@/lib/cn';

/** Badge en petites capitales, coins presque droits. */
const base = 'inline-flex items-center whitespace-nowrap rounded-[3px] px-1.5 py-[3px] text-[10.5px] font-semibold uppercase leading-none tracking-[0.08em]';

const CONDITION_TONE: Record<Condition, string> = {
  NEW: 'bg-navy text-white',
  REFURBISHED: 'bg-ok text-white',
  USED: 'bg-surface text-ink-2 ring-1 ring-line-2',
};

export function ConditionBadge({ condition, className }: { condition: Condition; className?: string }) {
  return <span className={cn(base, CONDITION_TONE[condition], className)}>{CONDITION_LABELS[condition]}</span>;
}

/** Promotion : seul usage de l'accent chaud sur les cartes. */
export function DiscountBadge({ percent, className }: { percent: number | null; className?: string }) {
  if (!percent) return null;
  return <span className={cn(base, 'num bg-warm text-white', className)}>−{percent}&nbsp;%</span>;
}

/** Fiches de démonstration : prix et stocks fictifs. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <span className={cn(base, 'bg-warn-soft text-warn ring-1 ring-warn/40', className)} title="Produit d’exemple : prix et stock fictifs">
      Exemple
    </span>
  );
}

export function AvailabilityLabel({ availability, className }: { availability: Availability; className?: string }) {
  const tone = availability === 'IN_STOCK' ? 'text-ok' : availability === 'LOW_STOCK' ? 'text-warn' : 'text-muted';
  const dot = availability === 'IN_STOCK' ? 'bg-ok' : availability === 'LOW_STOCK' ? 'bg-warn' : 'bg-faint';
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[12.5px] font-medium', tone, className)}>
      <span className={cn('size-1.5 rounded-full', dot)} aria-hidden="true" />
      {AVAILABILITY_LABELS[availability]}
    </span>
  );
}
