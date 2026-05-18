import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ENGAGEMENT_STATUS_VALUES } from './create-engagement.dto';

export class UpdateEngagementDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @IsIn(ENGAGEMENT_STATUS_VALUES as unknown as string[])
  engagementStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  engagementScaling?: string | null;

  /** dbo.Engagement.TourID — optional on update */
  @IsOptional()
  @IsInt()
  @Min(1)
  tourId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  primaryVenueCompanyId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sellableCapacity?: number | null;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'grossPotential must be a valid number with up to 2 decimal places.',
    },
  )
  @Min(0)
  grossPotential?: number | null;

  /** dbo.EngagementProduction.RehearsalDate (yyyy-MM-dd or null to clear) */
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsDateString()
  rehearsalDate?: string | null;

  /** dbo.EngagementProduction.LoadInDate */
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsDateString()
  loadInDate?: string | null;
}
