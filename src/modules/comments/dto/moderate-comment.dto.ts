import { IsEnum } from 'class-validator';

export enum ModerateCommentAction {
  APPROVED = 'APPROVED',
  SPAM = 'SPAM',
  REJECTED = 'REJECTED',
}

export class ModerateCommentDto {
  @IsEnum(ModerateCommentAction)
  status!: ModerateCommentAction;
}
