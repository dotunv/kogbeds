import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  email!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9]+$/, {
    message: 'username must contain only lowercase letters and numbers',
  })
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/[A-Z]/, { message: 'password must include an uppercase letter' })
  @Matches(/[a-z]/, { message: 'password must include a lowercase letter' })
  @Matches(/[0-9]/, { message: 'password must include a number' })
  password!: string;
}
