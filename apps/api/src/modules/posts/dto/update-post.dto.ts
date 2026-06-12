import {
  Allow,
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'slug must contain lowercase letters/numbers and optional single hyphens',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200000)
  contentMarkdown?: string;

  @IsOptional()
  @Allow()
  blocks?: unknown;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  featuredImageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    each: true,
    message: 'each tag slug must be lowercase alphanumeric with single hyphens',
  })
  tagSlugs?: string[];
}
