import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductCondition, ProductKind } from '@prisma/client';
import { AuditService } from '../common/audit.service';
import { randomReference } from '../common/counters';
import { cleanOptional, slugify } from '../common/text';
import { StockService } from '../inventory/stock.service';
import { PrismaService, Tx } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { presentAdminProduct, productPublicInclude } from './presenters';
import { cleanSpecs, cleanVariantOptions, readOptions, variantLabel } from './spec-templates';

export interface CompatibilityInput {
  brandId: string;
  modelId?: string | null;
}

export interface SpecInput {
  key?: string;
  label: string;
  value: string;
}

export interface ProductInput {
  kind?: ProductKind;
  name: string;
  sku?: string;
  shortDescription?: string | null;
  description?: string;
  categoryId: string;
  brandId?: string | null;
  condition?: ProductCondition;
  specs?: SpecInput[];
  supplierId?: string | null;
  salePrice: number;
  compareAtPrice?: number | null;
  featured?: boolean;
  lowStockThreshold?: number;
  published?: boolean;
  compatibility?: CompatibilityInput[];
  initialStock?: number;
  initialUnitCost?: number;
}

export interface VariantInput {
  sku?: string;
  options: Record<string, string>;
  price?: number | null;
  compareAtPrice?: number | null;
  stockQuantity?: number | null;
  active?: boolean;
}

/** Préfixes des références générées : TT-7K3QX9 (produit vendu), PCE-… (pièce d'atelier). */
const SKU_PREFIX: Record<ProductKind, string> = { ACCESSORY: 'TT', PART: 'PCE' };
const MAX_VARIANTS = 60;
const MAX_IMAGES = 10;

const adminInclude = { ...productPublicInclude, supplier: { select: { id: true, name: true } } } satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async get(id: string, withCosts: boolean) {
    const p = await this.prisma.product.findUnique({ where: { id }, include: adminInclude });
    if (!p) throw new NotFoundException('Produit introuvable.');
    return presentAdminProduct(this.storage, p, withCosts);
  }

  private async uniqueSlug(tx: Tx, name: string, excludeId?: string) {
    const base = slugify(name) || 'produit';
    let slug = base;
    for (let i = 2; await tx.product.findFirst({ where: { slug, id: excludeId ? { not: excludeId } : undefined } }); i++) {
      slug = `${base}-${i}`;
    }
    return slug;
  }

  /** Une référence est unique sur l'ensemble produits + variantes (elle figure dans les messages WhatsApp). */
  private async skuTaken(tx: Tx, sku: string, except?: { productId?: string; variantId?: string }) {
    const [p, v] = await Promise.all([
      tx.product.findFirst({ where: { sku, id: except?.productId ? { not: except.productId } : undefined }, select: { id: true } }),
      tx.productVariant.findFirst({ where: { sku, id: except?.variantId ? { not: except.variantId } : undefined }, select: { id: true } }),
    ]);
    return Boolean(p || v);
  }

  private assertPromo(price: number | undefined, compareAt: number | null | undefined) {
    if (compareAt !== null && compareAt !== undefined && price !== undefined && compareAt <= price) {
      throw new BadRequestException("L'ancien prix doit être supérieur au prix de vente (ou laissé vide).");
    }
  }

  private async validateRefs(tx: Tx, input: Partial<ProductInput>, kind: ProductKind) {
    if (input.categoryId) {
      const category = await tx.category.findUnique({ where: { id: input.categoryId } });
      if (!category) throw new BadRequestException('Catégorie introuvable.');
      if (category.kind !== kind) {
        throw new BadRequestException(kind === 'PART' ? 'Choisissez une catégorie de pièces détachées.' : 'Choisissez une catégorie du catalogue.');
      }
    }
    if (input.brandId) {
      const brand = await tx.brand.findUnique({
        where: { id: input.brandId },
        select: { id: true, categories: { where: { id: input.categoryId }, select: { id: true } } },
      });
      if (!brand) throw new BadRequestException('Marque introuvable.');
      if (input.categoryId && !brand.categories?.length) {
        throw new BadRequestException('Cette marque n’est pas disponible pour la catégorie choisie.');
      }
    }
    if (input.compatibility?.length) {
      const modelIds = input.compatibility.map((c) => c.modelId).filter((m): m is string => Boolean(m));
      const models = await tx.phoneModel.findMany({ where: { id: { in: modelIds } } });
      for (const c of input.compatibility) {
        if (c.modelId && models.find((m) => m.id === c.modelId)?.brandId !== c.brandId) {
          throw new BadRequestException('Compatibilité invalide : le modèle ne correspond pas à la marque.');
        }
      }
    }
  }

  private async replaceCompatibility(tx: Tx, productId: string, items: CompatibilityInput[]) {
    await tx.productCompatibility.deleteMany({ where: { productId } });
    // Déduplication : une compatibilité « marque entière » rend inutiles les modèles de cette marque.
    const wholeBrands = new Set(items.filter((c) => !c.modelId).map((c) => c.brandId));
    const seen = new Set<string>();
    const rows = items.filter((c) => {
      if (c.modelId && wholeBrands.has(c.brandId)) return false;
      const key = `${c.brandId}:${c.modelId ?? '*'}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (rows.length) {
      await tx.productCompatibility.createMany({
        data: rows.map((c) => ({ productId, brandId: c.brandId, phoneModelId: c.modelId ?? null })),
      });
    }
  }

  async create(input: ProductInput, userId: string, withCosts: boolean) {
    const kind = input.kind ?? 'ACCESSORY';
    if ((input.initialStock ?? 0) > 0 && input.initialUnitCost === undefined) {
      throw new BadRequestException('Indiquez le coût unitaire du stock initial.');
    }
    this.assertPromo(input.salePrice, input.compareAtPrice);

    const id = await this.prisma.run(async (tx) => {
      await this.validateRefs(tx, input, kind);
      let sku = cleanOptional(input.sku)?.toUpperCase() ?? null;
      if (sku && (await this.skuTaken(tx, sku))) throw new ConflictException('Cette référence existe déjà.');
      sku ??= await randomReference(SKU_PREFIX[kind], (r) => this.skuTaken(tx, r));

      const product = await tx.product.create({
        data: {
          kind,
          sku,
          slug: await this.uniqueSlug(tx, input.name),
          name: input.name.trim(),
          shortDescription: cleanOptional(input.shortDescription),
          description: input.description?.trim() ?? '',
          categoryId: input.categoryId,
          brandId: input.brandId ?? null,
          condition: input.condition ?? 'NEW',
          specs: cleanSpecs(input.specs ?? []) as unknown as Prisma.InputJsonValue,
          supplierId: input.supplierId ?? null,
          salePrice: input.salePrice,
          compareAtPrice: input.compareAtPrice ?? null,
          featured: input.featured ?? false,
          lowStockThreshold: input.lowStockThreshold ?? 2,
          // Une pièce détachée n'est jamais publiée sur le site.
          published: kind === 'ACCESSORY' ? (input.published ?? true) : false,
        },
      });
      if (input.compatibility) await this.replaceCompatibility(tx, product.id, input.compatibility);
      if ((input.initialStock ?? 0) > 0) {
        await this.stock.receive(tx, {
          productId: product.id,
          quantity: input.initialStock!,
          unitCost: input.initialUnitCost!,
          type: 'INITIAL',
          reason: 'Stock initial à la création de la fiche',
          userId,
        });
      }
      await this.audit.log(
        { userId, action: 'product.create', entity: 'Product', entityId: product.id, summary: `Produit créé : ${product.name} (${product.sku})` },
        tx,
      );
      return product.id;
    });
    return this.get(id, withCosts);
  }

  async update(id: string, input: Partial<ProductInput>, userId: string, withCosts: boolean) {
    await this.prisma.run(async (tx) => {
      const current = await tx.product.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Produit introuvable.');
      await this.validateRefs(tx, input, current.kind);
      this.assertPromo(
        input.salePrice ?? current.salePrice,
        input.compareAtPrice === undefined ? (input.salePrice !== undefined ? current.compareAtPrice : undefined) : input.compareAtPrice,
      );

      const data: Prisma.ProductUncheckedUpdateInput = {};
      if (input.name !== undefined) data.name = input.name.trim();
      if (input.shortDescription !== undefined) data.shortDescription = cleanOptional(input.shortDescription);
      if (input.description !== undefined) data.description = input.description.trim();
      if (input.categoryId !== undefined) data.categoryId = input.categoryId;
      if (input.brandId !== undefined) data.brandId = input.brandId || null;
      if (input.condition !== undefined) data.condition = input.condition;
      if (input.specs !== undefined) data.specs = cleanSpecs(input.specs) as unknown as Prisma.InputJsonValue;
      if (input.supplierId !== undefined) data.supplierId = input.supplierId;
      if (input.salePrice !== undefined) data.salePrice = input.salePrice;
      if (input.compareAtPrice !== undefined) data.compareAtPrice = input.compareAtPrice;
      if (input.featured !== undefined) data.featured = input.featured;
      if (input.lowStockThreshold !== undefined) data.lowStockThreshold = input.lowStockThreshold;
      if (input.published !== undefined) data.published = current.kind === 'ACCESSORY' ? input.published : false;
      if (input.sku !== undefined) {
        const sku = input.sku.trim().toUpperCase();
        if (!sku) throw new BadRequestException('La référence ne peut pas être vide.');
        if (sku !== current.sku && (await this.skuTaken(tx, sku, { productId: id }))) throw new ConflictException('Cette référence existe déjà.');
        data.sku = sku;
      }

      await tx.product.update({ where: { id }, data });
      if (input.compatibility) await this.replaceCompatibility(tx, id, input.compatibility);

      const priceChanged = input.salePrice !== undefined && input.salePrice !== current.salePrice;
      const promoChanged = input.compareAtPrice !== undefined && input.compareAtPrice !== current.compareAtPrice;
      if (priceChanged || promoChanged) {
        await this.audit.log(
          {
            userId,
            action: 'product.price',
            entity: 'Product',
            entityId: id,
            summary: `Prix modifié : ${current.salePrice} → ${input.salePrice ?? current.salePrice} XOF${promoChanged ? ` (ancien prix : ${input.compareAtPrice ?? 'aucun'})` : ''}`,
            details: { before: { salePrice: current.salePrice, compareAtPrice: current.compareAtPrice }, after: { salePrice: input.salePrice, compareAtPrice: input.compareAtPrice } },
          },
          tx,
        );
      }
      if (input.published !== undefined && input.published !== current.published) {
        await this.audit.log(
          { userId, action: input.published ? 'product.publish' : 'product.unpublish', entity: 'Product', entityId: id, summary: `${input.published ? 'Produit publié' : 'Produit retiré du site'} : ${current.name}` },
          tx,
        );
      }
    });
    return this.get(id, withCosts);
  }

  async setStatus(id: string, status: 'ACTIVE' | 'ARCHIVED', userId: string, withCosts: boolean) {
    const product = await this.prisma.product.update({ where: { id }, data: { status } });
    await this.audit.log({
      userId,
      action: status === 'ARCHIVED' ? 'product.archive' : 'product.restore',
      entity: 'Product',
      entityId: id,
      summary: `${status === 'ARCHIVED' ? 'Produit archivé' : 'Produit réactivé'} : ${product.name}`,
    });
    return this.get(id, withCosts);
  }

  /**
   * Suppression définitive : réservée aux fiches sans aucun historique (ventes, stock, achats, réparations).
   * Une fiche qui a un historique est archivée à la place, pour ne pas fausser la comptabilité.
   */
  async remove(id: string, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: true, _count: { select: { movements: true, orderItems: true, purchaseItems: true, repairParts: true, countLines: true } } },
    });
    if (!product) throw new NotFoundException('Produit introuvable.');
    const history = Object.values(product._count).reduce((a, b) => a + b, 0);
    if (history > 0) {
      throw new ConflictException('Ce produit a un historique (stock, ventes ou achats) : archivez-le plutôt que de le supprimer.');
    }
    await this.prisma.product.delete({ where: { id } });
    for (const img of product.images) if (img.storageKey) await this.storage.removePublicImage(img.storageKey);
    await this.audit.log({ userId, action: 'product.delete', entity: 'Product', entityId: id, summary: `Produit supprimé : ${product.name} (${product.sku})` });
  }

  // ───────────────────────────── Variantes

  private async assertUniqueCombination(tx: Tx, productId: string, options: Record<string, string>, exceptId?: string) {
    const siblings = await tx.productVariant.findMany({ where: { productId, id: exceptId ? { not: exceptId } : undefined } });
    const key = variantLabel(options).toLowerCase();
    if (siblings.some((s) => variantLabel(readOptions(s.options)).toLowerCase() === key)) {
      throw new ConflictException('Une variante avec ces options existe déjà.');
    }
  }

  async addVariant(productId: string, input: VariantInput, userId: string) {
    await this.prisma.run(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId }, include: { _count: { select: { variants: true } } } });
      if (!product) throw new NotFoundException('Produit introuvable.');
      if (product._count.variants >= MAX_VARIANTS) throw new BadRequestException(`${MAX_VARIANTS} variantes maximum par produit.`);
      const options = cleanVariantOptions(input.options);
      await this.assertUniqueCombination(tx, productId, options);
      this.assertPromo(input.price ?? product.salePrice, input.compareAtPrice);
      let sku = cleanOptional(input.sku)?.toUpperCase() ?? null;
      if (sku && (await this.skuTaken(tx, sku))) throw new ConflictException('Cette référence existe déjà.');
      if (!sku) {
        for (let n = product._count.variants + 1; !sku || (await this.skuTaken(tx, sku)); n++) sku = `${product.sku}-${String(n).padStart(2, '0')}`;
      }
      const variant = await tx.productVariant.create({
        data: {
          productId,
          sku,
          options,
          price: input.price ?? null,
          compareAtPrice: input.compareAtPrice ?? null,
          stockQuantity: input.stockQuantity ?? null,
          active: input.active ?? true,
          position: product._count.variants,
        },
      });
      await this.audit.log({ userId, action: 'variant.create', entity: 'Product', entityId: productId, summary: `Variante ajoutée : ${product.name} — ${variantLabel(options)} (${variant.sku})` }, tx);
    });
  }

  async updateVariant(productId: string, variantId: string, input: Partial<VariantInput>, userId: string) {
    await this.prisma.run(async (tx) => {
      const variant = await tx.productVariant.findFirst({ where: { id: variantId, productId }, include: { product: true } });
      if (!variant) throw new NotFoundException('Variante introuvable.');
      const data: Prisma.ProductVariantUpdateInput = {};
      if (input.options !== undefined) {
        const options = cleanVariantOptions(input.options);
        await this.assertUniqueCombination(tx, productId, options, variantId);
        data.options = options;
      }
      if (input.price !== undefined) data.price = input.price;
      if (input.compareAtPrice !== undefined) data.compareAtPrice = input.compareAtPrice;
      if (input.stockQuantity !== undefined) data.stockQuantity = input.stockQuantity;
      if (input.active !== undefined) data.active = input.active;
      if (input.sku !== undefined) {
        const sku = input.sku.trim().toUpperCase();
        if (!sku) throw new BadRequestException('La référence ne peut pas être vide.');
        if (await this.skuTaken(tx, sku, { variantId })) throw new ConflictException('Cette référence existe déjà.');
        data.sku = sku;
      }
      const price = input.price !== undefined ? input.price : variant.price;
      const compareAt = input.compareAtPrice !== undefined ? input.compareAtPrice : variant.compareAtPrice;
      this.assertPromo(price ?? variant.product.salePrice, compareAt);
      await tx.productVariant.update({ where: { id: variantId }, data });
      if (input.stockQuantity !== undefined && input.stockQuantity !== variant.stockQuantity) {
        await this.audit.log(
          { userId, action: 'variant.stock', entity: 'Product', entityId: productId, summary: `Stock de la variante ${variant.sku} : ${variant.stockQuantity ?? '—'} → ${input.stockQuantity ?? '—'}` },
          tx,
        );
      }
    });
  }

  async removeVariant(productId: string, variantId: string, userId: string) {
    const variant = await this.prisma.productVariant.findFirst({ where: { id: variantId, productId } });
    if (!variant) throw new NotFoundException('Variante introuvable.');
    await this.prisma.productVariant.delete({ where: { id: variantId } });
    await this.audit.log({ userId, action: 'variant.delete', entity: 'Product', entityId: productId, summary: `Variante supprimée : ${variant.sku}` });
  }

  async reorderVariants(productId: string, ids: string[]) {
    const variants = await this.prisma.productVariant.findMany({ where: { productId } });
    if (variants.length !== ids.length || !variants.every((v) => ids.includes(v.id))) {
      throw new BadRequestException("L'ordre transmis ne correspond pas aux variantes du produit.");
    }
    await this.prisma.$transaction(ids.map((id, position) => this.prisma.productVariant.update({ where: { id }, data: { position } })));
  }

  // ───────────────────────────── Photos

  async addImage(productId: string, file: Buffer, alt: string | undefined) {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, include: { _count: { select: { images: true } } } });
    if (!product) throw new NotFoundException('Produit introuvable.');
    if (product._count.images >= MAX_IMAGES) throw new BadRequestException(`${MAX_IMAGES} photos maximum par produit.`);
    const stored = await this.storage.savePublicImage(file, 'products');
    return this.prisma.productImage.create({
      data: {
        productId,
        storageKey: stored.key,
        width: stored.width,
        height: stored.height,
        alt: alt?.trim() || product.name,
        position: product._count.images,
      },
    });
  }

  async removeImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({ where: { id: imageId, productId } });
    if (!image) throw new NotFoundException('Photo introuvable.');
    await this.prisma.productImage.delete({ where: { id: imageId } });
    if (image.storageKey) await this.storage.removePublicImage(image.storageKey);
  }

  async reorderImages(productId: string, ids: string[]) {
    const images = await this.prisma.productImage.findMany({ where: { productId } });
    if (images.length !== ids.length || !images.every((i) => ids.includes(i.id))) {
      throw new BadRequestException("L'ordre transmis ne correspond pas aux photos du produit.");
    }
    await this.prisma.$transaction(ids.map((id, position) => this.prisma.productImage.update({ where: { id }, data: { position } })));
  }
}
