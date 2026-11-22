'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { BrandWithModels, CatalogMeta, CategoryRow, RepairTypeRow } from '@/lib/admin-types';
import { cn } from '@/lib/cn';
import { useResource } from '@/lib/use-resource';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { LoadingBlock } from '@/components/ui/spinner';
import { Tag } from '@/components/ui/status';
import { useToast } from '@/components/ui/toast';
import { Panel } from '../ui';

/** Ligne éditable : nom + activation (rien n'est supprimé : désactiver conserve l'historique). */
function EditableRow({ name, active, meta, onSave }: { name: string; active: boolean; meta?: string; onSave: (patch: { name?: string; active?: boolean }) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  return (
    <li className={cn('flex items-center gap-3 px-4 py-2 sm:px-5', !active && 'text-muted')}>
      {editing ? (
        <>
          <Input value={value} onChange={(e) => setValue(e.target.value)} className="h-9 flex-1 sm:h-9" autoFocus maxLength={80} />
          <Button size="sm" onClick={async () => { await onSave({ name: value.trim() }); setEditing(false); }} disabled={value.trim().length < 1}>OK</Button>
          <Button size="sm" variant="ghost" onClick={() => { setValue(name); setEditing(false); }}>Annuler</Button>
        </>
      ) : (
        <>
          <span className="flex-1 text-[14px]">
            {name}
            {meta && <span className="ml-2 text-[12px] text-faint">{meta}</span>}
            {!active && <Tag className="ml-2">Désactivé</Tag>}
          </span>
          <button type="button" className="text-[12.5px] text-muted underline" onClick={() => setEditing(true)}>Renommer</button>
          <button type="button" className="text-[12.5px] text-muted underline" onClick={() => onSave({ active: !active })}>{active ? 'Désactiver' : 'Activer'}</button>
        </>
      )}
    </li>
  );
}

function AddRow({ placeholder, onAdd }: { placeholder: string; onAdd: (name: string) => Promise<void> }) {
  const [value, setValue] = useState('');
  return (
    <form
      className="flex gap-2 border-t border-line p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!value.trim()) return;
        await onAdd(value.trim());
        setValue('');
      }}
    >
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} maxLength={80} />
      <Button type="submit" variant="secondary" disabled={!value.trim()}>Ajouter</Button>
    </form>
  );
}

function useAction() {
  const { notify } = useToast();
  return async (fn: () => Promise<unknown>, ok: string, reload: () => void) => {
    try {
      await fn();
      notify(ok);
      reload();
    } catch (err) {
      notify(errorMessage(err), 'bad');
    }
  };
}

function CategoryRowItem({ c, templates, brands, first, last, onMove, run, reload }: { c: CategoryRow; templates: CatalogMeta['specTemplates']; brands: BrandWithModels[]; first: boolean; last: boolean; onMove: (dir: -1 | 1) => void; run: ReturnType<typeof useAction>; reload: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.name);
  const [description, setDescription] = useState(c.description ?? '');
  const [template, setTemplate] = useState(c.specTemplate);
  const [brandIds, setBrandIds] = useState((c.brands ?? []).map((brand) => brand.id));
  if (editing) {
    return (
      <li className="space-y-3 bg-paper px-4 py-4 sm:px-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-label="Nom" />
          <Select value={template} onChange={(e) => setTemplate(e.target.value)} aria-label="Gabarit de fiche technique">
            {Object.entries(templates).map(([k, t]) => (
              <option key={k} value={k}>Fiche : {t.label}</option>
            ))}
          </Select>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} placeholder="Description affichée en tête de la catégorie (facultatif)" className="sm:col-span-2" aria-label="Description" />
        </div>
        {c.kind === 'ACCESSORY' && (
          <div>
            <p className="mb-2 text-[12.5px] font-medium text-ink-2">Marques disponibles pour cette catégorie</p>
            <div className="flex flex-wrap gap-2">
              {brands.filter((brand) => brand.active).map((brand) => (
                <label key={brand.id} className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={brandIds.includes(brand.id)}
                    onChange={(event) => setBrandIds((current) => event.target.checked
                      ? [...current, brand.id]
                      : current.filter((id) => id !== brand.id))}
                  />
                  {brand.name}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" disabled={name.trim().length < 2} onClick={() => run(() => api.patch(`/categories/${c.id}`, { name: name.trim(), description: description.trim(), specTemplate: template, brandIds: c.kind === 'ACCESSORY' ? brandIds : undefined }), 'Catégorie mise à jour.', () => { setEditing(false); reload(); })}>Enregistrer</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Annuler</Button>
        </div>
      </li>
    );
  }
  return (
    <li className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 sm:px-5', !c.active && 'text-muted')}>
      <div className="flex flex-col">
        <button type="button" disabled={first} onClick={() => onMove(-1)} aria-label="Monter" className="text-muted hover:text-ink disabled:opacity-30"><ArrowUp className="size-3.5" /></button>
        <button type="button" disabled={last} onClick={() => onMove(1)} aria-label="Descendre" className="text-muted hover:text-ink disabled:opacity-30"><ArrowDown className="size-3.5" /></button>
      </div>
      <span className="min-w-0 flex-1 text-[14px]">
        {c.name}
        <span className="ml-2 text-[12px] text-faint">{c._count.products} produit(s) · fiche « {templates[c.specTemplate]?.label ?? c.specTemplate} »</span>
        {!c.active && <Tag className="ml-2">Désactivée</Tag>}
      </span>
      <button type="button" className="text-[12.5px] text-muted underline" onClick={() => setEditing(true)}>Modifier</button>
      <button type="button" className="text-[12.5px] text-muted underline" onClick={() => run(() => api.patch(`/categories/${c.id}`, { active: !c.active }), c.active ? 'Catégorie désactivée : elle n’apparaît plus sur le site.' : 'Catégorie activée.', reload)}>{c.active ? 'Désactiver' : 'Activer'}</button>
      <button type="button" className="text-[12.5px] text-muted underline hover:text-bad" onClick={() => window.confirm(`Supprimer la catégorie « ${c.name} » ?`) && run(() => api.delete(`/categories/${c.id}`), 'Catégorie supprimée.', reload)}>Supprimer</button>
    </li>
  );
}

/** Catégories du catalogue : nom, gabarit de fiche technique, ordre d'affichage (menu, accueil, filtres). */
export function CategoriesPanel() {
  const run = useAction();
  const [kind, setKind] = useState<'ACCESSORY' | 'PART'>('ACCESSORY');
  const [template, setTemplate] = useState('GENERIC');
  const { data, reload } = useResource<CategoryRow[]>('/categories');
  const brands = useResource<BrandWithModels[]>('/brands');
  const meta = useResource<CatalogMeta>('/shop/meta');
  if (!data || !brands.data || !meta.data) return <LoadingBlock />;
  const rows = data.filter((c) => c.kind === kind);
  const move = (i: number, dir: -1 | 1) => {
    const ids = rows.map((c) => c.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    run(() => api.post('/categories/order', { ids }), 'Ordre mis à jour.', reload);
  };
  return (
    <Panel title="Catégories" bodyClassName="" actions={
      <Select value={kind} onChange={(e) => setKind(e.target.value as 'ACCESSORY' | 'PART')} className="h-9 w-52 sm:h-9" aria-label="Type">
        <option value="ACCESSORY">Catalogue (site)</option>
        <option value="PART">Pièces d’atelier</option>
      </Select>
    }>
      <p className="px-5 pt-4 text-[13.5px] text-muted">L’ordre ci-dessous est celui du menu et de l’accueil. Le gabarit choisit les champs proposés dans la fiche technique des produits. Une catégorie qui contient des produits ne peut pas être supprimée : désactivez-la.</p>
      <ul className="mt-2 divide-y divide-line">
        {rows.map((c, i) => (
          <CategoryRowItem key={`${c.id}-${c.name}-${c.specTemplate}`} c={c} templates={meta.data!.specTemplates} brands={brands.data!} first={i === 0} last={i === rows.length - 1} onMove={(dir) => move(i, dir)} run={run} reload={reload} />
        ))}
      </ul>
      <form
        className="flex flex-col gap-2 border-t border-line p-3 sm:flex-row"
        onSubmit={async (e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem('name') as HTMLInputElement;
          if (input.value.trim().length < 2) return;
          await run(() => api.post('/categories', { name: input.value.trim(), kind, specTemplate: kind === 'PART' ? 'GENERIC' : template, position: rows.length }), 'Catégorie ajoutée.', reload);
          input.value = '';
        }}
      >
        <Input name="name" placeholder="Nouvelle catégorie" maxLength={80} />
        {kind === 'ACCESSORY' && (
          <Select value={template} onChange={(e) => setTemplate(e.target.value)} aria-label="Gabarit" className="sm:w-64">
            {Object.entries(meta.data.specTemplates).map(([k, t]) => (
              <option key={k} value={k}>Fiche : {t.label}</option>
            ))}
          </Select>
        )}
        <Button type="submit" variant="secondary">Ajouter</Button>
      </form>
    </Panel>
  );
}

/** Marques : utilisées par les produits (filtre du catalogue, pages /marque/…) et par les compatibilités. */
export function BrandsPanel() {
  const run = useAction();
  const { data, reload } = useResource<BrandWithModels[]>('/brands');
  const [brandId, setBrandId] = useState('');
  if (!data) return <LoadingBlock />;
  const brand = data.find((b) => b.id === brandId) ?? data[0];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Marques" bodyClassName="">
        <ul className="divide-y divide-line">
          {data.map((b) => (
            <li key={b.id} className={cn(brand?.id === b.id && 'bg-paper')}>
              <div className="flex items-center">
                <button type="button" onClick={() => setBrandId(b.id)} className="flex-1 px-5 py-2 text-left text-[14px]">
                  {b.name} <span className="text-[12px] text-faint">{b._count?.products ?? 0} produit(s) · {b.models.length} modèle(s)</span>
                  {!b.active && <Tag className="ml-2">Désactivée</Tag>}
                </button>
                <button type="button" className="px-2 text-[12.5px] text-muted underline" onClick={() => { const name = window.prompt('Nouveau nom de la marque', b.name); if (name && name.trim() && name.trim() !== b.name) run(() => api.patch(`/brands/${b.id}`, { name: name.trim() }), 'Marque renommée.', reload); }}>
                  Renommer
                </button>
                <button type="button" className="px-2 text-[12.5px] text-muted underline" onClick={() => run(() => api.patch(`/brands/${b.id}`, { active: !b.active }), 'Marque mise à jour.', reload)}>
                  {b.active ? 'Désactiver' : 'Activer'}
                </button>
                <button type="button" className="pl-2 pr-4 text-[12.5px] text-muted underline hover:text-bad" onClick={() => window.confirm(`Supprimer la marque « ${b.name} » ?`) && run(() => api.delete(`/brands/${b.id}`), 'Marque supprimée.', reload)}>
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
        <AddRow placeholder="Nouvelle marque (ex. Huawei)" onAdd={(name) => run(() => api.post('/brands', { name, position: data.length }), 'Marque ajoutée.', reload)} />
      </Panel>
      {brand && (
        <Panel title={`Modèles ${brand.name}`} bodyClassName="">
          <p className="px-5 pt-4 text-[13px] text-muted">Facultatif : modèles utilisés pour indiquer la compatibilité des accessoires (ex. coque pour iPhone 15).</p>
          <ul className="mt-2 max-h-[28rem] divide-y divide-line overflow-y-auto">
            {brand.models.map((m) => (
              <EditableRow key={m.id} name={m.name} active={m.active} onSave={(patch) => run(() => api.patch(`/brands/models/${m.id}`, patch), 'Modèle mis à jour.', reload)} />
            ))}
          </ul>
          <AddRow placeholder={`Nouveau modèle ${brand.name}`} onAdd={(name) => run(() => api.post(`/brands/${brand.id}/models`, { name, position: brand.models.length }), 'Modèle ajouté.', reload)} />
        </Panel>
      )}
    </div>
  );
}

export function RepairTypesPanel() {
  const run = useAction();
  const { data, reload } = useResource<RepairTypeRow[]>('/repair-pricing/types');
  if (!data) return <LoadingBlock />;
  return (
    <Panel title="Types de panne" bodyClassName="">
      <p className="px-5 pt-4 text-[13.5px] text-muted">Proposés dans le devis en ligne et dans les dossiers. Les tarifs se règlent dans « Tarifs de réparation ».</p>
      <ul className="mt-2 divide-y divide-line">
        {data.map((t) => (
          <EditableRow key={t.id} name={t.name} active={t.active} onSave={(patch) => run(() => api.patch(`/repair-pricing/types/${t.id}`, patch), 'Type de panne mis à jour.', reload)} />
        ))}
      </ul>
      <AddRow placeholder="Nouveau type de panne" onAdd={(name) => run(() => api.post('/repair-pricing/types', { name, position: data.length }), 'Type de panne ajouté.', reload)} />
    </Panel>
  );
}
