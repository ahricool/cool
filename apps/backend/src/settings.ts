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
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Database } from './database';
import { AuthGuard } from './auth';
import { ADMIN_DISPLAY_NAME } from './auth.constants';
import { IsAssetPath } from './validators';
import { LocaleDto } from './dto';
class SiteTranslationDto extends LocaleDto {
  @ApiProperty() @IsString() @Length(1, 80) @Matches(/\S/) title!: string;
  @ApiProperty() @IsString() @MaxLength(300) description!: string;
  @ApiProperty() @IsString() @MaxLength(500) authorBio!: string;
}
class AppearanceDto {
  @ApiPropertyOptional({ enum: ['default', 'bubble-candy'] })
  @ValidateIf((_o, value) => value !== undefined)
  @IsIn(['default', 'bubble-candy'])
  font?: 'default' | 'bubble-candy';
  @ApiProperty({ enum: ['heart', 'star', 'dot'] })
  @IsIn(['heart', 'star', 'dot'])
  avatar!: 'heart' | 'star' | 'dot';
  @ApiProperty({ enum: ['heart', 'star', 'dot'] })
  @IsIn(['heart', 'star', 'dot'])
  cover!: 'heart' | 'star' | 'dot';
  @ApiProperty({ enum: ['heart', 'star', 'dot', 'none'] })
  @IsIn(['heart', 'star', 'dot', 'none'])
  background!: 'heart' | 'star' | 'dot' | 'none';
}
class SiteDto {
  @ApiProperty() @IsString() @Length(1, 100) @Matches(/\S/) authorName!: string;
  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsAssetPath()
  avatarUrl?: string | null;
  @ApiProperty() @IsBoolean() commentsEnabled!: boolean;
  @ApiPropertyOptional({ type: AppearanceDto })
  @ValidateIf((_o, value) => value !== undefined)
  @IsDefined()
  @ValidateNested()
  @Type(() => AppearanceDto)
  appearance?: AppearanceDto;
  @ApiProperty({ type: [SiteTranslationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ArrayUnique((item: LocaleDto) => item?.locale)
  @ValidateNested({ each: true })
  @Type(() => SiteTranslationDto)
  translations!: SiteTranslationDto[];
}
class HomepageTranslationDto extends LocaleDto {
  @ApiProperty() @IsString() @Length(1, 80) @Matches(/\S/) greeting!: string;
  @ApiProperty() @IsString() @MaxLength(200) description!: string;
  @ApiProperty() @IsString() @MaxLength(300) notice!: string;
}
class HomepageDto {
  @ApiProperty() @IsAssetPath() coverUrl!: string;
  @ApiProperty() @IsIn(['avatar', 'glitch-text']) focusMode!:
    'avatar' | 'glitch-text';
  @ApiProperty() @IsBoolean() wave!: boolean;
  @ApiProperty({ type: [HomepageTranslationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ArrayUnique((item: LocaleDto) => item?.locale)
  @ValidateNested({ each: true })
  @Type(() => HomepageTranslationDto)
  translations!: HomepageTranslationDto[];
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
}
export const defaultSettings = {
  site: {
    authorName: ADMIN_DISPLAY_NAME,
    avatarUrl: null,
    appearance: {
      font: 'default' as const,
      avatar: 'heart' as const,
      cover: 'dot' as const,
      background: 'dot' as const,
    },
    commentsEnabled: true,
    translations: [
      {
        locale: 'zh' as const,
        title: '梦桜',
        description: '记录生活，也记录每一次灵感。',
        authorBio: '在这里，收藏日常的微光。',
      },
      {
        locale: 'en' as const,
        title: '梦桜',
        description: 'A journal of everyday life and inspiration.',
        authorBio: 'Collecting the little sparks of everyday life.',
      },
    ],
  },
  homepage: {
    coverUrl: '/sakura/images/default/hd.webp',
    focusMode: 'glitch-text',
    wave: true,
    translations: [
      {
        locale: 'zh' as const,
        greeting: 'Hi, 梦桜!',
        description: '放下过去，继续向前。',
        notice: '欢迎来到我的小小世界。',
      },
      {
        locale: 'en' as const,
        greeting: 'Hi, 梦桜!',
        description:
          'You got to put the past behind you before you can move on.',
        notice: 'Welcome to my little corner of the world.',
      },
    ],
  },
};
export async function readSettings(db: Database) {
  const rows = await db.siteSetting.findMany({
    where: { key: { in: ['site', 'homepage'] } },
  });
  const saved = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const site = (saved.site ?? defaultSettings.site) as unknown as SiteDto;
  return {
    site: {
      ...site,
      // Interpret the retired bundled avatar as the default without rewriting stored user data.
      avatarUrl:
        site.avatarUrl === '/sakura/images/default/avatar.webp'
          ? null
          : site.avatarUrl,
      appearance: { ...defaultSettings.site.appearance, ...site.appearance },
    },
    homepage: (saved.homepage ??
      defaultSettings.homepage) as unknown as HomepageDto,
  };
}
@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly db: Database) {}
  @Get() get() {
    return readSettings(this.db);
  }
  @Put() async save(@Body() d: SettingsDto) {
    const currentAppearance = (await readSettings(this.db)).site.appearance;
    d.site.appearance = { ...currentAppearance, ...d.site.appearance };
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
