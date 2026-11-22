import { BadRequestException } from '@nestjs/common';

/**
 * Gabarits de fiche technique, par type de catégorie.
 *
 * Les caractéristiques d'un produit sont stockées dans une colonne JSON (`Product.specs`) :
 * un gabarit ne fait que proposer des champs dans l'administration. Ajouter un champ ici,
 * ou une ligne libre sur un produit, ne demande aucune migration de la base.
 * La marque n'y figure pas : c'est une relation (`Product.brandId`), filtrable dans le catalogue.
 */
export interface SpecField {
  key: string;
  label: string;
  placeholder?: string;
}

export interface SpecTemplate {
  label: string;
  fields: SpecField[];
}

const SCREEN = { key: 'screenSize', label: "Taille de l'écran" };
const RESOLUTION = { key: 'resolution', label: 'Résolution', placeholder: '1080 × 2400' };
const MODEL = { key: 'model', label: 'Modèle' };
const OS = { key: 'os', label: "Système d'exploitation" };
const CONNECTIVITY = { key: 'connectivity', label: 'Connectivité' };

export const SPEC_TEMPLATES: Record<string, SpecTemplate> = {
  SMARTPHONE: {
    label: 'Smartphone / téléphone',
    fields: [
      MODEL,
      { key: 'ram', label: 'Mémoire RAM', placeholder: '8 Go' },
      { key: 'storage', label: 'Stockage interne', placeholder: '256 Go' },
      { ...SCREEN, placeholder: '6,7 pouces' },
      RESOLUTION,
      { key: 'processor', label: 'Processeur' },
      { key: 'battery', label: 'Capacité de la batterie', placeholder: '5000 mAh' },
      { key: 'camera', label: 'Appareil photo', placeholder: '50 Mpx + 12 Mpx' },
      { ...OS, placeholder: 'Android 14' },
      { key: 'colors', label: 'Couleurs disponibles' },
      { ...CONNECTIVITY, placeholder: '5G, Wi‑Fi 6, Bluetooth 5.3, double SIM' },
    ],
  },
  LAPTOP: {
    label: 'Ordinateur portable',
    fields: [
      MODEL,
      { key: 'processor', label: 'Processeur', placeholder: 'Intel Core i5' },
      { key: 'cpuGeneration', label: 'Génération du processeur', placeholder: '12e génération' },
      { key: 'ram', label: 'Mémoire RAM', placeholder: '16 Go' },
      { key: 'storage', label: 'Stockage (SSD / HDD)', placeholder: 'SSD 512 Go' },
      { ...SCREEN, placeholder: '15,6 pouces' },
      { key: 'gpu', label: 'Carte graphique' },
      { ...OS, placeholder: 'Windows 11' },
      { key: 'batteryHealth', label: 'État de la batterie', placeholder: '92 %' },
    ],
  },
  DESKTOP: {
    label: 'Ordinateur de bureau',
    fields: [
      MODEL,
      { key: 'processor', label: 'Processeur' },
      { key: 'cpuGeneration', label: 'Génération du processeur' },
      { key: 'ram', label: 'Mémoire RAM' },
      { key: 'storage', label: 'Stockage (SSD / HDD)' },
      { key: 'gpu', label: 'Carte graphique' },
      OS,
      { key: 'formFactor', label: 'Format', placeholder: 'Tour, mini PC, tout-en-un' },
      { key: 'ports', label: 'Connectique' },
    ],
  },
  TV: {
    label: 'Téléviseur',
    fields: [
      MODEL,
      { key: 'screenSize', label: 'Taille (pouces)', placeholder: '55 pouces' },
      { key: 'resolution', label: 'Résolution', placeholder: '4K UHD' },
      { key: 'panel', label: "Technologie d'écran", placeholder: 'LED, QLED, OLED' },
      { key: 'smartTv', label: 'Smart TV', placeholder: 'Oui — Android TV' },
      { ...CONNECTIVITY, placeholder: '3 HDMI, 2 USB, Wi‑Fi' },
      { key: 'screenType', label: "Type d'écran", placeholder: 'Plat, incurvé' },
    ],
  },
  MONITOR: {
    label: 'Écran / moniteur',
    fields: [
      MODEL,
      { key: 'screenSize', label: 'Taille (pouces)', placeholder: '27 pouces' },
      RESOLUTION,
      { key: 'panel', label: 'Dalle', placeholder: 'IPS, VA' },
      { key: 'refreshRate', label: 'Fréquence', placeholder: '144 Hz' },
      { key: 'responseTime', label: 'Temps de réponse', placeholder: '1 ms' },
      { ...CONNECTIVITY, placeholder: 'HDMI, DisplayPort' },
    ],
  },
  ACCESSORY: {
    label: 'Accessoire',
    fields: [
      { key: 'compatibility', label: 'Compatibilité', placeholder: 'iPhone 13 à 15' },
      { key: 'connection', label: 'Type de connexion', placeholder: 'USB‑C, Bluetooth' },
      { key: 'color', label: 'Couleur' },
      { key: 'features', label: 'Caractéristiques particulières' },
    ],
  },
  PERIPHERAL: {
    label: 'Périphérique',
    fields: [
      MODEL,
      { key: 'compatibility', label: 'Compatibilité' },
      { key: 'connection', label: 'Type de connexion', placeholder: 'USB, sans fil 2,4 GHz' },
      { key: 'color', label: 'Couleur' },
      { key: 'features', label: 'Caractéristiques particulières' },
    ],
  },
  GENERIC: { label: 'Autre (champs libres)', fields: [] },
};

export const SPEC_TEMPLATE_KEYS = Object.keys(SPEC_TEMPLATES);

/** Regroupements de l'accueil : sélections construites à partir des gabarits, pas des noms de catégorie. */
export const HOME_GROUPS = [
  { key: 'smartphones', title: 'Smartphones', templates: ['SMARTPHONE'] },
  { key: 'computers', title: 'Ordinateurs', templates: ['LAPTOP', 'DESKTOP'] },
  { key: 'screens', title: 'Téléviseurs et écrans', templates: ['TV', 'MONITOR'] },
  { key: 'accessories', title: 'Accessoires et périphériques', templates: ['ACCESSORY', 'PERIPHERAL'] },
] as const;

/** Dimensions possibles d'une variante. */
export const VARIANT_OPTIONS = [
  { key: 'color', label: 'Couleur' },
  { key: 'storage', label: 'Stockage' },
  { key: 'ram', label: 'RAM' },
  { key: 'size', label: 'Taille' },
  { key: 'model', label: 'Modèle' },
] as const;

const VARIANT_KEYS = new Set<string>(VARIANT_OPTIONS.map((o) => o.key));

export interface SpecRow {
  key: string;
  label: string;
  value: string;
}

/** Nettoie les caractéristiques : lignes vides retirées, clés normalisées, doublons écartés. */
export function cleanSpecs(rows: { key?: string; label: string; value: string }[]): SpecRow[] {
  const seen = new Set<string>();
  const out: SpecRow[] = [];
  for (const r of rows) {
    const label = r.label.trim();
    const value = r.value.trim();
    if (!label || !value) continue;
    const key = (r.key?.trim() || label)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'champ';
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, label: label.slice(0, 60), value: value.slice(0, 300) });
  }
  return out;
}

/** Valide les options d'une variante : au moins une dimension connue, valeurs courtes et non vides. */
export function cleanVariantOptions(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BadRequestException('Options de variante invalides.');
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!VARIANT_KEYS.has(k)) throw new BadRequestException(`Option de variante inconnue : ${k}.`);
    if (v === null || v === undefined || v === '') continue;
    if (typeof v !== 'string' || v.trim().length > 40) throw new BadRequestException('Chaque option doit être un texte de 40 caractères au plus.');
    if (v.trim()) out[k] = v.trim();
  }
  if (!Object.keys(out).length) throw new BadRequestException('Renseignez au moins une option (couleur, stockage…).');
  return out;
}

/** « Noir · 256 Go » — libellé lisible, dans l'ordre des dimensions. */
export function variantLabel(options: Record<string, string>): string {
  return VARIANT_OPTIONS.map((o) => options[o.key]).filter(Boolean).join(' · ');
}

export function readOptions(json: unknown): Record<string, string> {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return {};
  return Object.fromEntries(Object.entries(json as Record<string, unknown>).filter(([, v]) => typeof v === 'string')) as Record<string, string>;
}

export function readSpecs(json: unknown): SpecRow[] {
  if (!Array.isArray(json)) return [];
  return json.filter((r): r is SpecRow => Boolean(r) && typeof r === 'object' && typeof r.label === 'string' && typeof r.value === 'string');
}
