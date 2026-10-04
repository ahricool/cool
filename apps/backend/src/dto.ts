import { IsAssetPath } from './validators';
import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  OmitType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ValidateNested,
  IsDefined,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ContentLocale, PostStatus } from './generated/prisma/enums';
export class ListQuery {
  @ApiPropertyOptional({ default: 1 })
  @ValidateIf((_o, v) => v !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page = 1;
  @ApiPropertyOptional({ default: 10, maximum: 50 })
  @ValidateIf((_o, v) => v !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 10;
  @ApiPropertyOptional()
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Length(1, 100)
  q?: string;
  @ApiPropertyOptional()
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Length(1, 160)
  tag?: string;
}
export class LocaleDto {
  @ApiProperty({ enum: ContentLocale })
  @IsEnum(ContentLocale)
  locale!: ContentLocale;
}
export class PostTranslationDto extends LocaleDto {
  @ApiProperty() @IsString() @Length(1, 200) @Matches(/\S/) title!: string;
  @ApiPropertyOptional()
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @MaxLength(500)
  excerpt?: string;
  @ApiPropertyOptional({ description: 'Markdown source' })
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @MaxLength(500000)
  content?: string;
  @ApiPropertyOptional({ enum: PostStatus })
  @ValidateIf((_o, v) => v !== undefined)
  @IsEnum(PostStatus)
  status?: PostStatus;
  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsISO8601({ strict: true })
  publishedAt?: string | null;
}
export class UpdatePostTranslationDto extends PartialType(
  OmitType(PostTranslationDto, ['locale'] as const),
  {
    skipNullProperties: false,
  },
) {
  @ApiProperty({ enum: ContentLocale })
  @IsDefined()
  @IsEnum(ContentLocale)
  locale!: ContentLocale;
}
export class CreatePostDto {
  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsAssetPath()
  @MaxLength(2048)
  coverUrl?: string | null;
  @ApiProperty({ type: [PostTranslationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ArrayUnique((item: PostTranslationDto) => item?.locale)
  @ValidateNested({ each: true })
  @Type(() => PostTranslationDto)
  translations!: PostTranslationDto[];
  @ApiPropertyOptional({ type: [String] })
  @ValidateIf((_o, v) => v !== undefined)
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  tagIds?: string[];
}
export class UpdatePostDto extends PartialType(
  OmitType(CreatePostDto, ['translations'] as const),
  { skipNullProperties: false },
) {
  @ApiPropertyOptional({ type: [UpdatePostTranslationDto] })
  @ValidateIf((_o, v) => v !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ArrayUnique((item: UpdatePostTranslationDto) => item?.locale)
  @ValidateNested({ each: true })
  @Type(() => UpdatePostTranslationDto)
  translations?: UpdatePostTranslationDto[];
}
