import { IsNotEmpty, IsOptional, IsString, Matches, ValidateIf } from 'class-validator';

export class CreateEngagementRehearsalDto {
  /** ISO date `YYYY-MM-DD` */
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  rehearsalDate: string;

  /** `HH:mm` or `HH:mm:ss` (24h) */
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  rehearsalTime?: string | null;
}

export class UpdateEngagementRehearsalDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  rehearsalDate?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  rehearsalTime?: string | null;
}
