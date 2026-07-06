import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PROJECT_STAGE_VALUES,
  OFFER_REVIEW_STATUS_VALUES,
} from '../project-stage.constants';

/** Documented parity with `dbo.EngagementProjectVenue.VenueStatus` product allowlist. */
export const VENUE_STATUS_VALUES = [
  'Confirmed',
  'Pending',
  'Inactive',
] as const;

/** Documented parity with `dbo.EngagementProjectPerformanceOption.OptionStatus` product allowlist. */
export const OPTION_STATUS_VALUES = [
  'Confirmed',
  'Pending',
  'Inactive',
] as const;

export class CreatePerformanceOptionDto {
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

export class ProjectOpeningPerformanceDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  performanceDate: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  performanceTime: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  performanceStatus?: string | null;
}

export class CreateProjectVenueDto {
  @IsInt()
  @Min(1)
  venueCompanyId: number;

  @IsString()
  @MaxLength(50)
  venueStatus: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePerformanceOptionDto)
  performanceOptions?: CreatePerformanceOptionDto[];

  // Frontend-only fields — accepted and silently ignored (Option A per §5.8)
  @IsOptional() configName?: string | null;
  @IsOptional() dealType?: string | null;
  @IsOptional() guarantee?: number | null;
  @IsOptional() splitPct?: number | null;
  @IsOptional() breakeven?: number | null;
  @IsOptional() marketingCoOp?: number | null;
}

export class CreateProjectDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tourId: number;

  @IsString()
  @IsIn([...PROJECT_STAGE_VALUES])
  projectStage: string;

  /**
   * OfferReviewStatus — only applicable once OfferCreationStatus = 'Submitted'.
   * When set to 'Confirmed', the project is converted into an engagement.
   */
  @IsOptional()
  @IsString()
  @IsIn([...OFFER_REVIEW_STATUS_VALUES])
  offerReviewStatus?: string | null;

  /**
   * Talent agency for this project — must match the tour when the tour already has
   * `TalentAgencyCompanyID` set. On create, persisted to `dbo.Tour.TalentAgencyCompanyID`.
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  talentAgencyCompanyId: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  createdBy?: string | null;

  @IsISO8601()
  tourStartDate: string;

  @IsISO8601()
  tourEndDate: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectVenueDto)
  venues?: CreateProjectVenueDto[];

  /** Selected markets — persisted in dbo.EngagementProjectDMA (at least one required). */
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  dmaIds: number[];

  /**
   * Actual opening/show rows to create when the offer is Confirmed
   * (OfferReviewStatus = 'Confirmed'). These become dbo.Performance rows for
   * the generated engagement.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectOpeningPerformanceDto)
  openingPerformances?: ProjectOpeningPerformanceDto[];

  // Frontend-only fields — accepted and silently ignored (Option A per §5.8)
  @IsOptional() name?: string | null;
  @IsOptional() bookerId?: string | null;
  @IsOptional() agentContactId?: string | null;
  @IsOptional() targetOnSale?: string | null;
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  notes?: string | null;
}
