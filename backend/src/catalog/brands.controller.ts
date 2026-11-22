import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { AuthUser, CurrentUser, RequirePermissions } from '../auth/decorators';
import { AuditService } from '../common/audit.service';
import { slugify } from '../common/text';
import { PrismaService } from '../prisma/prisma.service';

class NameDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class UpdateNameDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

/**
 * Marques et modèles : référentiel partagé par le catalogue (marque d'un produit), les compatibilités,
 * les occasions et la réparation. Géré par les personnes autorisées à modifier le catalogue.
 */
@Controller('brands')
export class BrandsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions('catalog.read')
  list() {
    return this.prisma.brand.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: { categories: { orderBy: [{ position: 'asc' }, { name: 'asc' }] }, models: { orderBy: [{ position: 'asc' }, { name: 'asc' }] }, _count: { select: { products: true } } },
    });
  }

  @Post()
  @RequirePermissions('catalog.write')
  async create(@Body() dto: NameDto, @CurrentUser() me: AuthUser) {
    const slug = slugify(dto.name);
    if (!slug) throw new BadRequestException('Nom invalide.');
    if (await this.prisma.brand.findFirst({ where: { OR: [{ slug }, { name: dto.name.trim() }] } })) {
      throw new ConflictException('Cette marque existe déjà.');
    }
    const brand = await this.prisma.brand.create({ data: { name: dto.name.trim(), slug, position: dto.position ?? 0 } });
    await this.audit.log({ userId: me.id, action: 'brand.create', entity: 'Brand', entityId: brand.id, summary: `Marque créée : ${brand.name}` });
    return brand;
  }

  @Patch(':id')
  @RequirePermissions('catalog.write')
  async update(@Param('id') id: string, @Body() dto: UpdateNameDto) {
    const name = dto.name?.trim();
    if (name && (await this.prisma.brand.findFirst({ where: { name, id: { not: id } } }))) throw new ConflictException('Cette marque existe déjà.');
    // Le slug (URL publique /marque/…) reste stable pour ne pas casser les liens existants.
    return this.prisma.brand.update({ where: { id }, data: { ...dto, name } });
  }

  /** Suppression d'une marque inutilisée ; sinon, la désactiver la retire des listes sans perdre l'historique. */
  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('catalog.write')
  async remove(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true, compat: true, usedPhones: true } }, models: { select: { _count: { select: { repairJobs: true, requests: true, usedPhones: true, repairPrices: true, compat: true } } } } },
    });
    if (!brand) throw new NotFoundException('Marque introuvable.');
    const used = Object.values(brand._count).reduce((a, b) => a + b, 0) + brand.models.reduce((a, m) => a + Object.values(m._count).reduce((x, y) => x + y, 0), 0);
    if (used > 0) throw new ConflictException('Cette marque est utilisée (produits, compatibilités ou historique) : désactivez-la plutôt.');
    await this.prisma.$transaction([this.prisma.phoneModel.deleteMany({ where: { brandId: id } }), this.prisma.brand.delete({ where: { id } })]);
    await this.audit.log({ userId: me.id, action: 'brand.delete', entity: 'Brand', entityId: id, summary: `Marque supprimée : ${brand.name}` });
  }

  @Post(':id/models')
  @RequirePermissions('catalog.write')
  async addModel(@Param('id') brandId: string, @Body() dto: NameDto, @CurrentUser() me: AuthUser) {
    const slug = slugify(dto.name);
    if (!slug) throw new BadRequestException('Nom invalide.');
    if (await this.prisma.phoneModel.findUnique({ where: { brandId_slug: { brandId, slug } } })) {
      throw new ConflictException('Ce modèle existe déjà pour cette marque.');
    }
    const model = await this.prisma.phoneModel.create({ data: { brandId, name: dto.name.trim(), slug, position: dto.position ?? 0 } });
    await this.audit.log({ userId: me.id, action: 'model.create', entity: 'PhoneModel', entityId: model.id, summary: `Modèle créé : ${model.name}` });
    return model;
  }

  @Patch('models/:modelId')
  @RequirePermissions('catalog.write')
  updateModel(@Param('modelId') id: string, @Body() dto: UpdateNameDto) {
    return this.prisma.phoneModel.update({ where: { id }, data: { ...dto, name: dto.name?.trim() } });
  }
}
