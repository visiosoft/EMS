import {
  IsArray,
  IsInt,
  IsOptional,
  IsISO8601,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  createdBy?: string | null;

  @IsOptional()
  @IsISO8601()
  tourStartDate?: string;

  @IsOptional()
  @IsISO8601()
  tourEndDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tourId?: number;

  /** Accepted for API parity; tour agency is stored on dbo.Tour.TalentAgencyCompanyID (not on project row). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  talentAgencyCompanyId?: number;

  // Frontend-only fields — accepted and silently ignored (Option A per §5.8)
  @IsOptional() name?: string | null;
  @IsOptional() bookerId?: string | null;
  @IsOptional() agentContactId?: string | null;
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  dmaIds?: number[];

  @IsOptional() targetOnSale?: string | null;
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  notes?: string | null;
}
