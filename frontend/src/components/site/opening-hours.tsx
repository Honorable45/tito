import { DAYS } from '@/lib/labels';
import type { OpeningHour } from '@/lib/types';

export function OpeningHours({ hours }: { hours: OpeningHour[] }) {
  if (!hours.length) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-[13.5px]">
      {hours.map((h) => (
        <div key={h.dayOfWeek} className="contents">
          <dt className="text-muted">{DAYS[h.dayOfWeek]}</dt>
          <dd className="num">{h.closed || !h.opensAt ? 'Fermé' : `${h.opensAt.replace(':', ' h ')} – ${h.closesAt?.replace(':', ' h ')}`}</dd>
        </div>
      ))}
    </dl>
  );
}
