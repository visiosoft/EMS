import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePerformanceOptionDto } from './create-project.dto';
import { PROJECT_STAGE_VALUES } from '../project-stage.constants';

export class AddProjectVenueDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  venueCompanyId: number;

  @IsString()
  @MaxLength(50)
  venueStatus: string;

  @IsOptional()
  @IsString()
  @IsIn([...PROJECT_STAGE_VALUES])
  offerCreationStatus?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePerformanceOptionDto)
  performanceOptions?: CreatePerformanceOptionDto[];

  // Frontend-only
  @IsOptional() configName?: string | null;
  @IsOptional() dealType?: string | null;
  @IsOptional() guarantee?: number | null;
  @IsOptional() splitPct?: number | null;
  @IsOptional() breakeven?: number | null;
  @IsOptional() marketingCoOp?: number | null;
}
