import type { Availability, Condition } from './types';

export const CONDITION_LABELS: Record<Condition, string> = { NEW: 'Neuf', USED: 'Occasion', REFURBISHED: 'Reconditionné' };

/** États dans l'adresse du catalogue : /catalogue?etat=reconditionne */
export const CONDITION_PARAM: Record<string, Condition> = { neuf: 'NEW', occasion: 'USED', reconditionne: 'REFURBISHED' };
export const CONDITION_TO_PARAM: Record<Condition, string> = { NEW: 'neuf', USED: 'occasion', REFURBISHED: 'reconditionne' };

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  IN_STOCK: 'En stock',
  LOW_STOCK: 'Stock limité',
  OUT_OF_STOCK: 'Rupture de stock',
};

/** Tris proposés : valeur dans l'adresse → valeur de l'API. */
export const SORTS = [
  { value: 'nouveautes', api: 'newest', label: 'Nouveautés' },
  { value: 'prix-croissant', api: 'price_asc', label: 'Prix croissant' },
  { value: 'prix-decroissant', api: 'price_desc', label: 'Prix décroissant' },
] as const;

/** Rayons de l'accueil : /catalogue?rayon=ordinateurs */
export const GROUP_PARAM: Record<string, { api: string; title: string }> = {
  smartphones: { api: 'smartphones', title: 'Smartphones' },
  ordinateurs: { api: 'computers', title: 'Ordinateurs' },
  ecrans: { api: 'screens', title: 'Téléviseurs et écrans' },
  accessoires: { api: 'accessories', title: 'Accessoires et périphériques' },
};
export const GROUP_TO_PARAM: Record<string, string> = { smartphones: 'smartphones', computers: 'ordinateurs', screens: 'ecrans', accessories: 'accessoires' };

export const DAYS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
