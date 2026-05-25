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

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  companyName: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  companyTypeId?: number;

  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @IsOptional()
  companyTypeIds?: number[];

  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @IsOptional()
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

  /** When omitted, server resolves DMA from physical postal code (required in DB). */
  @IsOptional()
  @IsInt()
  @Min(1)
  dmaId?: number;

  @ValidateNested()
  @Type(() => AddressFieldsDto)
  physical: AddressFieldsDto;

  @IsOptional()
  mailingSameAsPhysical?: boolean;

  @ValidateNested()
  @Type(() => AddressFieldsDto)
  @IsOptional()
  mailing?: AddressFieldsDto;
}
