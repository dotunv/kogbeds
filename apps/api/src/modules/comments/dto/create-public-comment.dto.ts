import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePublicCommentDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  authorName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  authorEmail?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body!: string;
}
