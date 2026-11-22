import { Prisma } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
import { readOptions, readSpecs, variantLabel, VARIANT_OPTIONS } from './spec-templates';

type ImageLike = { id: string; url: string | null; storageKey: string | null; alt: string; position: number; width: number | null; height: number | null };

export function presentImage(storage: StorageService, img: ImageLike) {
  return {
    id: img.id,
    url: img.url ?? storage.publicUrl(img.storageKey),
    alt: img.alt,
    width: img.width,
    height: img.height,
    position: img.position,
  };
}

export const productPublicInclude = {
  category: { select: { id: true, name: true, slug: true, specTemplate: true } },
  brand: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { position: 'asc' } },
  variants: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
  compatibility: {
    include: { brand: { select: { id: true, name: true, slug: true } }, phoneModel: { select: { id: true, name: true, slug: true } } },
  },
} satisfies Prisma.ProductInclude;

/** Variante allégée pour les listes : seules les variantes actives comptent pour le prix « à partir de ». */
export const productListInclude = {
  ...productPublicInclude,
  images: { orderBy: { position: 'asc' }, take: 2 },
  variants: { where: { active: true }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
  compatibility: false,
} satisfies Prisma.ProductInclude;

type ProductWithPublic = Prisma.ProductGetPayload<{ include: typeof productPublicInclude }>;
type ProductWithList = Prisma.ProductGetPayload<{ include: typeof productListInclude }>;
type VariantRow = ProductWithPublic['variants'][number];
type Availability = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
const RANK: Record<Availability, number> = { OUT_OF_STOCK: 0, LOW_STOCK: 1, IN_STOCK: 2 };

export function availabilityOf(p: { stockQuantity: number; reservedQuantity: number; lowStockThreshold: number }) {
  const available = Math.max(0, p.stockQuantity - p.reservedQuantity);
  if (available === 0) return { available, availability: 'OUT_OF_STOCK' as const };
  if (available <= p.lowStockThreshold) return { available, availability: 'LOW_STOCK' as const };
  return { available, availability: 'IN_STOCK' as const };
}

/** Pourcentage de réduction arrondi, ou null si l'ancien prix n'est pas supérieur au prix. */
export function discountPercent(price: number, compareAt: number | null | undefined) {
  if (!compareAt || compareAt <= price || compareAt <= 0) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/** Disponibilité d'une variante : son stock déclaré s'il existe, sinon celui du produit. */
function variantAvailability(v: VariantRow, product: { stockQuantity: number; reservedQuantity: number; lowStockThreshold: number }) {
  if (v.stockQuantity === null) return availabilityOf(product);
  return availabilityOf({ stockQuantity: v.stockQuantity, reservedQuantity: 0, lowStockThreshold: product.lowStockThreshold });
}

function presentVariant(v: VariantRow, p: ProductWithPublic | ProductWithList) {
  const options = readOptions(v.options);
  const price = v.price ?? p.salePrice;
  const compareAt = v.compareAtPrice ?? (v.price === null ? p.compareAtPrice : null);
  const { available, availability } = variantAvailability(v, p);
  return {
    id: v.id,
    sku: v.sku,
    options,
    label: variantLabel(options),
    price,
    compareAtPrice: discountPercent(price, compareAt) ? compareAt : null,
    discountPercent: discountPercent(price, compareAt),
    availability,
    availableQuantity: Math.min(available, 10),
    active: v.active,
  };
}

/** Synthèse commerciale commune aux listes et aux fiches : prix affiché, promotion, disponibilité. */
function commercial(p: ProductWithPublic | ProductWithList) {
  const variants = p.variants.filter((v) => v.active).map((v) => presentVariant(v, p));
  const own = availabilityOf(p);
  if (!variants.length) {
    const pct = discountPercent(p.salePrice, p.compareAtPrice);
    return { variants, price: p.salePrice, priceFrom: false, compareAtPrice: pct ? p.compareAtPrice : null, discountPercent: pct, ...own };
  }
  const cheapest = variants.reduce((a, b) => (b.price < a.price ? b : a));
  const best = variants.reduce((a, b) => (RANK[b.availability] > RANK[a.availability] ? b : a));
  return {
    variants,
    price: cheapest.price,
    priceFrom: variants.some((v) => v.price !== cheapest.price),
    compareAtPrice: cheapest.compareAtPrice,
    discountPercent: variants.reduce<number | null>((m, v) => (v.discountPercent && v.discountPercent > (m ?? 0) ? v.discountPercent : m), null),
    available: best.availableQuantity,
    availability: best.availability,
  };
}

/** Dimensions réellement utilisées par les variantes, avec leurs valeurs dans l'ordre d'apparition. */
function variantDimensions(variants: { options: Record<string, string> }[]) {
  return VARIANT_OPTIONS.map((o) => ({
    key: o.key,
    label: o.label,
    values: [...new Set(variants.map((v) => v.options[o.key]).filter(Boolean))],
  })).filter((d) => d.values.length > 0);
}

export function presentCompatibility(rows: ProductWithPublic['compatibility']) {
  return rows.map((c) => ({
    brandId: c.brand.id,
    brand: c.brand.name,
    brandSlug: c.brand.slug,
    modelId: c.phoneModel?.id ?? null,
    model: c.phoneModel?.name ?? null,
  }));
}

/** Carte produit (catalogue, accueil) : jamais de coût d'achat, ni de quantité exacte au-delà de 10. */
export function presentProductCard(storage: StorageService, p: ProductWithList | ProductWithPublic) {
  const c = commercial(p);
  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    shortDescription: p.shortDescription,
    brand: p.brand,
    category: { id: p.category.id, name: p.category.name, slug: p.category.slug },
    condition: p.condition,
    price: c.price,
    priceFrom: c.priceFrom,
    compareAtPrice: c.compareAtPrice,
    discountPercent: c.discountPercent,
    availability: c.availability,
    images: p.images.slice(0, 2).map((i) => presentImage(storage, i)),
    variantCount: c.variants.length,
    featured: p.featured,
    isDemo: p.isDemo,
    createdAt: p.createdAt,
  };
}

/** Fiche publique complète. */
export function presentPublicProduct(storage: StorageService, p: ProductWithPublic) {
  const c = commercial(p);
  return {
    ...presentProductCard(storage, p),
    description: p.description,
    category: p.category,
    basePrice: p.salePrice,
    images: p.images.map((i) => presentImage(storage, i)),
    specs: readSpecs(p.specs),
    variants: c.variants,
    variantOptions: variantDimensions(c.variants),
    compatibility: presentCompatibility(p.compatibility),
    availableQuantity: Math.min(c.available, 10),
  };
}

/** Vue interne : les coûts ne sont inclus que pour les rôles autorisés. */
export function presentAdminProduct(storage: StorageService, p: ProductWithPublic & { supplier?: { id: string; name: string } | null }, withCosts: boolean) {
  const { available, availability } = availabilityOf(p);
  return {
    id: p.id,
    kind: p.kind,
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    description: p.description,
    category: p.category,
    brand: p.brand,
    condition: p.condition,
    specs: readSpecs(p.specs),
    supplier: p.supplier ?? null,
    salePrice: p.salePrice,
    compareAtPrice: p.compareAtPrice,
    discountPercent: discountPercent(p.salePrice, p.compareAtPrice),
    featured: p.featured,
    averageCost: withCosts ? p.averageCost : null,
    unitMargin: withCosts ? p.salePrice - p.averageCost : null,
    stockQuantity: p.stockQuantity,
    reservedQuantity: p.reservedQuantity,
    available,
    availability,
    lowStockThreshold: p.lowStockThreshold,
    stockValue: withCosts ? p.stockQuantity * p.averageCost : null,
    status: p.status,
    published: p.published,
    isDemo: p.isDemo,
    images: p.images.map((i) => presentImage(storage, i)),
    variants: p.variants.map((v) => ({
      ...presentVariant(v, p),
      ownPrice: v.price,
      ownCompareAtPrice: v.compareAtPrice,
      stockQuantity: v.stockQuantity,
      position: v.position,
    })),
    compatibility: presentCompatibility(p.compatibility),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
