import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';

/** Prix en accent (chiffres tabulaires), prix barré éventuel, « à partir de » si les variantes diffèrent. */
export function Price({ price, compareAt, from = false, size = 'md', tone = 'accent', className }: { price: number; compareAt?: number | null; from?: boolean; size?: 'md' | 'lg' | 'xl'; tone?: 'accent' | 'light'; className?: string }) {
  const main = { md: 'text-[16px]', lg: 'text-[20px]', xl: 'text-[30px] sm:text-[34px]' }[size];
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      {from && <span className={cn('text-[12px]', tone === 'light' ? 'text-white/70' : 'text-muted')}>dès</span>}
      <span className={cn('num font-semibold', tone === 'light' ? 'text-white' : 'text-accent', main)}>{formatPrice(price)}</span>
      {compareAt ? (
        <s className={cn('num', size === 'xl' ? 'text-[16px]' : 'text-[12.5px]', tone === 'light' ? 'text-white/60' : 'text-faint')}>
          <span className="sr-only">Ancien prix : </span>
          {formatPrice(compareAt)}
        </s>
      ) : null}
    </div>
  );
}
