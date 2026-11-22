import 'server-only';
import { cache } from 'react';
import { serverGet } from './server-api';
import type { PublicSettings, ShopCategory } from './types';

/** Valeurs neutres si l'API ne répond pas : le site reste consultable, sans coordonnées inventées. */
const FALLBACK: PublicSettings = {
  shopName: 'TitoTrade',
  tagline: null,
  topBarText: null,
  aboutText: null,
  logoUrl: null,
  heroImageUrl: null,
  heroImageAlt: null,
  shopImageUrl: null,
  shopImageAlt: null,
  social: { tiktok: null, instagram: null, facebook: null },
  phone: null,
  whatsapp: null,
  email: null,
  addressLine: null,
  city: null,
  country: null,
  mapUrl: null,
  location: null,
  legal: { legalName: null, legalForm: null, registrationNumber: null, taxId: null, publicationDirector: null, hostingProvider: null },
  openingHours: [],
  checkout: { deliveryEnabled: false, deliveryFee: 0, deliveryArea: null },
};

export const getSettings = cache(async () => (await serverGet<PublicSettings>('/settings/public', 120)) ?? FALLBACK);
export const getCategories = cache(async () => ((await serverGet<ShopCategory[]>('/shop/categories', 120)) ?? []).filter((c) => c.productCount > 0));
