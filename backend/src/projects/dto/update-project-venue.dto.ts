import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  PROJECT_STAGE_VALUES,
  OFFER_REVIEW_STATUS_VALUES,
} from '../project-stage.constants';

export class UpdateProjectVenueDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  venueStatus?: string;

  @IsOptional()
  @IsString()
  @IsIn([...PROJECT_STAGE_VALUES])
  offerCreationStatus?: string;

  @IsOptional()
  @IsString()
  @IsIn([...OFFER_REVIEW_STATUS_VALUES])
  offerReviewStatus?: string | null;

  // Frontend-only
  @IsOptional() configName?: string | null;
  @IsOptional() dealType?: string | null;
  @IsOptional() guarantee?: number | null;
  @IsOptional() splitPct?: number | null;
  @IsOptional() breakeven?: number | null;
  @IsOptional() marketingCoOp?: number | null;
  @IsOptional() engagementId?: number;
}
