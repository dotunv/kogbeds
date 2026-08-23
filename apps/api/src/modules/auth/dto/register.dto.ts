import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  email!: string;

  @IsString()
  @Matches(/^[a-z0-9_]{3,30}$/, {
    message: 'username must be 3-30 lowercase letters, numbers, or underscores',
  })
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
