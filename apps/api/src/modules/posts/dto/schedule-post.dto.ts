import { IsISO8601 } from 'class-validator';

export class SchedulePostDto {
  @IsISO8601()
  scheduledAt!: string;
}
