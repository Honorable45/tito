import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { ProductKind } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { AuthUser, CurrentUser, RequirePermissions } from '../auth/decorators';
import { AuditService } from '../common/audit.service';
import { slugify } from '../common/text';
import { PrismaService } from '../prisma/prisma.service';
import { SPEC_TEMPLATE_KEYS } from './spec-templates';

class CategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsEnum(ProductKind)
  kind?: ProductKind;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;


  @IsOptional()
  @IsIn(SPEC_TEMPLATE_KEYS, { message: 'Gabarit de fiche technique inconnu.' })
  specTemplate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  brandIds?: string[];
}

class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;


  @IsOptional()
  @IsIn(SPEC_TEMPLATE_KEYS, { message: 'Gabarit de fiche technique inconnu.' })
  specTemplate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  brandIds?: string[];
}

class ReorderDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions('catalog.read')
  list(@Query('kind') kind?: ProductKind) {
    return this.prisma.category.findMany({
      where: kind ? { kind } : undefined,
      orderBy: [{ kind: 'asc' }, { position: 'asc' }, { name: 'asc' }],
      include: { brands: { orderBy: [{ position: 'asc' }, { name: 'asc' }] }, _count: { select: { products: true } } },
    });
  }

  @Post()
  @RequirePermissions('catalog.write')
  async create(@Body() dto: CategoryDto, @CurrentUser() me: AuthUser) {
    const slug = slugify(dto.name);
    if (!slug) throw new BadRequestException('Nom de catégorie invalide.');
    if (await this.prisma.category.findUnique({ where: { slug } })) throw new ConflictException('Cette catégorie existe déjà.');
    const category = await this.prisma.category.create({
      data: { name: dto.name.trim(), slug, kind: dto.kind ?? 'ACCESSORY', description: dto.description, specTemplate: dto.specTemplate ?? 'GENERIC', position: dto.position ?? 0, brands: dto.brandIds?.length ? { connect: dto.brandIds.map((id) => ({ id })) } : undefined },
    });
    await this.audit.log({ userId: me.id, action: 'category.create', entity: 'Category', entityId: category.id, summary: `Catégorie créée : ${category.name}` });
    return category;
  }

  @Patch(':id')
  @RequirePermissions('catalog.write')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @CurrentUser() me: AuthUser) {
    const data: Record<string, unknown> = { ...dto };
    delete data.brandIds;
    if (dto.brandIds !== undefined) data.brands = { set: dto.brandIds.map((brandId) => ({ id: brandId })) };
    if (dto.name) {
      data.name = dto.name.trim();
      // Le slug (URL publique) reste stable pour ne pas casser les liens existants.
    }
    const category = await this.prisma.category.update({ where: { id }, data });
    await this.audit.log({ userId: me.id, action: 'category.update', entity: 'Category', entityId: id, summary: `Catégorie modifiée : ${category.name}` });
    return category;
  }

  /** Ordre d'affichage (menu, accueil, filtres) : liste complète des identifiants, dans l'ordre voulu. */
  @Post('order')
  @HttpCode(200)
  @RequirePermissions('catalog.write')
  async reorder(@Body() dto: ReorderDto) {
    await this.prisma.$transaction(dto.ids.map((id, position) => this.prisma.category.update({ where: { id }, data: { position } })));
    return { ok: true };
  }

  /** Suppression d'une catégorie vide ; une catégorie qui contient des produits se désactive. */
  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('catalog.write')
  async remove(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    const category = await this.prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
    if (!category) throw new NotFoundException('Catégorie introuvable.');
    if (category._count.products > 0) {
      throw new ConflictException(`Cette catégorie contient ${category._count.products} produit(s) : déplacez-les ou désactivez la catégorie.`);
    }
    await this.prisma.category.delete({ where: { id } });
    await this.audit.log({ userId: me.id, action: 'category.delete', entity: 'Category', entityId: id, summary: `Catégorie supprimée : ${category.name}` });
  }
}
