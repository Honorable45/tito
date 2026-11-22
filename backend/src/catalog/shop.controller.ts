import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { Prisma, ProductCondition } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Public } from '../auth/decorators';
import { paginate, PageQuery, skipTake } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { presentBanner } from './banners.controller';
import { presentProductCard, presentPublicProduct, productListInclude, productPublicInclude } from './presenters';
import { HOME_GROUPS, SPEC_TEMPLATES, VARIANT_OPTIONS } from './spec-templates';

const bool = ({ value }: { value: unknown }) => value === true || value === 'true' || value === '1';

class ShopQuery extends PageQuery {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  /** Marque du produit (slug). */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  brand?: string;

  /** Accessoires compatibles avec un modèle de téléphone (identifiant). */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  model?: string;

  @IsOptional()
  @IsEnum(ProductCondition, { message: 'État invalide.' })
  condition?: ProductCondition;

  /** Regroupement de l'accueil (smartphones, computers, screens, accessories). */
  @IsOptional()
  @IsIn(HOME_GROUPS.map((g) => g.key), { message: 'Rayon inconnu.' })
  group?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(100_000_000)
  maxPrice?: number;

  @IsOptional()
  @IsIn(['newest', 'price_asc', 'price_desc'], { message: 'Tri inconnu.' })
  order?: 'newest' | 'price_asc' | 'price_desc';

  @IsOptional()
  @Transform(bool)
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @Transform(bool)
  @IsBoolean()
  promo?: boolean;
}

/** Catalogue public : produits actifs et publiés uniquement. */
@Public()
@Controller('shop')
export class ShopController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private visible(): Prisma.ProductWhereInput {
    return { kind: 'ACCESSORY', status: 'ACTIVE', published: true, category: { active: true } };
  }

  private inStock(): Prisma.ProductWhereInput {
    // Disponible si le produit a du stock, ou si l'une de ses variantes actives a un stock déclaré.
    return {
      OR: [
        { stockQuantity: { gt: this.prisma.product.fields.reservedQuantity } },
        { variants: { some: { active: true, stockQuantity: { gt: 0 } } } },
      ],
    };
  }

  private promo(): Prisma.ProductWhereInput {
    return {
      OR: [
        { compareAtPrice: { gt: this.prisma.product.fields.salePrice } },
        { variants: { some: { active: true, compareAtPrice: { not: null } } } },
      ],
    };
  }

  private async cards(where: Prisma.ProductWhereInput, take: number, orderBy: Prisma.ProductOrderByWithRelationInput[] = [{ createdAt: 'desc' }]) {
    const rows = await this.prisma.product.findMany({ where, include: productListInclude, orderBy, take });
    return rows.map((p) => presentProductCard(this.storage, p));
  }

  /** Libellés des gabarits et des options de variantes (affichage des fiches). */
  @Get('meta')
  meta() {
    return {
      specTemplates: Object.fromEntries(Object.entries(SPEC_TEMPLATES).map(([k, t]) => [k, t])),
      variantOptions: VARIANT_OPTIONS,
      conditions: [
        { value: 'NEW', label: 'Neuf' },
        { value: 'USED', label: 'Occasion' },
        { value: 'REFURBISHED', label: 'Reconditionné' },
      ],
      groups: HOME_GROUPS,
    };
  }

  @Get('categories')
  async categories() {
    const categories = await this.prisma.category.findMany({
      where: { kind: 'ACCESSORY', active: true },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        specTemplate: true,
        _count: { select: { products: { where: this.visible() } } },
        // Photo représentative : celle du produit publié le plus récent de la catégorie.
        products: { where: { ...this.visible(), images: { some: {} } }, orderBy: { createdAt: 'desc' }, take: 1, select: { images: { orderBy: { position: 'asc' }, take: 1 } } },
      },
    });
    return categories.map(({ _count, products, ...c }) => {
      const img = products[0]?.images[0];
      return { ...c, productCount: _count.products, imageUrl: img ? (img.url ?? this.storage.publicUrl(img.storageKey)) : null };
    });
  }

  /** Marques actives ; `productCount` = produits publiés (les marques sans produit restent utiles aux compatibilités). */
  @Get('brands')
  async brands() {
    const brands = await this.prisma.brand.findMany({
      where: { active: true },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { products: { where: this.visible() } } },
        models: { where: { active: true }, orderBy: [{ position: 'asc' }, { name: 'asc' }], select: { id: true, name: true, slug: true } },
      },
    });
    return brands.map(({ _count, ...b }) => ({ ...b, productCount: _count.products }));
  }

  @Get('banners')
  async banners() {
    const now = new Date();
    const rows = await this.prisma.banner.findMany({
      where: {
        active: true,
        OR: [{ url: { not: null } }, { storageKey: { not: null } }],
        AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      take: 6,
    });
    return rows.map((b) => presentBanner(this.storage, b));
  }

  @Get('products')
  async products(@Query() q: ShopQuery) {
    // Filtres hors marque et état : servent aussi au calcul des compteurs (facettes).
    const base: Prisma.ProductWhereInput[] = [this.visible()];
    if (q.category) base.push({ category: { slug: q.category, active: true } });
    if (q.group) base.push({ category: { specTemplate: { in: [...HOME_GROUPS.find((g) => g.key === q.group)!.templates] } } });
    if (q.q) {
      const term = q.q.trim();
      base.push({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { shortDescription: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { brand: { name: { contains: term, mode: 'insensitive' } } },
          { category: { name: { contains: term, mode: 'insensitive' } } },
          { sku: { equals: term.toUpperCase() } },
          { variants: { some: { sku: { equals: term.toUpperCase() } } } },
        ],
      });
    }
    if (q.minPrice !== undefined || q.maxPrice !== undefined) base.push({ salePrice: { gte: q.minPrice, lte: q.maxPrice } });
    if (q.model) {
      const model = await this.prisma.phoneModel.findUnique({ where: { id: q.model } });
      base.push({ compatibility: { some: { OR: [{ phoneModelId: q.model }, ...(model ? [{ brandId: model.brandId, phoneModelId: null }] : [])] } } });
    }
    if (q.available) base.push(this.inStock());
    if (q.promo) base.push(this.promo());

    const and = [...base];
    if (q.brand) and.push({ brand: { slug: q.brand } });
    if (q.condition) and.push({ condition: q.condition });
    const where: Prisma.ProductWhereInput = { AND: and };

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      q.order === 'price_asc' ? { salePrice: 'asc' } : q.order === 'price_desc' ? { salePrice: 'desc' } : { createdAt: 'desc' };

    const pageQuery = Object.assign(new PageQuery(), q, { pageSize: Math.min(q.pageSize ?? 24, 48) });
    const brandFacetWhere: Prisma.ProductWhereInput = { AND: [...base, ...(q.condition ? [{ condition: q.condition }] : [])] };
    const conditionFacetWhere: Prisma.ProductWhereInput = { AND: [...base, ...(q.brand ? [{ brand: { slug: q.brand } }] : [])] };
    const [rows, total, bounds, brandCounts, conditionCounts] = await Promise.all([
      this.prisma.product.findMany({ where, include: productListInclude, orderBy: [orderBy, { id: 'asc' }], ...skipTake(pageQuery) }),
      this.prisma.product.count({ where }),
      this.prisma.product.aggregate({ where: { AND: base }, _min: { salePrice: true }, _max: { salePrice: true } }),
      this.prisma.product.groupBy({ by: ['brandId'], where: brandFacetWhere, _count: { _all: true } }),
      this.prisma.product.groupBy({ by: ['condition'], where: conditionFacetWhere, _count: { _all: true } }),
    ]);
    const brandIds = brandCounts.map((b) => b.brandId).filter((id): id is string => Boolean(id));
    const brands = await this.prisma.brand.findMany({ where: { id: { in: brandIds } }, select: { id: true, name: true, slug: true } });
    return {
      ...paginate(
        rows.map((p) => presentProductCard(this.storage, p)),
        total,
        pageQuery,
      ),
      priceRange: { min: bounds._min.salePrice ?? 0, max: bounds._max.salePrice ?? 0 },
      facets: {
        brands: brands
          .map((b) => ({ ...b, count: brandCounts.find((c) => c.brandId === b.id)?._count._all ?? 0 }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
        conditions: conditionCounts.map((c) => ({ value: c.condition, count: c._count._all })),
      },
    };
  }

  @Get('products/:slug')
  async product(@Param('slug') slug: string) {
    const product = await this.prisma.product.findFirst({ where: { slug, ...this.visible() }, include: productPublicInclude });
    if (!product) throw new NotFoundException('Produit introuvable.');

    // Produits similaires : même catégorie (même marque en premier), disponibles.
    const related = await this.prisma.product.findMany({
      where: { AND: [this.visible(), this.inStock(), { categoryId: product.categoryId, id: { not: product.id } }] },
      include: productListInclude,
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
    related.sort((a, b) => Number(b.brandId === product.brandId) - Number(a.brandId === product.brandId));
    return {
      product: presentPublicProduct(this.storage, product),
      related: related.slice(0, 8).map((p) => presentProductCard(this.storage, p)),
    };
  }

  /** Sélection mise en avant (accueil). */
  @Get('featured')
  featured() {
    return this.cards({ AND: [this.visible(), { featured: true }] }, 8);
  }

  /**
   * Meilleures ventes : quantités vendues (ventes terminées, retours déduits) sur 180 jours.
   * Sans historique de vente, la liste est vide : l'accueil affiche alors la sélection mise en avant.
   */
  private async bestSellers(take: number) {
    const since = new Date(Date.now() - 180 * 24 * 3600 * 1000);
    const sales = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { productId: { not: null }, order: { status: 'COMPLETED', completedAt: { gte: since } }, product: this.visible() },
      _sum: { quantity: true, returnedQuantity: true },
    });
    const ranked = sales
      .map((s) => ({ id: s.productId!, sold: (s._sum.quantity ?? 0) - (s._sum.returnedQuantity ?? 0) }))
      .filter((s) => s.sold > 0)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, take);
    if (!ranked.length) return [];
    const rows = await this.prisma.product.findMany({ where: { id: { in: ranked.map((r) => r.id) } }, include: productListInclude });
    return ranked.map((r) => rows.find((p) => p.id === r.id)).filter((p) => p !== undefined).map((p) => presentProductCard(this.storage, p));
  }

  /** Données de la page d'accueil, en une requête. */
  @Get('home')
  async home() {
    const visible = this.visible();
    const [banners, categories, latest, best, featured, promotions, ...groups] = await Promise.all([
      this.banners(),
      this.categories(),
      this.cards({ AND: [visible, { images: { some: {} } }] }, 8),
      this.bestSellers(8),
      this.cards({ AND: [visible, { featured: true }] }, 8),
      this.cards({ AND: [visible, this.promo()] }, 8, [{ updatedAt: 'desc' }]),
      ...HOME_GROUPS.map((g) =>
        this.cards({ AND: [visible, this.inStock(), { category: { specTemplate: { in: [...g.templates] } } }] }, 8),
      ),
    ]);
    return {
      banners,
      categories: categories.filter((c) => c.productCount > 0),
      latest,
      bestSellers: best.length ? { source: 'sales' as const, items: best } : { source: 'featured' as const, items: featured },
      promotions,
      groups: HOME_GROUPS.map((g, i) => ({ key: g.key, title: g.title, items: groups[i] })).filter((g) => g.items.length > 0),
    };
  }
}
