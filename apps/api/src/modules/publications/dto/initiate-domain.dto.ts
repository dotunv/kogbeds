import { IsString, Matches, MaxLength } from 'class-validator';

export class InitiateDomainDto {
  @IsString()
  @MaxLength(253)
  @Matches(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i,
    { message: 'domain must be a valid hostname' },
  )
  domain!: string;
}
