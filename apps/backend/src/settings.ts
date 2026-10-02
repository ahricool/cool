import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsDefined,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsString,
  IsUrl,
  Length,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Database } from './database';
import { AuthGuard } from './auth';
import { IsAssetPath } from './validators';
class SocialDto {
  @ApiProperty() @IsString() @Length(1, 50) label!: string;
  @ApiProperty()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  url!: string;
}
class SiteDto {
  @ApiProperty() @IsString() @Length(1, 80) title!: string;
  @ApiProperty() @IsString() @MaxLength(300) description!: string;
  @ApiProperty() @IsString() @Length(1, 100) authorName!: string;
  @ApiProperty() @IsString() @MaxLength(500) authorBio!: string;
  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsAssetPath()
  avatarUrl?: string | null;
  @ApiProperty() @IsBoolean() commentsEnabled!: boolean;
}
class HomepageDto {
  @ApiProperty() @IsAssetPath() coverUrl!: string;
  @ApiProperty() @IsIn(['avatar', 'glitch-text']) focusMode!:
    'avatar' | 'glitch-text';
  @ApiProperty() @IsString() @Length(1, 80) greeting!: string;
  @ApiProperty() @IsString() @MaxLength(200) description!: string;
  @ApiProperty() @IsString() @MaxLength(300) notice!: string;
  @ApiProperty() @IsBoolean() wave!: boolean;
}
class SettingsDto {
  @ApiProperty({ type: SiteDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => SiteDto)
  site!: SiteDto;
  @ApiProperty({ type: HomepageDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => HomepageDto)
  homepage!: HomepageDto;
  @ApiProperty({ type: [SocialDto] })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SocialDto)
  social!: SocialDto[];
}
export const defaultSettings = {
  site: {
    title: 'Sakura',
    description: '记录生活，也记录每一次灵感。',
    authorName: '站长',
    authorBio: '在这里，收藏日常的微光。',
    avatarUrl: '/sakura/images/default/avatar.webp',
    commentsEnabled: true,
  },
  homepage: {
    coverUrl: '/sakura/images/default/hd.webp',
    focusMode: 'glitch-text',
    greeting: 'Hi, Sakura!',
    description: 'You got to put the past behind you before you can move on.',
    notice: '欢迎来到我的小小世界。',
    wave: true,
  },
  social: [],
};
@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly db: Database) {}
  @Get() async get() {
    const rows = await this.db.siteSetting.findMany({
      where: { key: { in: ['site', 'homepage', 'social'] } },
    });
    const saved = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      ...defaultSettings,
      ...saved,
      site: { ...defaultSettings.site, ...((saved.site as object) ?? {}) },
      homepage: {
        ...defaultSettings.homepage,
        ...((saved.homepage as object) ?? {}),
      },
    };
  }
  @Put() async save(@Body() d: SettingsDto) {
    await this.db.$transaction(
      Object.entries(d).map(([key, value]) =>
        this.db.siteSetting.upsert({
          where: { key },
          create: { key, value: JSON.parse(JSON.stringify(value)) },
          update: { value: JSON.parse(JSON.stringify(value)) },
        }),
      ),
    );
    return d;
  }
}
