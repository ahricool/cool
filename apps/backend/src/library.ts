import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from './auth';
import { Database } from './database';
import { ListQuery } from './dto';
import {
  TaxonomyDto,
  PageDto,
  UpdatePageDto,
  MomentDto,
  UpdateMomentDto,
  PhotoDto,
  UpdatePhotoDto,
  LinkDto,
  UpdateLinkDto,
} from './content.dto';
import {
  ContentLocale,
  LocalePipe,
  localize,
  publication,
  publishedTranslation,
  visibleContent,
} from './localization';
import { Prisma } from './generated/prisma/client';
const paging = (q: ListQuery) => ({
  skip: (q.page - 1) * q.pageSize,
  take: q.pageSize,
});
@ApiTags('Content library')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('admin')
export class LibraryController {
  constructor(private readonly db: Database) {}
  @Get('categories') categories() {
    return this.db.category.findMany({
      include: { translations: true },
      orderBy: { slug: 'asc' },
    });
  }
  @Post('categories') createCategory(@Body() d: TaxonomyDto) {
    const { translations, ...data } = d;
    return this.db.category.create({
      data: { ...data, translations: { create: translations } },
      include: { translations: true },
    });
  }
  @Put('categories/:id') updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: TaxonomyDto,
  ) {
    const { translations, ...data } = d;
    return this.db.category.update({
      where: { id },
      data: {
        ...data,
        translations: {
          upsert: translations.map((row) => ({
            where: {
              categoryId_locale: { categoryId: id, locale: row.locale },
            },
            create: row,
            update: row,
          })),
        },
      },
      include: { translations: true },
    });
  }
  @Delete('categories/:id') async deleteCategory(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.db.category.delete({ where: { id } });
    return { deleted: true };
  }
  @Get('tags') tags() {
    return this.db.tag.findMany({
      include: { translations: true },
      orderBy: { slug: 'asc' },
    });
  }
  @Post('tags') createTag(@Body() d: TaxonomyDto) {
    const { translations, ...data } = d;
    return this.db.tag.create({
      data: { ...data, translations: { create: translations } },
      include: { translations: true },
    });
  }
  @Put('tags/:id') updateTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: TaxonomyDto,
  ) {
    const { translations, ...data } = d;
    return this.db.tag.update({
      where: { id },
      data: {
        ...data,
        translations: {
          upsert: translations.map((row) => ({
            where: { tagId_locale: { tagId: id, locale: row.locale } },
            create: row,
            update: row,
          })),
        },
      },
      include: { translations: true },
    });
  }
  @Delete('tags/:id') async deleteTag(@Param('id', ParseUUIDPipe) id: string) {
    await this.db.tag.delete({ where: { id } });
    return { deleted: true };
  }
  @Get('pages') async pages(@Query() q: ListQuery) {
    const where = q.q
      ? {
          translations: {
            some: { title: { contains: q.q, mode: 'insensitive' as const } },
          },
        }
      : {};
    return this.db.$transaction(
      async (tx) => ({
        items: await tx.page.findMany({
          where,
          ...paging(q),
          include: { translations: true },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        }),
        total: await tx.page.count({ where }),
        page: q.page,
        pageSize: q.pageSize,
      }),
      { isolationLevel: 'RepeatableRead' },
    );
  }
  @Get('pages/:id') async page(@Param('id', ParseUUIDPipe) id: string) {
    const item = await this.db.page.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!item) throw new NotFoundException();
    return item;
  }
  @Post('pages') createPage(@Body() d: PageDto) {
    const { translations, ...data } = d;
    return this.db.page.create({
      data: {
        ...data,
        translations: {
          create: translations.map((row) => ({ ...row, ...publication(row) })),
        },
      },
      include: { translations: true },
    });
  }
  @Put('pages/:id') async updatePage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdatePageDto,
  ) {
    const { translations, ...data } = d;
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM pages WHERE id = ${id}::uuid FOR UPDATE`;
      const current = await tx.page.findUnique({
        where: { id },
        include: { translations: true },
      });
      if (!current) throw new NotFoundException();
      for (const row of translations ?? []) {
        const existing = current.translations.find(
          (translation) => translation.locale === row.locale,
        );
        if (!existing && !row.title)
          throw new BadRequestException('A new translation requires a title');
        const values = { ...row, ...publication(row, existing) };
        await tx.pageTranslation.upsert({
          where: { pageId_locale: { pageId: id, locale: row.locale } },
          create: {
            ...values,
            pageId: id,
            title: row.title ?? existing!.title,
          },
          update: values,
        });
      }
      return tx.page.update({
        where: { id },
        data: { ...data, updatedAt: new Date() },
        include: { translations: true },
      });
    });
  }
  @Delete('pages/:id/translations/:locale') async deletePageTranslation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('locale', LocalePipe) locale: ContentLocale,
  ) {
    await this.db.pageTranslation.delete({
      where: { pageId_locale: { pageId: id, locale } },
    });
    return { deleted: true };
  }
  @Delete('pages/:id') async deletePage(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.db.page.delete({ where: { id } });
    return { deleted: true };
  }
  @Get('moments') async moments(@Query() q: ListQuery) {
    const where = q.q
      ? {
          translations: {
            some: { content: { contains: q.q, mode: 'insensitive' as const } },
          },
        }
      : {};
    return this.db.$transaction(
      async (tx) => ({
        items: await tx.moment.findMany({
          where,
          ...paging(q),
          include: { translations: true },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        }),
        total: await tx.moment.count({ where }),
        page: q.page,
        pageSize: q.pageSize,
      }),
      { isolationLevel: 'RepeatableRead' },
    );
  }
  @Get('moments/:id') async moment(@Param('id', ParseUUIDPipe) id: string) {
    const item = await this.db.moment.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!item) throw new NotFoundException();
    return item;
  }
  @Post('moments') createMoment(@Body() d: MomentDto) {
    const { translations, ...data } = d;
    return this.db.moment.create({
      data: {
        ...data,
        translations: {
          create: translations.map((row) => ({ ...row, ...publication(row) })),
        },
      },
      include: { translations: true },
    });
  }
  @Put('moments/:id') async updateMoment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdateMomentDto,
  ) {
    const { translations, ...data } = d;
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM moments WHERE id = ${id}::uuid FOR UPDATE`;
      const current = await tx.moment.findUnique({
        where: { id },
        include: { translations: true },
      });
      if (!current) throw new NotFoundException();
      for (const row of translations ?? []) {
        const existing = current.translations.find(
          (translation) => translation.locale === row.locale,
        );

        if (!existing && !row.content)
          throw new BadRequestException('A new translation requires content');
        const values = { ...row, ...publication(row, existing) };
        await tx.momentTranslation.upsert({
          where: { momentId_locale: { momentId: id, locale: row.locale } },
          create: {
            ...values,
            momentId: id,
            content: row.content ?? existing!.content,
          },
          update: values,
        });
      }
      return tx.moment.update({
        where: { id },
        data: { ...data, updatedAt: new Date() },
        include: { translations: true },
      });
    });
  }
  @Delete('moments/:id/translations/:locale') async deleteMomentTranslation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('locale', LocalePipe) locale: ContentLocale,
  ) {
    await this.db.momentTranslation.delete({
      where: { momentId_locale: { momentId: id, locale } },
    });
    return { deleted: true };
  }
  @Delete('moments/:id') async deleteMoment(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.db.moment.delete({ where: { id } });
    return { deleted: true };
  }
  @Get('photos') async photos(@Query() q: ListQuery) {
    const where = {};
    return this.db.$transaction(
      async (tx) => ({
        items: await tx.photo.findMany({
          where,
          ...paging(q),
          include: { translations: true },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        }),
        total: await tx.photo.count({ where }),
        page: q.page,
        pageSize: q.pageSize,
      }),
      { isolationLevel: 'RepeatableRead' },
    );
  }
  @Get('photos/:id') async photo(@Param('id', ParseUUIDPipe) id: string) {
    const item = await this.db.photo.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!item) throw new NotFoundException();
    return item;
  }
  @Post('photos') createPhoto(@Body() d: PhotoDto) {
    const { translations, ...data } = d;
    return this.db.photo.create({
      data: { ...data, translations: { create: translations } },
      include: { translations: true },
    });
  }
  @Put('photos/:id') async updatePhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdatePhotoDto,
  ) {
    const { translations, ...data } = d;
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM photos WHERE id = ${id}::uuid FOR UPDATE`;
      const current = await tx.photo.findUnique({
        where: { id },
        include: { translations: true },
      });
      if (!current) throw new NotFoundException();
      for (const row of translations ?? []) {
        const values = { ...row };
        await tx.photoTranslation.upsert({
          where: { photoId_locale: { photoId: id, locale: row.locale } },
          create: { ...values, photoId: id },
          update: values,
        });
      }
      return tx.photo.update({
        where: { id },
        data: { ...data, updatedAt: new Date() },
        include: { translations: true },
      });
    });
  }
  @Delete('photos/:id/translations/:locale') async deletePhotoTranslation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('locale', LocalePipe) locale: ContentLocale,
  ) {
    await this.db.photoTranslation.delete({
      where: { photoId_locale: { photoId: id, locale } },
    });
    return { deleted: true };
  }
  @Delete('photos/:id') async deletePhoto(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.db.photo.delete({ where: { id } });
    return { deleted: true };
  }
  @Get('links') async links(@Query() q: ListQuery) {
    const where = {};
    return this.db.$transaction(
      async (tx) => ({
        items: await tx.link.findMany({
          where,
          ...paging(q),
          include: { translations: true },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        }),
        total: await tx.link.count({ where }),
        page: q.page,
        pageSize: q.pageSize,
      }),
      { isolationLevel: 'RepeatableRead' },
    );
  }
  @Get('links/:id') async link(@Param('id', ParseUUIDPipe) id: string) {
    const item = await this.db.link.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!item) throw new NotFoundException();
    return item;
  }
  @Post('links') createLink(@Body() d: LinkDto) {
    const { translations, ...data } = d;
    return this.db.link.create({
      data: { ...data, translations: { create: translations } },
      include: { translations: true },
    });
  }
  @Put('links/:id') async updateLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdateLinkDto,
  ) {
    const { translations, ...data } = d;
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM links WHERE id = ${id}::uuid FOR UPDATE`;
      const current = await tx.link.findUnique({
        where: { id },
        include: { translations: true },
      });
      if (!current) throw new NotFoundException();
      for (const row of translations ?? []) {
        const values = { ...row };
        await tx.linkTranslation.upsert({
          where: { linkId_locale: { linkId: id, locale: row.locale } },
          create: { ...values, linkId: id },
          update: values,
        });
      }
      return tx.link.update({
        where: { id },
        data: { ...data, updatedAt: new Date() },
        include: { translations: true },
      });
    });
  }
  @Delete('links/:id/translations/:locale') async deleteLinkTranslation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('locale', LocalePipe) locale: ContentLocale,
  ) {
    await this.db.linkTranslation.delete({
      where: { linkId_locale: { linkId: id, locale } },
    });
    return { deleted: true };
  }
  @Delete('links/:id') async deleteLink(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.db.link.delete({ where: { id } });
    return { deleted: true };
  }
  @Get('overview') async overview() {
    const [posts, drafts, media, comments] = await Promise.all([
      this.db.post.count(),
      this.db.post.count({
        where: { translations: { some: { status: 'DRAFT' } } },
      }),
      this.db.media.count(),
      this.db.comment.count({ where: { status: 'PENDING' } }),
    ]);
    return { posts, drafts, media, comments };
  }
}
@ApiTags('Public library')
@Controller('public/:locale')
export class PublicLibraryController {
  constructor(private readonly db: Database) {}
  @Get('pages/:slug') async page(
    @Param('locale', LocalePipe) locale: ContentLocale,
    @Param('slug') slug: string,
  ) {
    const now = new Date();
    const item = await this.db.page.findFirst({
      where: { slug, ...visibleContent(now) },
      select: {
        id: true,
        slug: true,
        coverUrl: true,
        createdAt: true,
        updatedAt: true,
        translations: {
          where: publishedTranslation(now),
          select: {
            locale: true,
            title: true,
            content: true,
            publishedAt: true,
          },
        },
      },
    });
    if (!item) throw new NotFoundException();
    return localize(item, locale);
  }
  @Get('moments') async moments(
    @Param('locale', LocalePipe) locale: ContentLocale,
    @Query() q: ListQuery,
  ) {
    const now = new Date();
    const from = Prisma.sql`FROM moments m JOIN LATERAL (SELECT published_at FROM moment_translations t WHERE t.moment_id=m.id AND t.status='PUBLISHED' AND t.published_at <= ${now} ORDER BY (t.locale::text=${locale}) DESC LIMIT 1) chosen ON TRUE`;
    return this.db.$transaction(
      async (tx) => {
        const ids = await tx.$queryRaw<{ id: string }[]>(
          Prisma.sql`SELECT m.id ${from} ORDER BY chosen.published_at DESC,m.id DESC LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`,
        );
        const counts = await tx.$queryRaw<{ total: bigint }[]>(
          Prisma.sql`SELECT COUNT(*) AS total ${from}`,
        );
        const items = await tx.moment.findMany({
          where: { id: { in: ids.map((row) => row.id) } },
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            translations: {
              where: publishedTranslation(now),
              select: { locale: true, content: true, publishedAt: true },
            },
          },
        });
        const map = new Map(items.map((row) => [row.id, row]));
        return {
          items: ids.map(({ id }) => localize(map.get(id)!, locale)),
          total: Number(counts[0]!.total),
          page: q.page,
          pageSize: q.pageSize,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  @Get('photos') async photos(
    @Param('locale', LocalePipe) locale: ContentLocale,
    @Query() q: ListQuery,
  ) {
    const where = { published: true, translations: { some: {} } };
    return this.db.$transaction(
      async (tx) => ({
        items: (
          await tx.photo.findMany({
            where,
            ...paging(q),
            select: {
              id: true,
              url: true,
              createdAt: true,
              updatedAt: true,
              translations: {
                select: {
                  locale: true,
                  title: true,
                  description: true,
                  album: true,
                },
              },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          })
        ).map((item) => localize(item, locale)),
        total: await tx.photo.count({ where }),
        page: q.page,
        pageSize: q.pageSize,
      }),
      { isolationLevel: 'RepeatableRead' },
    );
  }
  @Get('links') async links(
    @Param('locale', LocalePipe) locale: ContentLocale,
    @Query() q: ListQuery,
  ) {
    const where = { published: true, translations: { some: {} } };
    return this.db.$transaction(
      async (tx) => ({
        items: (
          await tx.link.findMany({
            where,
            ...paging(q),
            select: {
              id: true,
              url: true,
              createdAt: true,
              updatedAt: true,
              logoUrl: true,
              translations: {
                select: {
                  locale: true,
                  name: true,
                  description: true,
                  group: true,
                },
              },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          })
        ).map((item) => localize(item, locale)),
        total: await tx.link.count({ where }),
        page: q.page,
        pageSize: q.pageSize,
      }),
      { isolationLevel: 'RepeatableRead' },
    );
  }
}
