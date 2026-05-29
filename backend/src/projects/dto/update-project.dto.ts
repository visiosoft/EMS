import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsISO8601,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PROJECT_STAGE_VALUES } from '../project-stage.constants';
import { ProjectOpeningPerformanceDto } from './create-project.dto';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @IsIn([...PROJECT_STAGE_VALUES])
  projectStage?: string;

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

  /**
   * Actual opening/show rows to create when ProjectStage = Confirmed.
   * Accepted on update because conversion can be triggered from the project drawer.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectOpeningPerformanceDto)
  openingPerformances?: ProjectOpeningPerformanceDto[];

  @IsOptional() targetOnSale?: string | null;
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  notes?: string | null;
}
