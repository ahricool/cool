import { defaultAlbum, referenced } from './albums';
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
      limits: { fileSize: 64 * 1024 * 1024, files: 1, fields: 0 },
    }),
  )
  async upload(
    @Query('albumId') albumId: string | undefined,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('A media file is required');
    if (albumId && !/^[a-f0-9-]{36}$/.test(albumId))
      throw new BadRequestException('Invalid album');
    const album = albumId
      ? await this.db.album.findUnique({ where: { id: albumId } })
      : await defaultAlbum(this.db);
    if (!album) throw new BadRequestException('Album not found');
    let result;
    let mimeType = 'image/webp';
    let extension = 'webp';
    const bytes = file.buffer;
    // Container signatures plus an allowlisted MIME type; no SVG/HTML uploads.
    const formats: Record<string, { extension: string; valid: boolean }> = {
      'video/mp4': {
        extension: 'mp4',
        valid: bytes.subarray(4, 8).toString() === 'ftyp',
      },
      'audio/mp4': {
        extension: 'm4a',
        valid: bytes.subarray(4, 8).toString() === 'ftyp',
      },
      'video/webm': {
        extension: 'webm',
        valid: bytes
          .subarray(0, 4)
          .equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
      },
      'audio/webm': {
        extension: 'webm',
        valid: bytes
          .subarray(0, 4)
          .equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
      },
      'audio/mpeg': {
        extension: 'mp3',
        valid:
          bytes.subarray(0, 3).toString() === 'ID3' ||
          (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0),
      },
      'audio/wav': {
        extension: 'wav',
        valid:
          bytes.subarray(0, 4).toString() === 'RIFF' &&
          bytes.subarray(8, 12).toString() === 'WAVE',
      },
      'audio/ogg': {
        extension: 'ogg',
        valid: bytes.subarray(0, 4).toString() === 'OggS',
      },
    };
    if (
      file.mimetype.startsWith('audio/') ||
      file.mimetype.startsWith('video/')
    ) {
      const format = formats[file.mimetype];
      if (!format?.valid)
        throw new BadRequestException(
          'Upload a valid MP4, WebM, MP3, WAV or Ogg file',
        );
      mimeType = file.mimetype;
      extension = format.extension;
      result = { data: bytes, info: { width: 0, height: 0 } };
    } else {
      if (file.size > 8 * 1024 * 1024)
        throw new BadRequestException('Images must be at most 8 MB');
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
    }
    const key = `${randomUUID()}.${extension}`;
    await mkdir(mediaRoot(), { recursive: true });
    await writeFile(resolve(mediaRoot(), key), result.data, { flag: 'wx' });
    try {
      const m = await this.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM albums WHERE id=${album.id}::uuid FOR UPDATE`;
        const media = await tx.media.create({
          data: {
            key,
            originalName: file.originalname.slice(0, 255),
            mimeType,
            size: result.data.length,
            width: result.info.width,
            height: result.info.height,
          },
        });
        const last = await tx.albumItem.aggregate({
          where: { albumId: album.id },
          _max: { position: true },
        });
        await tx.albumItem.create({
          data: {
            albumId: album.id,
            mediaId: media.id,
            url: mediaUrl(key),
            name: media.originalName,
            mimeType,
            position: (last._max.position ?? -1) + 1,
          },
        });
        return media;
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
      this.db.user.count({ where: { avatarUrl: url } }),
    ]);
    const settings = await this.db.siteSetting.findMany();
    if (
      used.some(Boolean) ||
      JSON.stringify(settings).includes(url) ||
      (await referenced(this.db, url))
    )
      throw new ConflictException(
        'This image is still referenced by content or settings',
      );
    await this.db.$transaction(async (tx) => {
      await tx.albumItem.deleteMany({ where: { mediaId: id } });
      await tx.media.delete({ where: { id } });
    });
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
    if (!/^[a-f0-9-]{36}\.(webp|mp4|m4a|webm|mp3|wav|ogg)$/.test(key))
      throw new NotFoundException();
    const media = await this.db.media.findUnique({ where: { key } });
    if (!media) throw new NotFoundException();
    response.setHeader('Content-Type', media.mimeType);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.sendFile(resolve(mediaRoot(), key));
  }
}
