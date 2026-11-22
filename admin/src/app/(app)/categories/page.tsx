'use client';

import { CategoriesPanel } from '@/components/admin/settings/reference-panels';
import { PageHeader } from '@/components/admin/ui';

export default function CategoriesPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader title="Catégories" description="Créer, renommer, ordonner, désactiver ou supprimer les catégories du catalogue." />
      <CategoriesPanel />
    </div>
  );
}
