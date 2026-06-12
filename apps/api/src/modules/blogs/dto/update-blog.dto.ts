import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateBlogDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  customCss?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(253)
  @Matches(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i,
    {
      message: 'customDomain must be a valid hostname (e.g. blog.example.com)',
    },
  )
  customDomain?: string | null;
}
