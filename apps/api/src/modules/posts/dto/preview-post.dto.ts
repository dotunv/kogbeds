import {
  Allow,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PreviewPostDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200000)
  contentMarkdown?: string;

  @IsOptional()
  @Allow()
  blocks?: unknown;
}
