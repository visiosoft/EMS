import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const OFFER_CODE_ASSIGNED_TO_VALUES = [
  'IAE - Sign Up',
  'IAE - Full List',
] as const;

export const OFFER_CODE_IAESMS_VALUES = [
  'Venue - Members',
  'Venue - Full List',
  'Artist',
  'Bookstore',
  'Media Partner',
  'Open',
] as const;

export const OFFER_CODE_PURPOSE_VALUES = [
  'Presale',
  'Presale Discount',
  'Discount',
] as const;

export class TourTicketingOfferCodeDto {
  @IsOptional()
  @IsInt()
  offerCodeId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code: string;

  @IsOptional()
  @IsString()
  @IsIn(OFFER_CODE_ASSIGNED_TO_VALUES)
  assignedTo?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(OFFER_CODE_IAESMS_VALUES)
  iaeSms?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(OFFER_CODE_PURPOSE_VALUES)
  purpose?: string | null;
}

export class SaveTourMarketingDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  audienceGender?: string | null;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  audienceAgeRangeIds?: number[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaMixInputDto)
  mediaMix?: MediaMixInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TourTicketingOfferCodeDto)
  offerCodes?: TourTicketingOfferCodeDto[];
}

export class MediaMixInputDto {
  @IsInt()
  @Min(1)
  advertisingSubTypeId: number;

  @IsOptional()
  @IsInt()
  companyId?: number | null;
}
