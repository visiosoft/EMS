import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class AddPerformanceOptionDto {
  /** FK → dbo.EngagementProjectVenue — which venue proposal this date belongs to. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  engagementProjectVenueId: number;

  @IsISO8601()
  proposedDate: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  proposedTime?: string | null;

  @IsString()
  @MaxLength(50)
  optionStatus: string;
}
