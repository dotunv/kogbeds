import { Allow, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PostFormat } from '@prisma/client';

export class CreateChapterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string;

  @IsEnum(PostFormat)
  format!: PostFormat;

  @IsOptional()
  @IsString()
  markdownContent?: string;

  @IsOptional()
  @Allow()
  blocks?: unknown;
}
