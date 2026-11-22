'use client';

import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { PageHeader, Panel } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, FormError, Input } from '@/components/ui/field';
import { ErrorState } from '@/components/ui/empty-state';
import { LoadingBlock, Spinner } from '@/components/ui/spinner';
import { Tag } from '@/components/ui/status';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import type { AdminBanner } from '@/lib/admin-types';
import { useResource } from '@/lib/use-resource';

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
const toIso = (d: string, end = false) => (d ? new Date(`${d}T${end ? '23:59:59' : '00:00:00'}`).toISOString() : null);

function BannerEditor({ banner, onSaved, onDeleted, first, last, onMove }: { banner: AdminBanner; onSaved: (b: AdminBanner) => void; onDeleted: () => void; first: boolean; last: boolean; onMove: (dir: -1 | 1) => void }) {
  const { notify } = useToast();
  const [v, setV] = useState({ title: banner.title, subtitle: banner.subtitle ?? '', ctaLabel: banner.ctaLabel ?? '', linkUrl: banner.linkUrl ?? '', imageAlt: banner.imageAlt, startsAt: day(banner.startsAt), endsAt: day(banner.endsAt), active: banner.active });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      onSaved(
        await api.patch<AdminBanner>(`/banners/${banner.id}`, {
          title: v.title.trim(),
          subtitle: v.subtitle.trim() || null,
          ctaLabel: v.ctaLabel.trim() || null,
          linkUrl: v.linkUrl.trim() || null,
          imageAlt: v.imageAlt.trim(),
          startsAt: toIso(v.startsAt),
          endsAt: toIso(v.endsAt, true),
          active: v.active,
        }),
      );
      notify('Bannière enregistrée. L’accueil est mis à jour sous une minute.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.set('file', file);
    try {
      onSaved(await api.post<AdminBanner>(`/banners/${banner.id}/image`, form));
      notify('Photo remplacée.');
    } catch (err) {
      notify(errorMessage(err), 'bad');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          {banner.title}
          {banner.active ? <Tag tone="ok">Affichée</Tag> : <Tag>Masquée</Tag>}
        </span>
      }
      actions={
        <div className="flex items-center gap-1">
          <button type="button" disabled={first} onClick={() => onMove(-1)} aria-label="Monter" className="inline-flex size-8 items-center justify-center text-muted hover:text-ink disabled:opacity-30"><ArrowUp className="size-4" /></button>
          <button type="button" disabled={last} onClick={() => onMove(1)} aria-label="Descendre" className="inline-flex size-8 items-center justify-center text-muted hover:text-ink disabled:opacity-30"><ArrowDown className="size-4" /></button>
          <button
            type="button"
            aria-label="Supprimer"
            className="inline-flex size-8 items-center justify-center text-muted hover:text-bad"
            onClick={async () => {
              if (!window.confirm(`Supprimer la bannière « ${banner.title} » ?`)) return;
              try {
                await api.delete(`/banners/${banner.id}`);
                notify('Bannière supprimée.');
                onDeleted();
              } catch (err) {
                notify(errorMessage(err), 'bad');
              }
            }}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div>
          <div className="relative aspect-[16/9] overflow-hidden rounded-xs bg-paper-2">
            {banner.imageUrl ? <Image src={banner.imageUrl} alt="" fill sizes="320px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-[12.5px] text-faint">Aucune photo</span>}
          </div>
          <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-accent underline">
            {uploading ? <Spinner className="size-3.5" /> : <ImagePlus className="size-3.5" />}
            {banner.imageUrl ? 'Remplacer la photo' : 'Ajouter une photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
          </label>
          <p className="mt-1 text-[12px] text-muted">Format paysage conseillé (1600 × 900 px environ), 8 Mo maximum.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titre" className="sm:col-span-2">{(p) => <Input {...p} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={90} />}</Field>
          <Field label="Sous-titre" optional className="sm:col-span-2">{(p) => <Input {...p} value={v.subtitle} onChange={(e) => setV({ ...v, subtitle: e.target.value })} maxLength={200} />}</Field>
          <Field label="Texte du bouton" optional>{(p) => <Input {...p} value={v.ctaLabel} onChange={(e) => setV({ ...v, ctaLabel: e.target.value })} maxLength={40} placeholder="Voir les smartphones" />}</Field>
          <Field label="Lien du bouton" optional hint="Ex. /categorie/smartphones, /catalogue?promo=1 ou /produit/…">{(p) => <Input {...p} value={v.linkUrl} onChange={(e) => setV({ ...v, linkUrl: e.target.value })} maxLength={300} />}</Field>
          <Field label="Début de diffusion" optional>{(p) => <Input {...p} type="date" value={v.startsAt} onChange={(e) => setV({ ...v, startsAt: e.target.value })} />}</Field>
          <Field label="Fin de diffusion" optional hint="Idéal pour une promotion limitée.">{(p) => <Input {...p} type="date" value={v.endsAt} onChange={(e) => setV({ ...v, endsAt: e.target.value })} />}</Field>
          <Field label="Description de la photo" optional className="sm:col-span-2" hint="Lue par les lecteurs d’écran et les moteurs de recherche.">{(p) => <Input {...p} value={v.imageAlt} onChange={(e) => setV({ ...v, imageAlt: e.target.value })} maxLength={160} />}</Field>
          <Checkbox className="sm:col-span-2" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} label="Afficher sur l’accueil" description={banner.imageUrl ? undefined : 'Ajoutez d’abord une photo.'} disabled={!banner.imageUrl} />
          <div className="sm:col-span-2">
            <FormError message={error} />
            <Button className="mt-2" onClick={save} loading={saving} disabled={v.title.trim().length < 2}>Enregistrer</Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export default function BannersPage() {
  const { notify } = useToast();
  const { data, error, reload, setData } = useResource<AdminBanner[]>('/banners');
  const [title, setTitle] = useState('');
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <LoadingBlock />;

  const create = async () => {
    try {
      const b = await api.post<AdminBanner>('/banners', { title: title.trim() });
      setData([...data, b]);
      setTitle('');
      notify('Bannière créée : ajoutez sa photo puis cochez « Afficher sur l’accueil ».');
    } catch (err) {
      notify(errorMessage(err), 'bad');
    }
  };
  const move = async (i: number, dir: -1 | 1) => {
    const ids = data.map((b) => b.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    try {
      setData(await api.post<AdminBanner[]>('/banners/order', { ids }));
    } catch (err) {
      notify(errorMessage(err), 'bad');
    }
  };

  return (
    <div className="max-w-5xl">
      <PageHeader title="Bannières de l’accueil" description="Grandes images en tête de la page d’accueil (6 au maximum affichées, dans cet ordre)." />
      <div className="space-y-6">
        {data.map((b, i) => (
          <BannerEditor key={b.id} banner={b} first={i === 0} last={i === data.length - 1} onMove={(dir) => move(i, dir)} onSaved={(nb) => setData(data.map((x) => (x.id === nb.id ? nb : x)))} onDeleted={() => setData(data.filter((x) => x.id !== b.id))} />
        ))}
        <Panel title="Nouvelle bannière">
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (title.trim().length >= 2) create(); }}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre (ex. Rentrée : ordinateurs portables)" maxLength={90} />
            <Button type="submit" variant="secondary" disabled={title.trim().length < 2}>Créer</Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
