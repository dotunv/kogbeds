import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'slug must contain lowercase letters/numbers and optional single hyphens',
  })
  slug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200000)
  contentMarkdown!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  featuredImageUrl?: string;
}
