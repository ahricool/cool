import {
  BadRequestException,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { Response } from 'express';
import { Database } from './database';
import { AuthGuard } from './auth';
import { ListQuery } from './dto';
import { mediaRoot } from './media-root';
export const mediaUrl = (key: string) => `/api/v1/media/${key}`;
@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('admin/media')
export class MediaController {
  constructor(private readonly db: Database) {}
  @Get() async list(@Query() q: ListQuery) {
    const items = await this.db.media.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    });
    return {
      items: items.map((m) => ({ ...m, url: mediaUrl(m.key) })),
      total: await this.db.media.count(),
      page: q.page,
      pageSize: q.pageSize,
    };
  }
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 0 },
    }),
  )
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('An image file is required');
    let result;
    try {
      const input = sharp(file.buffer, {
        limitInputPixels: 40_000_000,
        animated: false,
      });
      const meta = await input.metadata();
      if (!['jpeg', 'png', 'webp', 'gif'].includes(meta.format ?? ''))
        throw new Error();
      result = await input
        .rotate()
        .resize({
          width: 2560,
          height: 2560,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer({ resolveWithObject: true });
    } catch {
      throw new BadRequestException(
        'Upload a valid JPEG, PNG, WebP or GIF image (up to 40 megapixels)',
      );
    }
    const key = `${randomUUID()}.webp`;
    await mkdir(mediaRoot(), { recursive: true });
    await writeFile(resolve(mediaRoot(), key), result.data, { flag: 'wx' });
    try {
      const m = await this.db.media.create({
        data: {
          key,
          originalName: file.originalname.slice(0, 255),
          mimeType: 'image/webp',
          size: result.data.length,
          width: result.info.width,
          height: result.info.height,
        },
      });
      return { ...m, url: mediaUrl(key) };
    } catch (error) {
      await unlink(resolve(mediaRoot(), key));
      throw error;
    }
  }
  @Delete(':id') async remove(@Param('id', ParseUUIDPipe) id: string) {
    const m = await this.db.media.findUniqueOrThrow({ where: { id } });
    const url = mediaUrl(m.key);
    const used = await Promise.all([
      this.db.post.count({
        where: {
          OR: [
            { coverUrl: url },
            { translations: { some: { content: { contains: url } } } },
          ],
        },
      }),
      this.db.page.count({
        where: {
          OR: [
            { coverUrl: url },
            { translations: { some: { content: { contains: url } } } },
          ],
        },
      }),
      this.db.moment.count({
        where: { translations: { some: { content: { contains: url } } } },
      }),
      this.db.photo.count({ where: { url } }),
      this.db.link.count({ where: { logoUrl: url } }),
      this.db.user.count({ where: { avatarUrl: url } }),
    ]);
    const settings = await this.db.siteSetting.findMany();
    if (used.some(Boolean) || JSON.stringify(settings).includes(url))
      throw new ConflictException(
        'This image is still referenced by content or settings',
      );
    await this.db.media.delete({ where: { id } });
    await unlink(resolve(mediaRoot(), m.key)).catch(
      (e: NodeJS.ErrnoException) => {
        if (e.code !== 'ENOENT') throw e;
      },
    );
    return { deleted: true };
  }
}
@ApiTags('Public media')
@Controller('media')
export class PublicMediaController {
  constructor(private readonly db: Database) {}
  @Get(':key') async get(@Param('key') key: string, @Res() response: Response) {
    if (
      !/^[a-f0-9-]{36}\.webp$/.test(key) ||
      !(await this.db.media.findUnique({ where: { key } }))
    )
      throw new NotFoundException();
    response.setHeader('Content-Type', 'image/webp');
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.sendFile(resolve(mediaRoot(), key));
  }
}
