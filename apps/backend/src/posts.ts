import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Database } from './database';
import { AuthGuard, type AuthRequest, publicUser } from './auth';
import { CreatePostDto, ListQuery, UpdatePostDto } from './dto';
import { Prisma } from './generated/prisma/client';
import {
  ContentLocale,
  LocalePipe,
  localize,
  publication,
  publishedTranslation,
  visibleContent,
} from './localization';
export const visiblePosts = visibleContent;
const relations = {
  author: { select: publicUser },
  categories: { include: { category: { include: { translations: true } } } },
  tags: { include: { tag: { include: { translations: true } } } },
} as const;
const commonSummary = {
  id: true,
  slug: true,
  coverUrl: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
  commentCount: true,
  ...relations,
} as const;
const translationSummary = {
  locale: true,
  title: true,
  excerpt: true,
  publishedAt: true,
} as const;
function publicPost<
  T extends {
    translations: { locale: ContentLocale }[];
    categories: {
      category: {
        translations: { locale: ContentLocale; name: string }[];
        id: string;
        slug: string;
      };
    }[];
    tags: {
      tag: {
        translations: { locale: ContentLocale; name: string }[];
        id: string;
        slug: string;
      };
    }[];
  },
>(post: T, locale: ContentLocale) {
  return {
    ...localize(post, locale)!,
    categories: post.categories.map(({ category }) => ({
      category: localize(category, locale),
    })),
    tags: post.tags.map(({ tag }) => ({ tag: localize(tag, locale) })),
  };
}
@Injectable()
export class PostsService {
  constructor(private readonly db: Database) {}
  async listAdmin(query: ListQuery) {
    const where: Prisma.PostWhereInput = {
      ...(query.q
        ? {
            translations: {
              some: {
                OR: ['title', 'excerpt', 'content'].map((field) => ({
                  [field]: { contains: query.q, mode: 'insensitive' },
                })),
              },
            },
          }
        : {}),
      ...(query.category
        ? { categories: { some: { category: { slug: query.category } } } }
        : {}),
      ...(query.tag ? { tags: { some: { tag: { slug: query.tag } } } } : {}),
    };
    return this.db.$transaction(
      async (tx) => ({
        items: await tx.post.findMany({
          where,
          include: { ...relations, translations: true },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        total: await tx.post.count({ where }),
        page: query.page,
        pageSize: query.pageSize,
      }),
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async list(query: ListQuery, locale: ContentLocale) {
    const now = new Date();
    // Pick the display translation FIRST, then search, sort and paginate. A matching
    // fallback cannot leak into search while the preferred translation is visible.
    const from = Prisma.sql`FROM posts p JOIN LATERAL (
      SELECT title, excerpt, content, published_at FROM post_translations t
      WHERE t.post_id = p.id AND t.status = 'PUBLISHED' AND t.published_at <= ${now}
      ORDER BY (t.locale::text = ${locale}) DESC LIMIT 1
    ) chosen ON TRUE WHERE TRUE
    ${query.q ? Prisma.sql`AND (chosen.title ILIKE ${'%' + query.q + '%'} OR chosen.excerpt ILIKE ${'%' + query.q + '%'} OR chosen.content ILIKE ${'%' + query.q + '%'})` : Prisma.empty}
    ${query.category ? Prisma.sql`AND EXISTS (SELECT 1 FROM post_categories pc JOIN categories c ON c.id=pc.category_id WHERE pc.post_id=p.id AND c.slug=${query.category})` : Prisma.empty}
    ${query.tag ? Prisma.sql`AND EXISTS (SELECT 1 FROM post_tags pt JOIN tags t ON t.id=pt.tag_id WHERE pt.post_id=p.id AND t.slug=${query.tag})` : Prisma.empty}`;
    return this.db.$transaction(
      async (tx) => {
        const ids = await tx.$queryRaw<{ id: string }[]>(
          Prisma.sql`SELECT p.id ${from} ORDER BY chosen.published_at DESC, p.id DESC LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`,
        );
        const counts = await tx.$queryRaw<{ total: bigint }[]>(
          Prisma.sql`SELECT COUNT(*) AS total ${from}`,
        );
        const rows = await tx.post.findMany({
          where: { id: { in: ids.map((row) => row.id) } },
          select: {
            ...commonSummary,
            translations: {
              where: publishedTranslation(now),
              select: translationSummary,
            },
          },
        });
        const indexed = new Map(rows.map((row) => [row.id, row]));
        return {
          items: ids.map(({ id }) => publicPost(indexed.get(id)!, locale)),
          total: Number(counts[0]!.total),
          page: query.page,
          pageSize: query.pageSize,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async get(slug: string, locale: ContentLocale) {
    const now = new Date();
    const post = await this.db.post.findFirst({
      where: { slug, ...visiblePosts(now) },
      select: {
        ...commonSummary,
        translations: {
          where: publishedTranslation(now),
          select: { ...translationSummary, content: true, contentFormat: true },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return publicPost(post, locale);
  }
  async create(body: CreatePostDto, authorId: string) {
    const { categoryIds, tagIds, translations, ...data } = body;
    return this.db.post.create({
      data: {
        ...data,
        authorId,
        translations: {
          create: translations.map((translation) => ({
            ...translation,
            ...publication(translation),
          })),
        },
        categories: {
          create: categoryIds?.map((categoryId) => ({ categoryId })),
        },
        tags: { create: tagIds?.map((tagId) => ({ tagId })) },
      },
      include: { ...relations, translations: true },
    });
  }
  async update(id: string, body: UpdatePostDto) {
    const { categoryIds, tagIds, translations, ...data } = body;
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM posts WHERE id = ${id}::uuid FOR UPDATE`;
      const current = await tx.post.findUnique({
        where: { id },
        include: { translations: true },
      });
      if (!current) throw new NotFoundException('Post not found');
      for (const translation of translations ?? []) {
        const existing = current.translations.find(
          (row) => row.locale === translation.locale,
        );
        if (!existing && !translation.title)
          throw new BadRequestException('A new translation requires a title');
        const values = {
          ...translation,
          ...publication(translation, existing),
        };
        await tx.postTranslation.upsert({
          where: { postId_locale: { postId: id, locale: translation.locale } },
          create: {
            ...values,
            postId: id,
            title: translation.title ?? existing!.title,
          },
          update: values,
        });
      }
      return tx.post.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
          ...(categoryIds
            ? {
                categories: {
                  deleteMany: {},
                  create: categoryIds.map((categoryId) => ({ categoryId })),
                },
              }
            : {}),
          ...(tagIds
            ? {
                tags: {
                  deleteMany: {},
                  create: tagIds.map((tagId) => ({ tagId })),
                },
              }
            : {}),
        },
        include: { ...relations, translations: true },
      });
    });
  }
}
@ApiTags('Admin posts')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('admin/posts')
export class AdminPostsController {
  constructor(
    private readonly posts: PostsService,
    private readonly db: Database,
  ) {}
  @Get() list(@Query() query: ListQuery) {
    return this.posts.listAdmin(query);
  }
  @Get(':id') async get(@Param('id', ParseUUIDPipe) id: string) {
    const post = await this.db.post.findUnique({
      where: { id },
      include: { ...relations, translations: true },
    });
    if (!post) throw new NotFoundException();
    return post;
  }
  @Post() create(@Body() body: CreatePostDto, @Req() req: AuthRequest) {
    return this.posts.create(body, req.userId);
  }
  @Put(':id') update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePostDto,
  ) {
    return this.posts.update(id, body);
  }
  @Delete(':id/translations/:locale') async removeTranslation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('locale', LocalePipe) locale: ContentLocale,
  ) {
    await this.db.postTranslation.delete({
      where: { postId_locale: { postId: id, locale } },
    });
    return { deleted: true };
  }
  @Delete(':id') async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.db.post.delete({ where: { id } });
    return { deleted: true };
  }
}
