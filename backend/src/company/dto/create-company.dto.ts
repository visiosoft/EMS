import { Type } from 'class-transformer';
import {
  ArrayMinSize,
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

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  companyName: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  companyTypeId?: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  companyTypeIds: number[];

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
