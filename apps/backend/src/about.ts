import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from './auth';
import { Database } from './database';
import { PageDto } from './content.dto';
import {
  ContentLocale,
  localize,
  publication,
  publishedTranslation,
  visibleContent,
} from './localization';
import { ReaderLocale } from './request-locale';
import { createWithResourcePath } from './resource-paths';
const binding = 'about_page_id';
@ApiTags('About')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('admin/about')
export class AdminAboutController {
  constructor(private readonly db: Database) {}
  @Get() async get() {
    const setting = await this.db.siteSetting.findUnique({
      where: { key: binding },
    });
    return typeof setting?.value === 'string'
      ? this.db.page.findUnique({
          where: { id: setting.value },
          include: { translations: true },
        })
      : null;
  }
  @Put() async save(@Body() body: PageDto) {
    return createWithResourcePath((slug) =>
      this.db.$transaction(async (tx) => {
        // Serialize first creation and later translation updates under the same binding.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(732021)`;
        const setting = await tx.siteSetting.findUnique({
          where: { key: binding },
        });
        let current =
          typeof setting?.value === 'string'
            ? await tx.page.findUnique({
                where: { id: setting.value },
                include: { translations: true },
              })
            : null;
        if (!current) {
          const page = await tx.page.create({
            data: {
              slug,
              translations: {
                create: body.translations.map((row) => ({
                  ...row,
                  ...publication(row),
                })),
              },
            },
            include: { translations: true },
          });
          await tx.siteSetting.upsert({
            where: { key: binding },
            create: { key: binding, value: page.id },
            update: { value: page.id },
          });
          return page;
        }
        await tx.$queryRaw`SELECT id FROM pages WHERE id=${current.id}::uuid FOR UPDATE`;
        current = await tx.page.findUnique({
          where: { id: current.id },
          include: { translations: true },
        });
        if (!current) throw new NotFoundException();
        for (const row of body.translations) {
          const previous = current.translations.find(
            (translation) => translation.locale === row.locale,
          );
          const data = { ...row, ...publication(row, previous) };
          await tx.pageTranslation.upsert({
            where: {
              pageId_locale: { pageId: current.id, locale: row.locale },
            },
            create: { ...data, pageId: current.id },
            update: data,
          });
        }
        return tx.page.update({
          where: { id: current.id },
          data: { updatedAt: new Date() },
          include: { translations: true },
        });
      }),
    );
  }
}
@ApiTags('About')
@Controller('public/about')
export class PublicAboutController {
  constructor(private readonly db: Database) {}
  @Get() async get(@ReaderLocale() locale: ContentLocale) {
    const setting = await this.db.siteSetting.findUnique({
      where: { key: binding },
    });
    const now = new Date();
    const page =
      typeof setting?.value === 'string'
        ? await this.db.page.findFirst({
            where: { id: setting.value, ...visibleContent(now) },
            select: {
              id: true,
              slug: true,
              translations: {
                where: publishedTranslation(now),
                select: { locale: true, content: true },
              },
            },
          })
        : null;
    if (!page) throw new NotFoundException('About page not published');
    return localize(page, locale);
  }
}
