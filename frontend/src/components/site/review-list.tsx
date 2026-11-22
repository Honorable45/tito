import { BadgeCheck } from 'lucide-react';
import { formatDate } from '@/lib/format';
import type { PublicReview } from '@/lib/types';
import { Stars } from './stars';

export function ReviewList({ reviews, shopName, columns = 3 }: { reviews: PublicReview[]; shopName: string; columns?: 2 | 3 }) {
  return (
    <ul className={`columns-1 gap-4 sm:columns-2 ${columns === 3 ? 'lg:columns-3' : ''} [&>li]:mb-4`}>
      {reviews.map((r) => (
        <li key={r.id} className="break-inside-avoid rounded-3xl border border-line bg-surface p-6">
          <div className="flex items-center justify-between gap-3">
            <Stars value={r.rating} />
            {r.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2.5 py-1 text-[12px] font-medium text-ok">
                <BadgeCheck className="size-3.5" aria-hidden="true" /> Vérifié
              </span>
            )}
          </div>
          {r.comment && <p className="mt-4 text-[15.5px] leading-relaxed">« {r.comment} »</p>}
          <p className="mt-4 text-[13px] text-muted">{[r.displayName, r.serviceLabel, formatDate(r.createdAt)].filter(Boolean).join(' · ')}</p>
          {r.shopReply && (
            <div className="mt-4 rounded-2xl bg-paper px-4 py-3 text-[14px] text-ink-2">
              <p className="text-[12.5px] font-medium text-accent">Réponse de {shopName}</p>
              <p className="mt-1">{r.shopReply}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
