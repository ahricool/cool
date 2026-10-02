import {
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
export const visiblePosts = () => ({
  status: 'PUBLISHED' as const,
  publishedAt: { lte: new Date() },
});
const relations = {
  author: { select: publicUser },
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
} as const;
const summary = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverUrl: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
  commentCount: true,
  ...relations,
} as const;
@Injectable()
export class PostsService {
  constructor(private readonly db: Database) {}
  async list(query: ListQuery, admin = false) {
    const where: Prisma.PostWhereInput = {
      ...(admin ? {} : visiblePosts()),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { excerpt: { contains: query.q, mode: 'insensitive' } },
              { content: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.category
        ? { categories: { some: { category: { slug: query.category } } } }
        : {}),
      ...(query.tag ? { tags: { some: { tag: { slug: query.tag } } } } : {}),
    };
    const [items, total] = await this.db.$transaction(
      async (tx) => {
        const items = await tx.post.findMany({
          where,
          select: { ...summary, ...(admin ? { status: true } : {}) },
          orderBy: [
            { publishedAt: { sort: 'desc', nulls: 'last' } },
            { id: 'desc' },
          ],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        const total = await tx.post.count({ where });
        return [items, total] as const;
      },
      { isolationLevel: 'RepeatableRead' },
    );
    return { items, total, page: query.page, pageSize: query.pageSize };
  }
  async get(slug: string) {
    const post = await this.db.post.findFirst({
      where: { slug, ...visiblePosts() },
      select: { ...summary, content: true, contentFormat: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }
  async create(body: CreatePostDto, authorId: string) {
    const { categoryIds, tagIds, publishedAt, ...data } = body;
    return this.db.post.create({
      data: {
        ...data,
        authorId,
        publishedAt: publishedAt
          ? new Date(publishedAt)
          : data.status === 'PUBLISHED'
            ? new Date()
            : null,
        categories: {
          create: categoryIds?.map((categoryId) => ({ categoryId })),
        },
        tags: { create: tagIds?.map((tagId) => ({ tagId })) },
      },
      include: relations,
    });
  }
  async update(id: string, body: UpdatePostDto) {
    const { categoryIds, tagIds, publishedAt, ...data } = body;
    // Single transaction: readers never observe partially replaced taxonomy relations.
    return this.db.$transaction(async (tx) => {
      const current = await tx.post.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Post not found');
      const status = data.status ?? current.status;
      const date =
        publishedAt === undefined
          ? current.publishedAt
          : publishedAt
            ? new Date(publishedAt)
            : null;
      return tx.post.update({
        where: { id },
        data: {
          ...data,
          publishedAt: status === 'PUBLISHED' ? (date ?? new Date()) : date,
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
        include: relations,
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
    return this.posts.list(query, true);
  }
  @Get(':id') async get(@Param('id', ParseUUIDPipe) id: string) {
    const post = await this.db.post.findUnique({
      where: { id },
      include: relations,
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
  @Delete(':id') async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.db.post.delete({ where: { id } });
    return { deleted: true };
  }
}
