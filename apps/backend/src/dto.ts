import { IsAssetPath } from './validators';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
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
import { PostStatus } from './generated/prisma/enums';
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
  category?: string;
  @ApiPropertyOptional()
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Length(1, 160)
  tag?: string;
}
export class CreatePostDto {
  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(160)
  slug!: string;
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
  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsAssetPath()
  @MaxLength(2048)
  coverUrl?: string | null;
  @ApiPropertyOptional({ enum: PostStatus })
  @ValidateIf((_o, v) => v !== undefined)
  @IsEnum(PostStatus)
  status?: PostStatus;
  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsISO8601({ strict: true })
  publishedAt?: string | null;
  @ApiPropertyOptional({ type: [String] })
  @ValidateIf((_o, v) => v !== undefined)
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  categoryIds?: string[];
  @ApiPropertyOptional({ type: [String] })
  @ValidateIf((_o, v) => v !== undefined)
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  tagIds?: string[];
}
export class UpdatePostDto extends PartialType(CreatePostDto, {
  skipNullProperties: false,
}) {}
