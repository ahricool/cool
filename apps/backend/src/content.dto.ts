import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  PickType,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsString,
  IsUrl,
  Length,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';
import { CreatePostDto, ListQuery } from './dto';
import { CommentStatus, PostStatus } from './generated/prisma/enums';
import { IsAssetPath } from './validators';
export class TaxonomyDto {
  @ApiProperty() @IsString() @Length(1, 100) @Matches(/\S/) name!: string;
  @ApiProperty()
  @IsString()
  @Length(1, 160)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;
}
export class PageDto extends PickType(CreatePostDto, [
  'slug',
  'title',
  'content',
  'status',
  'publishedAt',
] as const) {
  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsAssetPath()
  coverUrl?: string | null;
}
export class UpdatePageDto extends PartialType(PageDto, {
  skipNullProperties: false,
}) {}
export class MomentDto extends PickType(CreatePostDto, [
  'status',
  'publishedAt',
] as const) {
  @ApiProperty() @IsString() @Length(1, 20000) content!: string;
}
export class UpdateMomentDto extends PartialType(MomentDto, {
  skipNullProperties: false,
}) {}
export class PhotoDto {
  @ApiProperty() @IsString() @Length(1, 200) title!: string;
  @ApiProperty() @IsAssetPath() url!: string;
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
  @ApiPropertyOptional()
  @ValidateIf((_o, v) => v !== undefined)
  @IsBoolean()
  published?: boolean;
}
export class UpdatePhotoDto extends PartialType(PhotoDto, {
  skipNullProperties: false,
}) {}
export class LinkDto {
  @ApiProperty() @IsString() @Length(1, 100) name!: string;
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
  @IsString()
  @MaxLength(500)
  description?: string;
  @ApiPropertyOptional()
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Length(1, 100)
  group?: string;
  @ApiPropertyOptional()
  @ValidateIf((_o, v) => v !== undefined)
  @IsBoolean()
  published?: boolean;
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
