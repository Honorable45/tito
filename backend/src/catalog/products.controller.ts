import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma, ProductCondition, ProductKind, ProductStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { AuthUser, CurrentUser, RequirePermissions } from '../auth/decorators';
import { can } from '../auth/permissions';
import { PageQuery, paginate, skipTake } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { MAX_UPLOAD_BYTES, StorageService } from '../storage/storage.service';
import { presentAdminProduct, productPublicInclude } from './presenters';
import { ProductsService } from './products.service';

const MAX_PRICE = 50_000_000;

export class SpecDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9_-]*$/, { message: 'Clé de caractéristique invalide.' })
  key?: string;

  @IsString()
  @MaxLength(60)
  label: string;

  @IsString()
  @MaxLength(300)
  value: string;
}

/** Champs communs à la création et à la modification. */
class ProductCommonDto {
  @IsOptional()
  @IsString()
  @MaxLength(220)
  shortDescription?: string | null;

  @IsOptional()
  @IsString()
  brandId?: string | null;

  @IsOptional()
  @IsEnum(ProductCondition, { message: 'État invalide (neuf, occasion ou reconditionné).' })
  condition?: ProductCondition;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => SpecDto)
  specs?: SpecDto[];

  @IsOptional()
  @IsInt({ message: "L'ancien prix doit être un nombre entier en XOF." })
  @Min(1)
  @Max(MAX_PRICE)
  compareAtPrice?: number | null;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}

export class CompatibilityDto {
  @IsString()
  brandId: string;

  @IsOptional()
  @IsString()
  modelId?: string | null;
}

class CreateProductDto extends ProductCommonDto {
  @IsOptional()
  @IsEnum(ProductKind)
  kind?: ProductKind;

  @IsString()
  @MinLength(2)
  @MaxLength(140)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  supplierId?: string | null;

  @IsInt({ message: 'Le prix doit être un nombre entier en XOF.' })
  @Min(0)
  @Max(MAX_PRICE)
  salePrice: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  lowStockThreshold?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CompatibilityDto)
  compatibility?: CompatibilityDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  initialStock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  initialUnitCost?: number;
}

class UpdateProductDto extends ProductCommonDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  salePrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  lowStockThreshold?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CompatibilityDto)
  compatibility?: CompatibilityDto[];
}

class ProductListQuery extends PageQuery {
  @IsOptional()
  @IsEnum(ProductKind)
  kind?: ProductKind;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsIn(['low', 'out'])
  stock?: 'low' | 'out';

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsEnum(ProductCondition)
  condition?: ProductCondition;

  @IsOptional()
  @IsIn(['yes', 'no'])
  published?: 'yes' | 'no';

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  promo?: boolean;
}

class VariantDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  sku?: string;

  @IsObject({ message: 'Options de variante invalides.' })
  options: Record<string, string>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  price?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PRICE)
  compareAtPrice?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  stockQuantity?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class UpdateVariantDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  sku?: string;

  @IsOptional()
  @IsObject({ message: 'Options de variante invalides.' })
  options?: Record<string, string>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  price?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PRICE)
  compareAtPrice?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  stockQuantity?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class ReorderDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

class ImageAltDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  alt?: string;
}

const SORTABLE = ['name', 'sku', 'salePrice', 'stockQuantity', 'createdAt', 'updatedAt'] as const;

@Controller('products')
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  @RequirePermissions('catalog.read')
  async list(@Query() q: ProductListQuery, @CurrentUser() me: AuthUser) {
    const where: Prisma.ProductWhereInput = {
      kind: q.kind,
      status: q.status ?? 'ACTIVE',
      categoryId: q.categoryId,
      brandId: q.brandId,
      condition: q.condition,
      published: q.published ? q.published === 'yes' : undefined,
      compareAtPrice: q.promo ? { gt: this.prisma.product.fields.salePrice } : undefined,
    };
    if (q.q) {
      where.OR = [
        { name: { contains: q.q, mode: 'insensitive' } },
        { sku: { contains: q.q, mode: 'insensitive' } },
        { variants: { some: { sku: { contains: q.q, mode: 'insensitive' } } } },
        { brand: { name: { contains: q.q, mode: 'insensitive' } } },
      ];
    }
    if (q.stock === 'out') where.stockQuantity = { lte: this.prisma.product.fields.reservedQuantity };
    if (q.stock === 'low') {
      // Disponible ≤ seuil : filtré en SQL brut pour comparer trois colonnes.
      const ids = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Product" WHERE "stockQuantity" - "reservedQuantity" <= "lowStockThreshold"`;
      where.id = { in: ids.map((r) => r.id) };
    }
    const sort = (SORTABLE as readonly string[]).includes(q.sort ?? '') ? q.sort! : 'name';
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { ...productPublicInclude, supplier: { select: { id: true, name: true } } },
        orderBy: { [sort]: q.dir ?? (sort === 'name' ? 'asc' : 'desc') },
        ...skipTake(q),
      }),
      this.prisma.product.count({ where }),
    ]);
    const withCosts = can(me.role, 'costs.read');
    return paginate(
      rows.map((p) => presentAdminProduct(this.storage, p, withCosts)),
      total,
      q,
    );
  }

  @Get(':id')
  @RequirePermissions('catalog.read')
  get(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.products.get(id, can(me.role, 'costs.read'));
  }

  @Post()
  @RequirePermissions('catalog.write')
  create(@Body() dto: CreateProductDto, @CurrentUser() me: AuthUser) {
    return this.products.create(dto, me.id, true);
  }

  @Patch(':id')
  @RequirePermissions('catalog.write')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() me: AuthUser) {
    return this.products.update(id, dto, me.id, true);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @RequirePermissions('catalog.write')
  archive(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.products.setStatus(id, 'ARCHIVED', me.id, true);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @RequirePermissions('catalog.write')
  restore(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.products.setStatus(id, 'ACTIVE', me.id, true);
  }

  /** Suppression définitive, seulement pour une fiche sans historique (sinon : archiver). */
  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('catalog.write')
  remove(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.products.remove(id, me.id);
  }

  @Post(':id/variants')
  @RequirePermissions('catalog.write')
  async addVariant(@Param('id') id: string, @Body() dto: VariantDto, @CurrentUser() me: AuthUser) {
    await this.products.addVariant(id, dto, me.id);
    return this.products.get(id, can(me.role, 'costs.read'));
  }

  // Déclarée avant « variants/:variantId » pour ne pas être interprétée comme un identifiant.
  @Patch(':id/variants/order')
  @RequirePermissions('catalog.write')
  async reorderVariants(@Param('id') id: string, @Body() dto: ReorderDto, @CurrentUser() me: AuthUser) {
    await this.products.reorderVariants(id, dto.ids);
    return this.products.get(id, can(me.role, 'costs.read'));
  }

  @Patch(':id/variants/:variantId')
  @RequirePermissions('catalog.write')
  async updateVariant(@Param('id') id: string, @Param('variantId') variantId: string, @Body() dto: UpdateVariantDto, @CurrentUser() me: AuthUser) {
    await this.products.updateVariant(id, variantId, dto, me.id);
    return this.products.get(id, can(me.role, 'costs.read'));
  }

  @Delete(':id/variants/:variantId')
  @RequirePermissions('catalog.write')
  async removeVariant(@Param('id') id: string, @Param('variantId') variantId: string, @CurrentUser() me: AuthUser) {
    await this.products.removeVariant(id, variantId, me.id);
    return this.products.get(id, can(me.role, 'costs.read'));
  }

  @Post(':id/images')
  @RequirePermissions('catalog.write')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  addImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Body() body: ImageAltDto) {
    return this.products.addImage(id, file?.buffer, body.alt);
  }

  @Delete(':id/images/:imageId')
  @HttpCode(204)
  @RequirePermissions('catalog.write')
  removeImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.products.removeImage(id, imageId);
  }

  @Patch(':id/images/order')
  @RequirePermissions('catalog.write')
  reorder(@Param('id') id: string, @Body() dto: ReorderDto) {
    return this.products.reorderImages(id, dto.ids);
  }
}
