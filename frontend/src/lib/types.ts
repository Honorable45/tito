// Types des réponses de l'API utilisées par le site public.

export type Availability = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type Condition = 'NEW' | 'USED' | 'REFURBISHED';

export interface ImageRef {
  id: string;
  url: string | null;
  alt: string;
  width: number | null;
  height: number | null;
}

export interface Ref {
  id: string;
  name: string;
  slug: string;
}

export interface ProductCard {
  id: string;
  slug: string;
  sku: string;
  name: string;
  shortDescription: string | null;
  brand: Ref | null;
  category: Ref;
  condition: Condition;
  price: number;
  priceFrom: boolean;
  compareAtPrice: number | null;
  discountPercent: number | null;
  availability: Availability;
  images: ImageRef[];
  variantCount: number;
  featured: boolean;
  isDemo: boolean;
  createdAt: string;
}

export interface Variant {
  id: string;
  sku: string;
  options: Record<string, string>;
  label: string;
  price: number;
  compareAtPrice: number | null;
  discountPercent: number | null;
  availability: Availability;
  availableQuantity: number;
}

export interface ProductDetail extends Omit<ProductCard, 'category'> {
  description: string;
  category: Ref & { specTemplate: string };
  basePrice: number;
  specs: { key: string; label: string; value: string }[];
  variants: Variant[];
  variantOptions: { key: string; label: string; values: string[] }[];
  availableQuantity: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface CatalogPage extends Paginated<ProductCard> {
  priceRange: { min: number; max: number };
  facets: {
    brands: (Ref & { count: number })[];
    conditions: { value: Condition; count: number }[];
  };
}

export interface ShopCategory extends Ref {
  description: string | null;
  specTemplate: string;
  productCount: number;
  imageUrl: string | null;
}

export interface ShopBrand extends Ref {
  productCount: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  imageAlt: string;
  linkUrl: string | null;
  ctaLabel: string | null;
}

export interface HomeData {
  banners: Banner[];
  categories: ShopCategory[];
  latest: ProductCard[];
  bestSellers: { source: 'sales' | 'featured'; items: ProductCard[] };
  promotions: ProductCard[];
  groups: { key: string; title: string; items: ProductCard[] }[];
}

export interface OpeningHour {
  dayOfWeek: number;
  closed: boolean;
  opensAt: string | null;
  closesAt: string | null;
}

export interface PublicSettings {
  shopName: string;
  tagline: string | null;
  topBarText: string | null;
  aboutText: string | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  shopImageUrl: string | null;
  shopImageAlt: string | null;
  social: { tiktok: string | null; instagram: string | null; facebook: string | null };
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  addressLine: string | null;
  city: string | null;
  country: string | null;
  mapUrl: string | null;
  location: { latitude: number; longitude: number } | null;
  legal: {
    legalName: string | null;
    legalForm: string | null;
    registrationNumber: string | null;
    taxId: string | null;
    publicationDirector: string | null;
    hostingProvider: string | null;
  };
  openingHours: OpeningHour[];
  checkout: { deliveryEnabled: boolean; deliveryFee: number; deliveryArea: string | null };
}

export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  displayName: string | null;
  serviceLabel: string;
  verified: boolean;
  shopReply: string | null;
  createdAt: string;
}

export interface ReviewsPage extends Paginated<PublicReview> {
  summary: { count: number; verifiedCount: number; average: number | null };
}
