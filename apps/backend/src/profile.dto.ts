import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Length, ValidateIf } from 'class-validator';
import { IsAssetPath } from './validators';
export class ProfileDto {
  @ApiProperty() @IsString() @Length(1, 100) displayName!: string;
  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsAssetPath()
  avatarUrl?: string | null;
}
export class PasswordDto {
  @ApiProperty() @IsString() @Length(1, 256) currentPassword!: string;
  @ApiProperty() @IsString() @Length(16, 256) newPassword!: string;
}
