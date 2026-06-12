import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';

export enum PostStatusFilter {
  ALL = 'all',
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export class ListPostsQueryDto {
  @IsOptional()
  @IsEnum(PostStatusFilter)
  @Transform(({ value }: { value: string | undefined }) => value?.toLowerCase())
  status: PostStatusFilter = PostStatusFilter.ALL;
}
