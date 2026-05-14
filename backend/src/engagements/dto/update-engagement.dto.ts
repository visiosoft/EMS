import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ENGAGEMENT_STATUS_VALUES } from './create-engagement.dto';

export class UpdateEngagementDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @IsIn(ENGAGEMENT_STATUS_VALUES as unknown as string[])
  engagementStatus?: string;

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
    { message: 'grossPotential must be a valid number with up to 2 decimal places.' },
  )
  @Min(0)
  grossPotential?: number | null;
}
