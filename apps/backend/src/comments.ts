import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { Throttle } from '@nestjs/throttler';
import { Database } from './database';
import { AuthGuard } from './auth';
import { CommentDto, ModerateCommentDto } from './content.dto';
import { ListQuery } from './dto';
import { visiblePosts } from './posts';
@ApiTags('Comments')
@Controller('public/posts/:slug/comments')
export class PublicCommentsController {
  constructor(private readonly db: Database) {}
  @Get() async list(@Param('slug') slug: string, @Query() q: ListQuery) {
    const post = await this.db.post.findFirst({
      where: { slug, ...visiblePosts() },
    });
    if (!post) throw new NotFoundException();
    const where = { postId: post.id, status: 'APPROVED' as const };
    return {
      items: await this.db.comment.findMany({
        where,
        select: { id: true, name: true, content: true, createdAt: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      total: await this.db.comment.count({ where }),
      page: q.page,
      pageSize: q.pageSize,
    };
  }
  @Post()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async create(@Param('slug') slug: string, @Body() d: CommentDto) {
    if (d.website) throw new BadRequestException('Invalid submission');
    const site = await this.db.siteSetting.findUnique({
      where: { key: 'site' },
    });
    if (
      site &&
      (site.value as { commentsEnabled?: boolean })?.commentsEnabled === false
    )
      throw new ForbiddenException('Comments are closed');
    const post = await this.db.post.findFirst({
      where: { slug, ...visiblePosts() },
    });
    if (!post) throw new NotFoundException();
    await this.db.comment.create({
      data: { postId: post.id, name: d.name, content: d.content },
    });
    return { message: '评论已提交，审核后显示。' };
  }
}
@ApiTags('Moderation')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('admin/comments')
export class AdminCommentsController {
  constructor(private readonly db: Database) {}
  @Get() async list(@Query() q: ListQuery) {
    return {
      items: await this.db.comment.findMany({
        include: { post: { select: { title: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      total: await this.db.comment.count(),
      page: q.page,
      pageSize: q.pageSize,
    };
  }
  @Put(':id') async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: ModerateCommentDto,
  ) {
    return this.db.$transaction(async (tx) => {
      const existing = await tx.comment.findUniqueOrThrow({ where: { id } });
      // Lock the parent, serializing moderation and count updates for the same post.
      await tx.$queryRaw`SELECT id FROM posts WHERE id = ${existing.postId}::uuid FOR UPDATE`;
      const comment = await tx.comment.update({ where: { id }, data: d });
      await tx.post.update({
        where: { id: comment.postId },
        data: {
          commentCount: await tx.comment.count({
            where: { postId: comment.postId, status: 'APPROVED' },
          }),
        },
      });
      return comment;
    });
  }
  @Delete(':id') async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.db.$transaction(async (tx) => {
      const existing = await tx.comment.findUniqueOrThrow({ where: { id } });
      await tx.$queryRaw`SELECT id FROM posts WHERE id = ${existing.postId}::uuid FOR UPDATE`;
      await tx.comment.delete({ where: { id } });
      await tx.post.update({
        where: { id: existing.postId },
        data: {
          commentCount: await tx.comment.count({
            where: { postId: existing.postId, status: 'APPROVED' },
          }),
        },
      });
      return { deleted: true };
    });
  }
}
