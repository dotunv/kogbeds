import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum PostStatusFilter {
  ALL = 'all',
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SCHEDULED = 'scheduled',
}

export class ListPostsQueryDto {
  @IsOptional()
  @IsEnum(PostStatusFilter)
  @Transform(({ value }: { value: string | undefined }) => value?.toLowerCase())
  status: PostStatusFilter = PostStatusFilter.ALL;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}
