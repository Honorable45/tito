'use client';

import { Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { AdminProduct, BrandWithModels, CatalogMeta, CategoryRow, ProductCondition, SpecRow, SupplierRow } from '@/lib/admin-types';
import { formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, FormError, Input, MoneyInput, Select, Textarea } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { Panel } from './ui';
import { useCan } from './session';

interface Compat {
  brandId: string;
  modelId: string;
}

const discount = (price: number, old: number) => (old > price && old > 0 ? Math.round(((old - price) / old) * 100) : null);

export function ProductForm({ product, kind, categories, brands, suppliers, meta }: { product?: AdminProduct; kind: 'ACCESSORY' | 'PART'; categories: CategoryRow[]; brands: BrandWithModels[]; suppliers: SupplierRow[]; meta: CatalogMeta }) {
  const router = useRouter();
  const can = useCan();
  const { notify } = useToast();
  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [categoryId, setCategoryId] = useState(product?.category.id ?? '');
  const [brandId, setBrandId] = useState(product?.brand?.id ?? '');
  const [condition, setCondition] = useState<ProductCondition>(product?.condition ?? 'NEW');
  const [supplierId, setSupplierId] = useState(product?.supplier?.id ?? '');
  const [price, setPrice] = useState(product ? String(product.salePrice) : '');
  const [oldPrice, setOldPrice] = useState(product?.compareAtPrice ? String(product.compareAtPrice) : '');
  const [threshold, setThreshold] = useState(String(product?.lowStockThreshold ?? 2));
  const [published, setPublished] = useState(product?.published ?? true);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [shortDescription, setShortDescription] = useState(product?.shortDescription ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [specs, setSpecs] = useState<SpecRow[]>(product?.specs ?? []);
  const [compat, setCompat] = useState<Compat[]>(product?.compatibility.map((c) => ({ brandId: c.brandId, modelId: c.modelId ?? '' })) ?? []);
  const [initialStock, setInitialStock] = useState('');
  const [initialCost, setInitialCost] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cats = categories.filter((c) => c.kind === kind && (c.active || c.id === categoryId));
  const category = categories.find((c) => c.id === categoryId);
  const compatibleBrands = brands.filter((b) =>
    (b.active || b.id === brandId) &&
    (category?.brands ? category.brands.some((categoryBrand) => categoryBrand.id === b.id) : true)
  );
  const template = meta.specTemplates[category?.specTemplate ?? 'GENERIC'] ?? meta.specTemplates.GENERIC;
  const templateKeys = new Set(template.fields.map((f) => f.key));
  const customRows = specs.map((s, i) => ({ ...s, i })).filter((s) => !templateKeys.has(s.key));
  const pct = discount(Number(price) || 0, Number(oldPrice) || 0);

  const setTemplateValue = (key: string, label: string, value: string) => {
    const i = specs.findIndex((s) => s.key === key);
    if (i === -1) setSpecs([...specs, { key, label, value }]);
    else setSpecs(specs.map((s, j) => (j === i ? { ...s, label, value } : s)));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!categoryId) return setError('Choisissez une catégorie.');
    if (price === '') return setError('Indiquez un prix de vente.');
    if (oldPrice !== '' && Number(oldPrice) <= Number(price)) return setError('L’ancien prix doit être supérieur au prix de vente (ou laissé vide).');
    if (Number(initialStock) > 0 && initialCost === '') return setError('Indiquez le coût unitaire du stock initial.');
    setSaving(true);
    const body = {
      name: name.trim(),
      sku: sku.trim() || undefined,
      categoryId,
      brandId: brandId || null,
      condition,
      supplierId: supplierId || null,
      salePrice: Number(price),
      compareAtPrice: oldPrice !== '' ? Number(oldPrice) : null,
      lowStockThreshold: Number(threshold) || 0,
      published: kind === 'ACCESSORY' ? published : false,
      featured: kind === 'ACCESSORY' ? featured : false,
      shortDescription: shortDescription.trim() || null,
      description: description.trim(),
      specs: specs.filter((s) => s.label.trim() && s.value.trim()).map((s) => ({ key: s.key || undefined, label: s.label.trim(), value: s.value.trim() })),
      compatibility: compat.filter((c) => c.brandId).map((c) => ({ brandId: c.brandId, modelId: c.modelId || null })),
    };
    try {
      if (product) {
        await api.patch(`/products/${product.id}`, body);
        notify('Produit enregistré.');
        router.refresh();
        router.push(`/produits/${product.id}`);
      } else {
        const created = await api.post<AdminProduct>('/products', {
          ...body,
          kind,
          initialStock: Number(initialStock) || undefined,
          initialUnitCost: initialCost !== '' ? Number(initialCost) : undefined,
        });
        notify('Produit créé. Ajoutez maintenant ses photos et, si besoin, ses variantes.');
        router.push(`/produits/${created.id}`);
      }
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <Panel title="Informations">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom du produit" className="sm:col-span-2" hint="Ex. Samsung Galaxy A55 5G, Dell Latitude 7420.">
            {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={140} />}
          </Field>
          <Field label="Catégorie">
            {(p) => (
              <Select {...p} value={categoryId} onChange={(e) => {
                setCategoryId(e.target.value);
                setBrandId('');
              }} required>
                <option value="">Choisir…</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {kind === 'ACCESSORY' && (
            <Field label="Marque" optional hint="Absente de la liste ? Ajoutez-la dans « Marques ».">
              {(p) => (
                <Select {...p} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                  <option value="">Sans marque</option>
                  {compatibleBrands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </Select>
              )}
            </Field>
          )}
          {kind === 'ACCESSORY' && (
            <Field label="État">
              {(p) => (
                <Select {...p} value={condition} onChange={(e) => setCondition(e.target.value as ProductCondition)}>
                  {meta.conditions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          <Field label="Description courte" optional className="sm:col-span-2" hint="Une ligne affichée sous le nom : l’essentiel à savoir.">
            {(p) => <Input {...p} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} maxLength={220} placeholder='Écran 6,6", 5G, 128 Go, garantie 6 mois' />}
          </Field>
          <Field label="Description détaillée" optional className="sm:col-span-2">
            {(p) => <Textarea {...p} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={4000} placeholder="État précis, accessoires fournis, garantie, points forts…" />}
          </Field>
        </div>
      </Panel>

      <Panel title="Prix et promotion">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prix de vente" hint={kind === 'ACCESSORY' ? 'Avec des variantes : indiquez le prix le plus bas (« à partir de »).' : 'Mettez 0 si la pièce n’est pas vendue seule.'}>
            {(p) => <MoneyInput {...p} value={price} onChange={(e) => setPrice(e.target.value)} required />}
          </Field>
          {kind === 'ACCESSORY' && (
            <Field label="Ancien prix (barré)" optional hint={pct ? `Réduction affichée : −${pct} % (économie de ${formatPrice(Number(oldPrice) - Number(price))}).` : 'Renseignez-le pour afficher une promotion. Videz-le pour l’arrêter.'}>
              {(p) => <MoneyInput {...p} value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} />}
            </Field>
          )}
          {kind === 'ACCESSORY' && (
            <div className="space-y-3 sm:col-span-2">
              <Checkbox checked={published} onChange={(e) => setPublished(e.target.checked)} label="Publié sur le site" description="Décochez pour préparer la fiche ou pour un produit vendu uniquement en boutique." />
              <Checkbox checked={featured} onChange={(e) => setFeatured(e.target.checked)} label="Mettre en avant sur l’accueil" description="Apparaît dans « Notre sélection » tant qu’il n’y a pas assez de ventes pour classer les meilleures ventes." />
            </div>
          )}
        </div>
      </Panel>

      {kind === 'ACCESSORY' && (
        <Panel title="Caractéristiques techniques" actions={<span className="text-[12.5px] text-muted">Gabarit : {template.label}</span>}>
          {template.fields.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {template.fields.map((f) => (
                <Field key={f.key} label={f.label} optional>
                  {(p) => <Input {...p} value={specs.find((s) => s.key === f.key)?.value ?? ''} onChange={(e) => setTemplateValue(f.key, f.label, e.target.value)} placeholder={f.placeholder} maxLength={300} />}
                </Field>
              ))}
            </div>
          )}
          <div className={template.fields.length ? 'mt-5 border-t border-line pt-4' : ''}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-medium text-ink-2">Autres caractéristiques</span>
              <Button size="sm" variant="ghost" onClick={() => setSpecs([...specs, { key: '', label: '', value: '' }])}>
                <Plus className="size-4" /> Ajouter une ligne
              </Button>
            </div>
            {customRows.length === 0 ? (
              <p className="text-[13px] text-muted">Ajoutez librement d’autres lignes (ex. « Garantie » : « 6 mois »). Seules les lignes remplies sont affichées sur le site.</p>
            ) : (
              <ul className="space-y-2">
                {customRows.map((r) => (
                  <li key={r.i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
                    <Input value={r.label} onChange={(e) => setSpecs(specs.map((s, j) => (j === r.i ? { ...s, label: e.target.value } : s)))} placeholder="Nom (ex. Garantie)" aria-label="Nom de la caractéristique" maxLength={60} />
                    <Input value={r.value} onChange={(e) => setSpecs(specs.map((s, j) => (j === r.i ? { ...s, value: e.target.value } : s)))} placeholder="Valeur (ex. 6 mois)" aria-label="Valeur" maxLength={300} />
                    <button type="button" onClick={() => setSpecs(specs.filter((_, j) => j !== r.i))} aria-label="Retirer la ligne" className="inline-flex size-10 items-center justify-center text-muted hover:text-bad">
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      )}

      {!product && (
        <Panel title="Stock">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantité en stock">{(p) => <Input {...p} type="number" min={0} value={initialStock} onChange={(e) => setInitialStock(e.target.value)} className="num" />}</Field>
            <Field label="Coût d’achat unitaire" hint="Prix payé pour une unité : sert au calcul des marges.">
              {(p) => <MoneyInput {...p} value={initialCost} onChange={(e) => setInitialCost(e.target.value)} />}
            </Field>
          </div>
        </Panel>
      )}

      <details open={Boolean(product && (compat.length > 0 || supplierId))} className="rounded-md border border-line bg-surface">
        <summary className="cursor-pointer select-none px-5 py-3.5 text-[14px] font-medium text-ink-2 hover:text-ink">Plus d’options <span className="font-normal text-muted">— référence, alerte de stock, fournisseur, compatibilité (facultatif)</span></summary>
        <div className="grid gap-4 border-t border-line px-5 py-5 sm:grid-cols-2">
          <Field label="Référence (SKU)" optional hint={product ? 'Figure dans le message WhatsApp du client.' : 'Générée automatiquement si vide (TT-…).'}>
            {(p) => <Input {...p} value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} maxLength={40} className="font-mono uppercase" />}
          </Field>
          <Field label="Seuil d’alerte" hint="Alerte « stock faible » à partir de ce nombre disponible.">
            {(p) => <Input {...p} type="number" min={0} value={threshold} onChange={(e) => setThreshold(e.target.value)} className="num" />}
          </Field>
          {can('suppliers.manage') && (
            <Field label="Fournisseur habituel" optional>
              {(p) => (
                <Select {...p} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  <option value="">Aucun</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          <div className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-medium text-ink-2">Compatibilité (accessoires)</span>
              <Button size="sm" variant="ghost" onClick={() => setCompat([...compat, { brandId: '', modelId: '' }])}>
                <Plus className="size-4" /> Ajouter
              </Button>
            </div>
            {compat.length === 0 ? (
              <p className="text-[13.5px] text-muted">Facultatif : appareils avec lesquels l’accessoire est compatible.</p>
            ) : (
              <ul className="space-y-2">
                {compat.map((c, i) => {
                  const brand = brands.find((b) => b.id === c.brandId);
                  return (
                    <li key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <Select value={c.brandId} onChange={(e) => setCompat(compat.map((x, j) => (j === i ? { brandId: e.target.value, modelId: '' } : x)))} aria-label="Marque">
                        <option value="">Marque…</option>
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </Select>
                      <Select value={c.modelId} disabled={!brand} onChange={(e) => setCompat(compat.map((x, j) => (j === i ? { ...x, modelId: e.target.value } : x)))} aria-label="Modèle">
                        <option value="">Tous les modèles</option>
                        {brand?.models.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </Select>
                      <button type="button" onClick={() => setCompat(compat.filter((_, j) => j !== i))} aria-label="Retirer" className="inline-flex size-10 items-center justify-center text-muted hover:text-bad">
                        <X className="size-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </details>

      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" loading={saving}>
          {product ? 'Enregistrer' : 'Créer le produit'}
        </Button>
        <Button variant="ghost" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
