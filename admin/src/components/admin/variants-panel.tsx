'use client';

import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { AdminProduct, AdminVariant, CatalogMeta } from '@/lib/admin-types';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Field, FormError, Input, MoneyInput } from '@/components/ui/field';
import { Tag } from '@/components/ui/status';
import { useToast } from '@/components/ui/toast';
import { Panel } from './ui';

interface Draft {
  options: Record<string, string>;
  sku: string;
  price: string;
  compareAtPrice: string;
  stockQuantity: string;
}

const empty: Draft = { options: {}, sku: '', price: '', compareAtPrice: '', stockQuantity: '' };
const toDraft = (v: AdminVariant): Draft => ({
  options: { ...v.options },
  sku: v.sku,
  price: v.ownPrice === null ? '' : String(v.ownPrice),
  compareAtPrice: v.ownCompareAtPrice === null ? '' : String(v.ownCompareAtPrice),
  stockQuantity: v.stockQuantity === null ? '' : String(v.stockQuantity),
});
const num = (s: string) => (s.trim() === '' ? null : Number(s));

function VariantForm({ meta, initial, product, onSubmit, onCancel, submitLabel }: { meta: CatalogMeta; initial: Draft; product: AdminProduct; onSubmit: (d: Draft) => Promise<void>; onCancel?: () => void; submitLabel: string }) {
  const [d, setD] = useState<Draft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!Object.values(d.options).some((v) => v.trim())) return setError('Renseignez au moins une option (couleur, stockage…).');
    setSaving(true);
    setError(null);
    try {
      await onSubmit(d);
      setD(empty);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {meta.variantOptions.map((o) => (
          <Field key={o.key} label={o.label} optional>
            {(p) => <Input {...p} value={d.options[o.key] ?? ''} onChange={(e) => setD({ ...d, options: { ...d.options, [o.key]: e.target.value } })} maxLength={40} placeholder={{ color: 'Noir', storage: '256 Go', ram: '8 Go', size: '55 pouces', model: 'Pro' }[o.key]} />}
          </Field>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Prix" optional hint={`Vide : ${formatPrice(product.salePrice)} (prix du produit).`}>
          {(p) => <MoneyInput {...p} value={d.price} onChange={(e) => setD({ ...d, price: e.target.value })} />}
        </Field>
        <Field label="Ancien prix" optional hint="Pour une promotion sur cette variante.">
          {(p) => <MoneyInput {...p} value={d.compareAtPrice} onChange={(e) => setD({ ...d, compareAtPrice: e.target.value })} />}
        </Field>
        <Field label="Stock" optional hint="Vide : stock global du produit.">
          {(p) => <Input {...p} type="number" min={0} value={d.stockQuantity} onChange={(e) => setD({ ...d, stockQuantity: e.target.value })} className="num" />}
        </Field>
        <Field label="Référence" optional hint="Générée si vide.">
          {(p) => <Input {...p} value={d.sku} onChange={(e) => setD({ ...d, sku: e.target.value.toUpperCase() })} maxLength={40} className="font-mono uppercase" />}
        </Field>
      </div>
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" variant="secondary" loading={saving}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>
    </form>
  );
}

/**
 * Variantes d'un produit (couleur, stockage, RAM, taille, modèle), chacune avec son prix et son stock facultatifs.
 * Le client les choisit sur la fiche ; la référence de la variante figure dans son message WhatsApp.
 */
export function VariantsPanel({ product, meta, onChange }: { product: AdminProduct; meta: CatalogMeta; onChange: (p: AdminProduct) => void }) {
  const { notify } = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const variants = product.variants;

  const payload = (d: Draft) => ({
    options: Object.fromEntries(Object.entries(d.options).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()])),
    sku: d.sku.trim() || undefined,
    price: num(d.price),
    compareAtPrice: num(d.compareAtPrice),
    stockQuantity: num(d.stockQuantity),
  });

  const run = async (fn: () => Promise<AdminProduct>, ok: string) => {
    try {
      onChange(await fn());
      notify(ok);
    } catch (err) {
      notify(errorMessage(err), 'bad');
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const ids = variants.map((v) => v.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    run(() => api.patch<AdminProduct>(`/products/${product.id}/variants/order`, { ids }), 'Ordre mis à jour.');
  };

  return (
    <Panel
      title="Variantes"
      bodyClassName=""
      actions={!adding && <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>Ajouter une variante</Button>}
    >
      {variants.length === 0 && !adding && (
        <p className="px-5 py-5 text-[13.5px] text-muted">Aucune variante : le produit est vendu tel quel. Ajoutez-en pour proposer plusieurs couleurs, capacités ou tailles, avec un prix et un stock propres si besoin.</p>
      )}
      {variants.length > 0 && (
        <ul className="divide-y divide-line">
          {variants.map((v, i) =>
            editing === v.id ? (
              <li key={v.id} className="bg-paper px-4 py-4 sm:px-5">
                <VariantForm
                  meta={meta}
                  product={product}
                  initial={toDraft(v)}
                  submitLabel="Enregistrer la variante"
                  onCancel={() => setEditing(null)}
                  onSubmit={async (d) => {
                    onChange(await api.patch<AdminProduct>(`/products/${product.id}/variants/${v.id}`, payload(d)));
                    notify('Variante enregistrée.');
                    setEditing(null);
                  }}
                />
              </li>
            ) : (
              <li key={v.id} className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-5', !v.active && 'text-muted')}>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium">
                    {v.label}
                    {!v.active && <Tag className="ml-2">Masquée</Tag>}
                    {v.discountPercent ? <Tag tone="bad" className="ml-2">−{v.discountPercent} %</Tag> : null}
                  </p>
                  <p className="text-[12.5px] text-muted">
                    <span className="font-mono">{v.sku}</span> · {formatPrice(v.price)}
                    {v.ownPrice === null && ' (prix du produit)'} · stock {v.stockQuantity === null ? 'du produit' : v.stockQuantity}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Monter" className="inline-flex size-8 items-center justify-center text-muted hover:text-ink disabled:opacity-30">
                    <ArrowUp className="size-4" />
                  </button>
                  <button type="button" disabled={i === variants.length - 1} onClick={() => move(i, 1)} aria-label="Descendre" className="inline-flex size-8 items-center justify-center text-muted hover:text-ink disabled:opacity-30">
                    <ArrowDown className="size-4" />
                  </button>
                  <button type="button" onClick={() => run(() => api.patch<AdminProduct>(`/products/${product.id}/variants/${v.id}`, { active: !v.active }), v.active ? 'Variante masquée sur le site.' : 'Variante affichée.')} className="px-2 text-[12.5px] text-muted underline">
                    {v.active ? 'Masquer' : 'Afficher'}
                  </button>
                  <button type="button" onClick={() => setEditing(v.id)} aria-label="Modifier" className="inline-flex size-8 items-center justify-center text-muted hover:text-ink">
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => window.confirm(`Supprimer la variante « ${v.label} » ?`) && run(() => api.delete<AdminProduct>(`/products/${product.id}/variants/${v.id}`), 'Variante supprimée.')}
                    aria-label="Supprimer"
                    className="inline-flex size-8 items-center justify-center text-muted hover:text-bad"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
      {adding && (
        <div className="border-t border-line px-4 py-4 sm:px-5">
          <VariantForm
            meta={meta}
            product={product}
            initial={empty}
            submitLabel="Ajouter"
            onCancel={() => setAdding(false)}
            onSubmit={async (d) => {
              onChange(await api.post<AdminProduct>(`/products/${product.id}/variants`, payload(d)));
              notify('Variante ajoutée.');
            }}
          />
        </div>
      )}
    </Panel>
  );
}
