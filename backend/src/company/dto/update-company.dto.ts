import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AddressFieldsDto } from './address-fields.dto';
import { CompanyServiceAreaDto } from './company-service-area.dto';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  companyName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  companyTypeId?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  companyTypeIds?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  serviceProvidedIds?: number[];

  /** Service Areas: dbo.CompanyServiceArea (CompanyID, DMAID, ServiceProvidedID) */
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CompanyServiceAreaDto)
  serviceAreas?: CompanyServiceAreaDto[];

  /** Nationwide company: store against "All DMAs" DMA row (if present). */
  @IsOptional()
  allDmas?: boolean;

  /** Required when allDmas=true. */
  @IsOptional()
  @IsInt()
  @Min(1)
  allDmasServiceProvidedId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  dmaId?: number;

  @ValidateNested()
  @Type(() => AddressFieldsDto)
  @IsOptional()
  physical?: AddressFieldsDto;

  @ValidateNested()
  @Type(() => AddressFieldsDto)
  @IsOptional()
  mailing?: AddressFieldsDto;

  @IsOptional()
  mailingSameAsPhysical?: boolean;
}
