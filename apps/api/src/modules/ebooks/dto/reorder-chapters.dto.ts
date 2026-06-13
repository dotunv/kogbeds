import { IsArray, IsInt, ArrayMinSize } from 'class-validator';

export class ReorderChaptersDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  order!: number[];
}
