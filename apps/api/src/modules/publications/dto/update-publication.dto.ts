import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PublicationType } from '@prisma/client';

export class UpdatePublicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(PublicationType)
  type?: PublicationType;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'accentColor must be a hex color' })
  accentColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  footerText?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
