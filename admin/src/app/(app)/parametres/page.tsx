'use client';

import { useState } from 'react';
import { HoursPanel } from '@/components/admin/settings/hours-panel';
import Link from 'next/link';
import { RepairTypesPanel } from '@/components/admin/settings/reference-panels';
import { CheckoutPanel, IdentityPanel, LegalPanel, SiteImagesPanel, type Settings } from '@/components/admin/settings/shop-settings';
import { PageHeader, Tabs } from '@/components/admin/ui';
import { ErrorState } from '@/components/ui/empty-state';
import { LoadingBlock } from '@/components/ui/spinner';
import type { OpeningHour } from '@/lib/types';
import { useResource } from '@/lib/use-resource';

interface SettingsResponse {
  settings: Settings;
  openingHours: OpeningHour[];
  paymentProviderConfigured: boolean;
}

export default function SettingsPage() {
  const [tab, setTab] = useState('shop');
  const { data, error, reload, setData } = useResource<SettingsResponse>('/settings');
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <LoadingBlock />;
  const onSaved = (settings: Settings) => setData({ ...data, settings });

  return (
    <>
      <PageHeader
        title="Paramètres"
        description={
          <>
            Coordonnées, WhatsApp et horaires. Le catalogue se gère dans <Link href="/categories" className="underline">Catégories</Link>, <Link href="/marques" className="underline">Marques</Link> et <Link href="/bannieres" className="underline">Bannières</Link>.
          </>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'shop', label: 'Boutique' },
          { value: 'hours', label: 'Horaires' },
          { value: 'images', label: 'Logo et photo' },
          { value: 'legal', label: 'Mentions légales' },
          { value: 'types', label: 'Atelier : types de panne' },
        ]}
      />
      <div className="mt-6 max-w-5xl">
        {tab === 'shop' && <IdentityPanel key={String(data.settings.updatedAt)} settings={data.settings} onSaved={onSaved} />}
        {tab === 'hours' && <HoursPanel hours={data.openingHours} />}
        {tab === 'sales' && <CheckoutPanel key={String(data.settings.updatedAt)} settings={data.settings} providerConfigured={data.paymentProviderConfigured} onSaved={onSaved} />}
        {tab === 'images' && <SiteImagesPanel settings={data.settings} onSaved={onSaved} />}
        {tab === 'legal' && <LegalPanel key={String(data.settings.updatedAt)} settings={data.settings} onSaved={onSaved} />}
        {tab === 'types' && <RepairTypesPanel />}
      </div>
    </>
  );
}
