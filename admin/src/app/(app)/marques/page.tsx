'use client';

import { BrandsPanel } from '@/components/admin/settings/reference-panels';
import { PageHeader } from '@/components/admin/ui';

export default function BrandsPage() {
  return (
    <div className="max-w-5xl">
      <PageHeader title="Marques" description="Les marques proposées dans les fiches produit et dans les filtres du site." />
      <BrandsPanel />
    </div>
  );
}
