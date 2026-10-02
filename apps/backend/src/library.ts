import {
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
import { PostStatus } from './generated/prisma/enums';
import { visiblePosts } from './posts';
function publication(
  data: { status?: PostStatus; publishedAt?: string | null },
  current?: { status: PostStatus; publishedAt: Date | null },
) {
  const status = data.status ?? current?.status ?? 'DRAFT';
  const date =
    data.publishedAt === undefined
      ? current?.publishedAt
      : data.publishedAt
        ? new Date(data.publishedAt)
        : null;
  return {
    status,
    publishedAt: status === 'PUBLISHED' ? (date ?? new Date()) : (date ?? null),
  };
}
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
    return this.db.category.findMany({ orderBy: { name: 'asc' } });
  }
  @Post('categories') createCategory(@Body() d: TaxonomyDto) {
    return this.db.category.create({ data: d });
  }
  @Put('categories/:id') updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: TaxonomyDto,
  ) {
    return this.db.category.update({ where: { id }, data: d });
  }
  @Delete('categories/:id') async deleteCategory(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.db.category.delete({ where: { id } });
    return { deleted: true };
  }
  @Get('tags') tags() {
    return this.db.tag.findMany({ orderBy: { name: 'asc' } });
  }
  @Post('tags') createTag(@Body() d: TaxonomyDto) {
    return this.db.tag.create({ data: d });
  }
  @Put('tags/:id') updateTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: TaxonomyDto,
  ) {
    return this.db.tag.update({ where: { id }, data: d });
  }
  @Delete('tags/:id') async deleteTag(@Param('id', ParseUUIDPipe) id: string) {
    await this.db.tag.delete({ where: { id } });
    return { deleted: true };
  }
  @Get('pages') async pages(@Query() q: ListQuery) {
    const where = q.q ? { title: { contains: q.q } } : {};
    return {
      items: await this.db.page.findMany({
        where,
        ...paging(q),
        orderBy: { updatedAt: 'desc' },
      }),
      total: await this.db.page.count({ where }),
      page: q.page,
      pageSize: q.pageSize,
    };
  }
  @Get('pages/:id') async page(@Param('id', ParseUUIDPipe) id: string) {
    const p = await this.db.page.findUnique({ where: { id } });
    if (!p) throw new NotFoundException();
    return p;
  }
  @Post('pages') createPage(@Body() d: PageDto) {
    return this.db.page.create({ data: { ...d, ...publication(d) } });
  }
  @Put('pages/:id') async updatePage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdatePageDto,
  ) {
    return this.db.$transaction(async (tx) => {
      const p = await tx.page.findUniqueOrThrow({ where: { id } });
      return tx.page.update({
        where: { id },
        data: { ...d, ...publication(d, p) },
      });
    });
  }
  @Delete('pages/:id') async deletePage(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.db.page.delete({ where: { id } });
    return { deleted: true };
  }
  @Get('moments') async moments(@Query() q: ListQuery) {
    return {
      items: await this.db.moment.findMany({
        ...paging(q),
        orderBy: { createdAt: 'desc' },
      }),
      total: await this.db.moment.count(),
      page: q.page,
      pageSize: q.pageSize,
    };
  }
  @Post('moments') createMoment(@Body() d: MomentDto) {
    return this.db.moment.create({ data: { ...d, ...publication(d) } });
  }
  @Put('moments/:id') async updateMoment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdateMomentDto,
  ) {
    return this.db.$transaction(async (tx) => {
      const p = await tx.moment.findUniqueOrThrow({ where: { id } });
      return tx.moment.update({
        where: { id },
        data: { ...d, ...publication(d, p) },
      });
    });
  }
  @Delete('moments/:id') async deleteMoment(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.db.moment.delete({ where: { id } });
    return { deleted: true };
  }
  @Get('photos') async photos(@Query() q: ListQuery) {
    return {
      items: await this.db.photo.findMany({
        ...paging(q),
        orderBy: { createdAt: 'desc' },
      }),
      total: await this.db.photo.count(),
      page: q.page,
      pageSize: q.pageSize,
    };
  }
  @Post('photos') createPhoto(@Body() d: PhotoDto) {
    return this.db.photo.create({ data: d });
  }
  @Put('photos/:id') updatePhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdatePhotoDto,
  ) {
    return this.db.photo.update({ where: { id }, data: d });
  }
  @Delete('photos/:id') async deletePhoto(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.db.photo.delete({ where: { id } });
    return { deleted: true };
  }
  @Get('links') async links(@Query() q: ListQuery) {
    return {
      items: await this.db.link.findMany({
        ...paging(q),
        orderBy: { createdAt: 'desc' },
      }),
      total: await this.db.link.count(),
      page: q.page,
      pageSize: q.pageSize,
    };
  }
  @Post('links') createLink(@Body() d: LinkDto) {
    return this.db.link.create({ data: d });
  }
  @Put('links/:id') updateLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdateLinkDto,
  ) {
    return this.db.link.update({ where: { id }, data: d });
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
      this.db.post.count({ where: { status: 'DRAFT' } }),
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
  @Get('pages/:slug') async page(@Param('slug') slug: string) {
    const page = await this.db.page.findFirst({
      where: { slug, ...visiblePosts() },
    });
    if (!page) throw new NotFoundException();
    return page;
  }
  @Get('moments') async moments(@Query() q: ListQuery) {
    const where = visiblePosts();
    return {
      items: await this.db.moment.findMany({
        where,
        ...paging(q),
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      }),
      total: await this.db.moment.count({ where }),
      page: q.page,
      pageSize: q.pageSize,
    };
  }
  @Get('photos') async photos(@Query() q: ListQuery) {
    return {
      items: await this.db.photo.findMany({
        where: { published: true },
        ...paging(q),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      total: await this.db.photo.count({ where: { published: true } }),
      page: q.page,
      pageSize: q.pageSize,
    };
  }
  @Get('links') async links(@Query() q: ListQuery) {
    return {
      items: await this.db.link.findMany({
        where: { published: true },
        ...paging(q),
        orderBy: [{ group: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      }),
      total: await this.db.link.count({ where: { published: true } }),
      page: q.page,
      pageSize: q.pageSize,
    };
  }
}
