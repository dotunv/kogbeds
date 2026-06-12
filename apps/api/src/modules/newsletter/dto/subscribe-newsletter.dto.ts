import { IsEmail, MaxLength } from 'class-validator';

export class SubscribeNewsletterDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
