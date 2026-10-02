import { readSettings } from './settings';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Database } from './database';
import { ListQuery } from './dto';
import { PostsService, visiblePosts } from './posts';
import { ContentLocale, LocalePipe, localize } from './localization';
@ApiTags('Public')
@Controller('public/:locale')
export class PublicController {
  constructor(
    private readonly db: Database,
    private readonly posts: PostsService,
  ) {}
  @Get('posts') list(
    @Param('locale', LocalePipe) locale: ContentLocale,
    @Query() query: ListQuery,
  ) {
    return this.posts.list(query, locale);
  }
  @Get('categories/:slug/posts') categoryPosts(
    @Param('locale', LocalePipe) locale: ContentLocale,
    @Param('slug') slug: string,
    @Query() query: ListQuery,
  ) {
    return this.posts.list({ ...query, category: slug }, locale);
  }
  @Get('tags/:slug/posts') tagPosts(
    @Param('locale', LocalePipe) locale: ContentLocale,
    @Param('slug') slug: string,
    @Query() query: ListQuery,
  ) {
    return this.posts.list({ ...query, tag: slug }, locale);
  }
  @Get('posts/:slug') get(
    @Param('locale', LocalePipe) locale: ContentLocale,
    @Param('slug') slug: string,
  ) {
    return this.posts.get(slug, locale);
  }
  @Get('search') search(
    @Param('locale', LocalePipe) locale: ContentLocale,
    @Query() query: ListQuery,
  ) {
    return this.posts.list(query, locale);
  }
  @Get('site') async site(@Param('locale', LocalePipe) locale: ContentLocale) {
    return localize((await readSettings(this.db)).site, locale);
  }
  @Get('config') async config(
    @Param('locale', LocalePipe) locale: ContentLocale,
  ) {
    const settings = await readSettings(this.db);
    return {
      homepage: localize(settings.homepage, locale),
      social: settings.social.map((item) => localize(item, locale)),
    };
  }
  @Get('categories') async categories(
    @Param('locale', LocalePipe) locale: ContentLocale,
  ) {
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
  @Get('tags') async tags(@Param('locale', LocalePipe) locale: ContentLocale) {
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
    @Param('locale', LocalePipe) locale: ContentLocale,
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
