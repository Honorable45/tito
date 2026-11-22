import { BadRequestException, Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Banner } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsDate, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { AuthUser, CurrentUser, RequirePermissions } from '../auth/decorators';
import { AuditService } from '../common/audit.service';
import { cleanOptional } from '../common/text';
import { PrismaService } from '../prisma/prisma.service';
import { MAX_UPLOAD_BYTES, StorageService } from '../storage/storage.service';

const toDate = ({ value }: { value: unknown }) => (value === null || value === '' ? null : value === undefined ? undefined : new Date(String(value)));
// Lien interne (/catalogue?…) ou externe en https.
const LINK = /^(\/[^\s]*|https:\/\/[^\s]+)$/;

class BannerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(90)
  title: string;

  @IsOptional() @IsString() @MaxLength(200) subtitle?: string | null;
  @IsOptional() @IsString() @MaxLength(160) imageAlt?: string;
  @IsOptional() @IsString() @MaxLength(300) @Matches(LINK, { message: 'Lien invalide : adresse du site (/catalogue…) ou https://…' }) linkUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(40) ctaLabel?: string | null;
  @IsOptional() @IsInt() @Min(0) position?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @Transform(toDate) @IsDate({ message: 'Date de début invalide.' }) startsAt?: Date | null;
  @IsOptional() @Transform(toDate) @IsDate({ message: 'Date de fin invalide.' }) endsAt?: Date | null;
}

class UpdateBannerDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(90) title?: string;
  @IsOptional() @IsString() @MaxLength(200) subtitle?: string | null;
  @IsOptional() @IsString() @MaxLength(160) imageAlt?: string;
  @IsOptional() @IsString() @MaxLength(300) @Matches(LINK, { message: 'Lien invalide : adresse du site (/catalogue…) ou https://…' }) linkUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(40) ctaLabel?: string | null;
  @IsOptional() @IsInt() @Min(0) position?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @Transform(toDate) @IsDate({ message: 'Date de début invalide.' }) startsAt?: Date | null;
  @IsOptional() @Transform(toDate) @IsDate({ message: 'Date de fin invalide.' }) endsAt?: Date | null;
}

class ReorderDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

export function presentBanner(storage: StorageService, b: Banner) {
  return {
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    imageUrl: b.url ?? storage.publicUrl(b.storageKey),
    imageAlt: b.imageAlt,
    linkUrl: b.linkUrl,
    ctaLabel: b.ctaLabel,
    position: b.position,
    active: b.active,
    startsAt: b.startsAt,
    endsAt: b.endsAt,
  };
}

/** Bannières de l'accueil : texte, photo, lien, période de diffusion facultative. */
@Controller('banners')
export class BannersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  private check(startsAt?: Date | null, endsAt?: Date | null) {
    if (startsAt && endsAt && startsAt >= endsAt) throw new BadRequestException('La date de fin doit suivre la date de début.');
  }

  @Get()
  @RequirePermissions('catalog.read')
  async list() {
    const rows = await this.prisma.banner.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] });
    return rows.map((b) => presentBanner(this.storage, b));
  }

  @Post()
  @RequirePermissions('catalog.write')
  async create(@Body() dto: BannerDto, @CurrentUser() me: AuthUser) {
    this.check(dto.startsAt, dto.endsAt);
    const count = await this.prisma.banner.count();
    const banner = await this.prisma.banner.create({
      data: {
        title: dto.title.trim(),
        subtitle: cleanOptional(dto.subtitle),
        imageAlt: dto.imageAlt?.trim() ?? '',
        linkUrl: cleanOptional(dto.linkUrl),
        ctaLabel: cleanOptional(dto.ctaLabel),
        position: dto.position ?? count,
        // Une bannière sans photo n'est pas affichée : elle est créée inactive, activée après l'ajout de l'image.
        active: false,
        startsAt: dto.startsAt ?? null,
        endsAt: dto.endsAt ?? null,
      },
    });
    await this.audit.log({ userId: me.id, action: 'banner.create', entity: 'Banner', entityId: banner.id, summary: `Bannière créée : ${banner.title}` });
    return presentBanner(this.storage, banner);
  }

  @Post('order')
  @HttpCode(200)
  @RequirePermissions('catalog.write')
  async reorder(@Body() dto: ReorderDto) {
    await this.prisma.$transaction(dto.ids.map((id, position) => this.prisma.banner.update({ where: { id }, data: { position } })));
    return this.list();
  }

  @Patch(':id')
  @RequirePermissions('catalog.write')
  async update(@Param('id') id: string, @Body() dto: UpdateBannerDto, @CurrentUser() me: AuthUser) {
    const current = await this.prisma.banner.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Bannière introuvable.');
    this.check(dto.startsAt === undefined ? current.startsAt : dto.startsAt, dto.endsAt === undefined ? current.endsAt : dto.endsAt);
    if (dto.active && !current.url && !current.storageKey) throw new BadRequestException('Ajoutez une photo avant d’activer la bannière.');
    const banner = await this.prisma.banner.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        subtitle: dto.subtitle === undefined ? undefined : cleanOptional(dto.subtitle),
        imageAlt: dto.imageAlt?.trim(),
        linkUrl: dto.linkUrl === undefined ? undefined : cleanOptional(dto.linkUrl),
        ctaLabel: dto.ctaLabel === undefined ? undefined : cleanOptional(dto.ctaLabel),
        position: dto.position,
        active: dto.active,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
      },
    });
    await this.audit.log({ userId: me.id, action: 'banner.update', entity: 'Banner', entityId: id, summary: `Bannière modifiée : ${banner.title}` });
    return presentBanner(this.storage, banner);
  }

  @Post(':id/image')
  @RequirePermissions('catalog.write')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  async image(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const current = await this.prisma.banner.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Bannière introuvable.');
    const stored = await this.storage.savePublicImage(file?.buffer, 'banners');
    const banner = await this.prisma.banner.update({ where: { id }, data: { storageKey: stored.key, url: null } });
    if (current.storageKey) await this.storage.removePublicImage(current.storageKey);
    return presentBanner(this.storage, banner);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('catalog.write')
  async remove(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Bannière introuvable.');
    await this.prisma.banner.delete({ where: { id } });
    if (banner.storageKey) await this.storage.removePublicImage(banner.storageKey);
    await this.audit.log({ userId: me.id, action: 'banner.delete', entity: 'Banner', entityId: id, summary: `Bannière supprimée : ${banner.title}` });
  }
}
