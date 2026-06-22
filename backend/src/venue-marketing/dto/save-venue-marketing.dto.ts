import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VenueStyleGuideDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  font?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  primaryColors?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  accentColors?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  logoUrl?: string | null;
}

export class SpecLocalizationDto {
  @IsInt()
  @Min(1)
  localizationOptionId: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customValue?: string | null;
}

export class SpecTagDto {
  @IsInt()
  @Min(1)
  tagOptionId: number;
}

export class SpecFileSpecDto {
  @IsInt()
  @Min(1)
  fileSpecOptionId: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customValue?: string | null;
}

export class VenueMarketingSpecRowDto {
  @IsOptional()
  @IsInt()
  venueMarketingSpecsId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  placementCategoryId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  graphicSizeHorizontal?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  graphicSizeVertical?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  fileFormatOptionId?: number | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecLocalizationDto)
  localizations?: SpecLocalizationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecTagDto)
  tags?: SpecTagDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecFileSpecDto)
  fileSpecs?: SpecFileSpecDto[];
}

export class SaveVenueMarketingDto {
  @IsBoolean()
  styleGuideEnabled: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => VenueStyleGuideDto)
  styleGuide?: VenueStyleGuideDto | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VenueMarketingSpecRowDto)
  specs: VenueMarketingSpecRowDto[];
}
