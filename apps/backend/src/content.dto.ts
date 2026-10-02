import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  PickType,
  OmitType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDefined,
  IsBoolean,
  IsEnum,
  IsString,
  IsUrl,
  Length,
  MaxLength,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  CreatePostDto,
  ListQuery,
  LocaleDto,
  PostTranslationDto,
  UpdatePostTranslationDto,
} from './dto';
import {
  CommentStatus,
  ContentLocale,
  PostStatus,
} from './generated/prisma/enums';
import { IsAssetPath } from './validators';
export class TaxonomyTranslationDto extends LocaleDto {
  @ApiProperty() @IsString() @Length(1, 100) @Matches(/\S/) name!: string;
}
export class TaxonomyDto {
  @ApiProperty()
  @IsString()
  @Length(1, 160)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;
  @ApiProperty({ type: [TaxonomyTranslationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ArrayUnique((item: LocaleDto) => item?.locale)
  @ValidateNested({ each: true })
  @Type(() => TaxonomyTranslationDto)
  translations!: TaxonomyTranslationDto[];
}
export class PageTranslationDto extends OmitType(PostTranslationDto, [
  'excerpt',
] as const) {}
export class UpdatePageTranslationDto extends OmitType(
  UpdatePostTranslationDto,
  ['excerpt'] as const,
) {}
export class PageDto extends PickType(CreatePostDto, [
  'slug',
  'coverUrl',
] as const) {
  @ApiProperty({ type: [PageTranslationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ArrayUnique((item: LocaleDto) => item?.locale)
  @ValidateNested({ each: true })
  @Type(() => PageTranslationDto)
  translations!: PageTranslationDto[];
}
export class UpdatePageDto extends PartialType(
  OmitType(PageDto, ['translations'] as const),
  { skipNullProperties: false },
) {
  @ApiPropertyOptional({ type: [UpdatePageTranslationDto] })
  @ValidateIf((_o, v) => v !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ArrayUnique((item: LocaleDto) => item?.locale)
  @ValidateNested({ each: true })
  @Type(() => UpdatePageTranslationDto)
  translations?: UpdatePageTranslationDto[];
}
export class MomentTranslationDto extends PickType(PostTranslationDto, [
  'locale',
  'status',
  'publishedAt',
] as const) {
  @ApiProperty() @IsString() @Length(1, 20000) @Matches(/\S/) content!: string;
}
export class MomentDto {
  @ApiProperty({ type: [MomentTranslationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ArrayUnique((item: LocaleDto) => item?.locale)
  @ValidateNested({ each: true })
  @Type(() => MomentTranslationDto)
  translations!: MomentTranslationDto[];
}
export class UpdateMomentTranslationDto extends PartialType(
  OmitType(MomentTranslationDto, ['locale'] as const),
  { skipNullProperties: false },
) {
  @ApiProperty({ enum: ContentLocale })
  @IsDefined()
  @IsEnum(ContentLocale)
  locale!: ContentLocale;
}
export class UpdateMomentDto {
  @ApiPropertyOptional({ type: [UpdateMomentTranslationDto] })
  @ValidateIf((_o, v) => v !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ArrayUnique((item: LocaleDto) => item?.locale)
  @ValidateNested({ each: true })
  @Type(() => UpdateMomentTranslationDto)
  translations?: UpdateMomentTranslationDto[];
}
export class PhotoTranslationDto extends LocaleDto {
  @ApiProperty() @IsString() @Length(1, 200) @Matches(/\S/) title!: string;
  @ApiPropertyOptional()
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @MaxLength(500)
  description?: string;
  @ApiPropertyOptional()
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @MaxLength(100)
  album?: string;
}
export class PhotoDto {
  @ApiProperty() @IsAssetPath() url!: string;
  @ApiPropertyOptional()
  @ValidateIf((_o, v) => v !== undefined)
  @IsBoolean()
  published?: boolean;
  @ApiProperty({ type: [PhotoTranslationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ArrayUnique((item: LocaleDto) => item?.locale)
  @ValidateNested({ each: true })
  @Type(() => PhotoTranslationDto)
  translations!: PhotoTranslationDto[];
}
export class UpdatePhotoDto extends PartialType(PhotoDto, {
  skipNullProperties: false,
}) {}
export class LinkTranslationDto extends LocaleDto {
  @ApiProperty() @IsString() @Length(1, 100) @Matches(/\S/) name!: string;
  @ApiPropertyOptional()
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @MaxLength(500)
  description?: string;
  @ApiPropertyOptional()
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @MaxLength(100)
  group?: string;
}
export class LinkDto {
  @ApiProperty()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  url!: string;
  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsAssetPath()
  logoUrl?: string | null;
  @ApiPropertyOptional()
  @ValidateIf((_o, v) => v !== undefined)
  @IsBoolean()
  published?: boolean;
  @ApiProperty({ type: [LinkTranslationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ArrayUnique((item: LocaleDto) => item?.locale)
  @ValidateNested({ each: true })
  @Type(() => LinkTranslationDto)
  translations!: LinkTranslationDto[];
}
export class UpdateLinkDto extends PartialType(LinkDto, {
  skipNullProperties: false,
}) {}
export class CommentDto {
  @ApiProperty() @IsString() @Length(1, 80) @Matches(/\S/) name!: string;
  @ApiProperty() @IsString() @Length(1, 3000) @Matches(/\S/) content!: string;
  @ApiPropertyOptional({ description: 'Leave empty' })
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @MaxLength(200)
  website?: string;
}
export class ModerateCommentDto {
  @ApiProperty({ enum: CommentStatus })
  @IsEnum(CommentStatus)
  status!: CommentStatus;
}
export class AdminListQuery extends ListQuery {
  @ApiPropertyOptional({ enum: PostStatus })
  @ValidateIf((_o, v) => v !== undefined)
  @IsEnum(PostStatus)
  status?: PostStatus;
}
