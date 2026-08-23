import { IsOptional, IsString } from 'class-validator';

export class RecordViewDto {
  @IsOptional()
  @IsString()
  postSlug?: string;
}
