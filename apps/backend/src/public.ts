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
    return (
      (await this.db.siteSetting.findUnique({ where: { key: 'site' } }))
        ?.value ?? { title: 'Personal CMS', description: '' }
    );
  }
  @Get('config') async config() {
    // Only these namespaces may ever contain public presentation data.
    const rows = await this.db.siteSetting.findMany({
      where: { key: { in: ['homepage', 'social'] } },
    });
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
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
