import { defaultSettings } from './settings';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Database } from './database';
import { ListQuery } from './dto';
import { PostsService, visiblePosts } from './posts';
@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(
    private readonly db: Database,
    private readonly posts: PostsService,
  ) {}
  @Get('posts') list(@Query() query: ListQuery) {
    return this.posts.list(query);
  }
  @Get('posts/:slug') get(@Param('slug') slug: string) {
    return this.posts.get(slug);
  }
  @Get('search') search(@Query() query: ListQuery) {
    return this.posts.list(query);
  }
  @Get('site') async site() {
    const row = await this.db.siteSetting.findUnique({
      where: { key: 'site' },
    });
    return { ...defaultSettings.site, ...((row?.value as object) ?? {}) };
  }
  @Get('config') async config() {
    const rows = await this.db.siteSetting.findMany({
      where: { key: { in: ['homepage', 'social'] } },
    });
    const saved = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return {
      homepage: {
        ...defaultSettings.homepage,
        ...((saved.homepage as object) ?? {}),
      },
      social: saved.social ?? [],
    };
  }
  @Get('categories') categories() {
    return this.db.category.findMany({
      where: { posts: { some: { post: visiblePosts() } } },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
  }
  @Get('tags') tags() {
    return this.db.tag.findMany({
      where: { posts: { some: { post: visiblePosts() } } },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
  }
  @Get('archives') async archives(@Query() query: ListQuery) {
    const result = await this.posts.list(query);
    return {
      ...result,
      items: result.items.map(({ id, slug, title, publishedAt }) => ({
        id,
        slug,
        title,
        publishedAt,
      })),
    };
  }
}
