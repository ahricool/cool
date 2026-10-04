import { ReaderLocale } from './request-locale';
import { readSettings } from './settings';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Database } from './database';
import { ListQuery } from './dto';
import { PostsService, visiblePosts } from './posts';
import { ContentLocale, localize } from './localization';
@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(
    private readonly db: Database,
    private readonly posts: PostsService,
  ) {}
  @Get('posts') list(
    @ReaderLocale() locale: ContentLocale,
    @Query() query: ListQuery,
  ) {
    return this.posts.list(query, locale);
  }
  @Get('categories/:slug/posts') categoryPosts(
    @ReaderLocale() locale: ContentLocale,
    @Param('slug') slug: string,
    @Query() query: ListQuery,
  ) {
    return this.posts.list({ ...query, category: slug }, locale);
  }
  @Get('tags/:slug/posts') tagPosts(
    @ReaderLocale() locale: ContentLocale,
    @Param('slug') slug: string,
    @Query() query: ListQuery,
  ) {
    return this.posts.list({ ...query, tag: slug }, locale);
  }
  @Get('posts/:slug') get(
    @ReaderLocale() locale: ContentLocale,
    @Param('slug') slug: string,
  ) {
    return this.posts.get(slug, locale);
  }
  @Get('search') search(
    @ReaderLocale() locale: ContentLocale,
    @Query() query: ListQuery,
  ) {
    return this.posts.list(query, locale);
  }
  @Get('site') async site(@ReaderLocale() locale: ContentLocale) {
    return localize((await readSettings(this.db)).site, locale);
  }
  @Get('config') async config(@ReaderLocale() locale: ContentLocale) {
    const settings = await readSettings(this.db);
    return {
      homepage: localize(settings.homepage, locale),
    };
  }
  @Get('categories') async categories(@ReaderLocale() locale: ContentLocale) {
    const items = await this.db.category.findMany({
      where: {
        posts: { some: { post: visiblePosts() } },
        translations: { some: {} },
      },
      include: { translations: { select: { locale: true, name: true } } },
      orderBy: { slug: 'asc' },
    });
    return items.map((item) => localize(item, locale));
  }
  @Get('tags') async tags(@ReaderLocale() locale: ContentLocale) {
    const items = await this.db.tag.findMany({
      where: {
        posts: { some: { post: visiblePosts() } },
        translations: { some: {} },
      },
      include: { translations: { select: { locale: true, name: true } } },
      orderBy: { slug: 'asc' },
    });
    return items.map((item) => localize(item, locale));
  }
  @Get('archives') async archives(
    @ReaderLocale() locale: ContentLocale,
    @Query() query: ListQuery,
  ) {
    const result = await this.posts.list(query, locale);
    return {
      ...result,
      items: result.items.map(
        ({ id, slug, title, publishedAt, contentLocale }) => ({
          id,
          slug,
          title,
          publishedAt,
          contentLocale,
        }),
      ),
    };
  }
}
