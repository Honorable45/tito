'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { CONDITION_TO_PARAM } from '@/lib/labels';
import type { CatalogPage, Condition, ProductCard as Card, ShopBrand, ShopCategory } from '@/lib/types';
import { cn } from '@/lib/cn';
import { waLink } from '@/lib/whatsapp';
import { ProductCard } from './product-card';
import { WhatsAppIcon } from './whatsapp-icon';

const BUDGETS: { label: string; min?: number; max?: number }[] = [
  { label: `Moins de ${formatPrice(100_000)}`, max: 100_000 },
  { label: `${formatPrice(100_000)} à ${formatPrice(250_000)}`, min: 100_000, max: 250_000 },
  { label: `${formatPrice(250_000)} à ${formatPrice(500_000)}`, min: 250_000, max: 500_000 },
  { label: `Plus de ${formatPrice(500_000)}`, min: 500_000 },
  { label: 'À définir ensemble' },
];
const CONDITIONS: { value: Condition | null; label: string }[] = [
  { value: 'NEW', label: 'Neuf' },
  { value: 'REFURBISHED', label: 'Reconditionné' },
  { value: 'USED', label: 'Occasion' },
  { value: null, label: 'Peu importe' },
];
const TITLES = ['Quel appareil ?', 'Quel budget ?', 'Vos préférences', 'Récapitulatif'];

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn('min-h-12 rounded-full border px-5 text-left text-[15px] transition-colors active:scale-[.98]', active ? 'border-navy bg-navy font-medium text-white' : 'border-line-2 bg-surface text-ink hover:border-ink-2')}
    >
      {children}
    </button>
  );
}

/** Assistant de choix : type → budget → préférences → récapitulatif, puis demande de conseil sur WhatsApp. */
export function Advisor({ categories, brands, shopName, whatsapp }: { categories: ShopCategory[]; brands: ShopBrand[]; shopName: string; whatsapp: string | null }) {
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<ShopCategory | null>(null);
  const [budget, setBudget] = useState<(typeof BUDGETS)[number] | null>(null);
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number] | null>(null);
  const [brand, setBrand] = useState<ShopBrand | null>(null);
  const [note, setNote] = useState('');
  const [matches, setMatches] = useState<{ items: Card[]; total: number } | null>(null);

  const query = new URLSearchParams();
  if (category) query.set('category', category.slug);
  if (brand) query.set('brand', brand.slug);
  if (condition?.value) query.set('condition', condition.value);
  if (budget?.min !== undefined) query.set('minPrice', String(budget.min));
  if (budget?.max !== undefined) query.set('maxPrice', String(budget.max));
  const qs = query.toString();

  useEffect(() => {
    if (step !== 3) return;
    let alive = true;
    setMatches(null);
    api
      .get<CatalogPage>(`/shop/products?${qs}&available=1&pageSize=4`)
      .then((d) => alive && setMatches({ items: d.items, total: d.total }))
      .catch(() => alive && setMatches({ items: [], total: 0 }));
    return () => {
      alive = false;
    };
  }, [step, qs]);

  const catalogHref = (() => {
    const p = new URLSearchParams();
    if (brand) p.set('marque', brand.slug);
    if (condition?.value) p.set('etat', CONDITION_TO_PARAM[condition.value]);
    if (budget?.min !== undefined) p.set('min', String(budget.min));
    if (budget?.max !== undefined) p.set('max', String(budget.max));
    const s = p.toString();
    return `${category ? `/categorie/${category.slug}` : '/catalogue'}${s ? `?${s}` : ''}`;
  })();

  const summary: [string, string][] = [
    ['Appareil', category?.name ?? 'Autre'],
    ['Budget', budget?.label ?? 'À définir ensemble'],
    ['État', condition?.label ?? 'Peu importe'],
    ['Marque', brand?.name ?? 'Peu importe'],
    ...(note.trim() ? ([['Précisions', note.trim()]] as [string, string][]) : []),
  ];
  const message = [`Bonjour ${shopName},`, '', 'Je cherche un produit :', '', ...summary.map(([k, v]) => `${k} : ${v.replace(/ /g, ' ')}`), '', 'Pouvez-vous me conseiller ?'].join('\n');
  const wa = waLink(whatsapp, message);
  const canNext = step === 0 ? category !== null || step > 0 : step === 1 ? budget !== null : true;

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-8">
      <div className="flex gap-1.5" aria-hidden="true">
        {TITLES.map((t, i) => (
          <span key={t} className={cn('h-1 flex-1 rounded-full transition-colors', i <= step ? 'bg-warm' : 'bg-line')} />
        ))}
      </div>
      <p className="mt-5 font-mono text-[12px] text-muted">Étape {step + 1} sur {TITLES.length}</p>
      <h2 className="display mt-1 text-[30px] sm:text-[36px]">{TITLES[step]}</h2>

      <div key={step} className="mt-6 animate-slide-up">
        {step === 0 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Choice key={c.id} active={category?.id === c.id} onClick={() => { setCategory(c); setStep(1); }}>
                {c.name}
              </Choice>
            ))}
          </div>
        )}
        {step === 1 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {BUDGETS.map((b) => (
              <Choice key={b.label} active={budget?.label === b.label} onClick={() => { setBudget(b); setStep(2); }}>
                <span className="num">{b.label}</span>
              </Choice>
            ))}
          </div>
        )}
        {step === 2 && (
          <div className="space-y-6">
            <fieldset>
              <legend className="mb-2.5 text-[13px] font-medium">État</legend>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map((c) => (
                  <Choice key={c.label} active={condition?.label === c.label} onClick={() => setCondition(c)}>
                    {c.label}
                  </Choice>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2.5 text-[13px] font-medium">
                Marque <span className="font-normal text-faint">facultatif</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                <Choice active={brand === null} onClick={() => setBrand(null)}>
                  Peu importe
                </Choice>
                {brands.map((b) => (
                  <Choice key={b.id} active={brand?.id === b.id} onClick={() => setBrand(b)}>
                    {b.name}
                  </Choice>
                ))}
              </div>
            </fieldset>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium">
                Précisions <span className="font-normal text-faint">facultatif</span>
              </span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={3} placeholder="Usage, taille d’écran, stockage…" className="w-full rounded-xl border border-line-2 bg-surface px-3.5 py-3 text-[15px] outline-none placeholder:text-faint focus:border-accent" />
              <span className="mt-1 block text-[12.5px] text-muted">Pour le travail, les études, le jeu, la photo…</span>
            </label>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-6">
            <dl className="divide-y divide-line overflow-hidden rounded-2xl border border-line text-[14.5px]">
              {summary.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[38%_1fr] gap-4 px-4 py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="num">{v}</dd>
                </div>
              ))}
            </dl>
            {matches === null ? (
              <p className="text-[14px] text-muted">Recherche des produits correspondants…</p>
            ) : matches.items.length > 0 ? (
              <div>
                <p className="eyebrow mb-3">
                  {matches.total} produit{matches.total > 1 ? 's' : ''} en stock correspond{matches.total > 1 ? 'ent' : ''}
                </p>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {matches.items.map((p) => (
                    <li key={p.id}>
                      <ProductCard product={p} />
                    </li>
                  ))}
                </ul>
                <Link href={catalogHref} className="mt-3 inline-block text-[14px] font-medium text-accent underline">
                  Voir dans le catalogue
                </Link>
              </div>
            ) : (
              <p className="rounded-2xl border-l-2 border-accent bg-accent-soft px-4 py-3 text-[14px] text-ink-2">Aucun produit en stock ne correspond exactement : la boutique peut vous proposer une alternative.</p>
            )}
            {wa ? (
              <a href={wa} target="_blank" rel="noopener" className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-wa text-[16px] font-medium text-white transition-colors hover:bg-wa-2 active:scale-[.98]">
                <WhatsAppIcon className="size-5" /> Demander conseil sur WhatsApp
              </a>
            ) : (
              <p className="text-center text-[14px] text-muted">La demande par WhatsApp sera bientôt disponible.</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
        {step > 0 ? (
          <button type="button" onClick={() => setStep(step - 1)} className="glass-light inline-flex h-11 items-center gap-2 rounded-full pl-3 pr-4 text-[14px] font-medium text-ink hover:bg-white">
            <ArrowLeft className="size-[18px]" /> Précédent
          </button>
        ) : (
          <span />
        )}
        {step < 3 && (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canNext && step !== 0}
            className="glass-dark inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-medium text-white hover:bg-navy disabled:opacity-50 active:scale-[.98]"
          >
            {step === 0 && !category ? 'Passer' : 'Continuer'} <ArrowRight className="size-[18px]" />
          </button>
        )}
      </div>
    </div>
  );
}
