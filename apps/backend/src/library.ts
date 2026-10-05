import { PostsService } from './posts';
import { AuthRequest } from './auth';
import { Req } from '@nestjs/common';
import { createWithResourcePath } from './resource-paths';
import { ReaderLocale } from './request-locale';
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
} from './content.dto';
import {
  ContentLocale,
  LocalePipe,
  localize,
  publication,
  publishedTranslation,
  visibleContent,
} from './localization';
const paging = (q: ListQuery) => ({
  skip: (q.page - 1) * q.pageSize,
  take: q.pageSize,
});
@ApiTags('Content library')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('admin')
export class LibraryController {
  constructor(
    private readonly db: Database,
    private readonly posts: PostsService,
  ) {}
  @Get('tags') tags() {
    return this.db.tag.findMany({
      include: { translations: true },
      orderBy: { slug: 'asc' },
    });
  }
  @Post('tags') createTag(@Body() d: TaxonomyDto) {
    const { translations, ...data } = d;
    return createWithResourcePath((slug) =>
      this.db.tag.create({
        data: { ...data, slug, translations: { create: translations } },
        include: { translations: true },
      }),
    );
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
    return createWithResourcePath((slug) =>
      this.db.page.create({
        data: {
          ...data,
          slug,
          translations: {
            create: translations.map((row) => ({
              ...row,
              ...publication(row),
            })),
          },
        },
        include: { translations: true },
      }),
    );
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
  // Historical admin routes remain usable while all active content uses Post.
  @Get('moments') async moments(@Query() q: ListQuery) {
    return this.posts.listAdmin(q, 'MOMENT');
  }
  @Get('moments/:id') async moment(@Param('id', ParseUUIDPipe) id: string) {
    const item = await this.db.post.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!item) throw new NotFoundException();
    return item;
  }
  @Post('moments') createMoment(@Body() d: MomentDto, @Req() req: AuthRequest) {
    return this.posts.create(
      {
        type: 'MOMENT',
        translations: d.translations.map((row) => ({ ...row, title: '' })),
      },
      req.userId,
    );
  }
  @Put('moments/:id') updateMoment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdateMomentDto,
  ) {
    return this.posts.update(id, { translations: d.translations });
  }
  @Delete('moments/:id/translations/:locale') async deleteMomentTranslation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('locale', LocalePipe) locale: ContentLocale,
  ) {
    await this.db.postTranslation.delete({
      where: { postId_locale: { postId: id, locale } },
    });
    return { deleted: true };
  }
  @Delete('moments/:id') async deleteMoment(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.db.post.delete({ where: { id } });
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
@Controller('public')
export class PublicLibraryController {
  constructor(private readonly db: Database) {}
  @Get('pages/:slug') async page(
    @ReaderLocale() locale: ContentLocale,
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
}
