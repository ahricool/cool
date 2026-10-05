import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateIf,
  Matches,
} from 'class-validator';
import { Database } from './database';
import { AuthGuard } from './auth';
import { IsAssetPath } from './validators';
export class AlbumDto {
  @ApiPropertyOptional()
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @MaxLength(100)
  nameEn?: string;
  @ApiPropertyOptional()
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @MaxLength(500)
  descriptionEn?: string;
  @ApiProperty() @IsString() @Length(1, 100) @Matches(/\S/) name!: string;
  @ApiPropertyOptional()
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @MaxLength(500)
  description?: string;
  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsAssetPath()
  coverUrl?: string | null;
}
class OrderDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(10000)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  ids!: string[];
}
export async function defaultAlbum(db: Database) {
  return db.album.upsert({
    where: { name: '默认相册' },
    create: { name: '默认相册', isDefault: true },
    update: {},
  });
}
@UseGuards(AuthGuard)
@Controller('admin/albums')
export class AlbumsController {
  constructor(private readonly db: Database) {}
  @Get() async list() {
    await defaultAlbum(this.db);
    return this.db.album.findMany({
      include: { items: { orderBy: [{ position: 'asc' }, { id: 'asc' }] } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }
  @Post() create(@Body() body: AlbumDto) {
    return this.db.album.create({
      data: { ...body, name: body.name.trim() },
      include: { items: true },
    });
  }
  @Put(':id') async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AlbumDto,
  ) {
    const album = await this.db.album.findUniqueOrThrow({ where: { id } });
    if (album.isDefault && body.name.trim() !== album.name)
      throw new BadRequestException('The default album name is fixed');
    return this.db.album.update({
      where: { id },
      data: { ...body, name: body.name.trim() },
      include: { items: true },
    });
  }
  @Put(':id/order') async order(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: OrderDto,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM albums WHERE id=${id}::uuid FOR UPDATE`;
      const items = await tx.albumItem.findMany({ where: { albumId: id } });
      if (
        items.length !== body.ids.length ||
        items.some((i) => !body.ids.includes(i.id))
      )
        throw new BadRequestException('Include every album item once');
      for (const [position, itemId] of body.ids.entries())
        await tx.albumItem.update({
          where: { id: itemId },
          data: { position },
        });
      return { saved: true };
    });
  }
  @Delete('items/:id') async removeItem(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const item = await this.db.albumItem.findUniqueOrThrow({ where: { id } });
    if (await referenced(this.db, item.url))
      throw new ConflictException(
        'Album contains assets referenced by content or settings',
      );
    await this.db.albumItem.delete({ where: { id } });
    return { deleted: true };
  }
  @Delete(':id') async remove(@Param('id', ParseUUIDPipe) id: string) {
    const album = await this.db.album.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!album) throw new NotFoundException();
    if (album.isDefault)
      throw new ConflictException('The default album cannot be deleted');
    // Keep the album with its concrete references visible for the author to resolve.
    for (const item of album.items)
      if (await referenced(this.db, item.url))
        throw new ConflictException(
          'Album contains assets referenced by content or settings',
        );
    await this.db.$transaction(async (tx) => {
      const fallback = await defaultAlbum(this.db);
      // Move membership, retaining historical photo IDs and all upload files.
      await tx.albumItem.updateMany({
        where: { albumId: id },
        data: { albumId: fallback.id },
      });
      await tx.album.delete({ where: { id } });
    });
    // Deleting an album never deletes the underlying storage object or file.
    return { deleted: true };
  }
}
export async function referenced(db: Database, url: string) {
  // A JSON group may escape slashes; the stable file key still identifies it.
  const needle = url.split('/').at(-1) || url;
  const counts = await Promise.all([
    db.post.count({
      where: {
        OR: [
          { coverUrl: url },
          { translations: { some: { content: { contains: needle } } } },
        ],
      },
    }),
    db.page.count({
      where: {
        OR: [
          { coverUrl: url },
          { translations: { some: { content: { contains: needle } } } },
        ],
      },
    }),
    db.moment.count({
      where: { translations: { some: { content: { contains: needle } } } },
    }),
    db.user.count({ where: { avatarUrl: url } }),
    db.album.count({ where: { coverUrl: url } }),
  ]);
  return (
    counts.some(Boolean) ||
    JSON.stringify(await db.siteSetting.findMany()).includes(url)
  );
}
