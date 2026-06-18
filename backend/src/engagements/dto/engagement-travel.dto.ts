import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const BOOKED_BY_VALUES = ['IAE', 'Venue', 'Talent Agency', 'Tour Management'] as const;

function toOptionalInt(v: unknown): number | null | undefined {
  if (v === null || v === '') return null;
  if (v === undefined) return undefined;
  if (typeof v === 'number' && Number.isInteger(v)) return v;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

class AddressDto {
  @IsString()
  @MaxLength(200)
  addressLine1: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string | null;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsString()
  @MaxLength(100)
  stateProvince: string;

  @IsString()
  @MaxLength(20)
  postalCode: string;

  @IsString()
  @MaxLength(100)
  country: string;
}

/** Create a Hotel travel record for an engagement. */
export class CreateEngagementTravelHotelDto {
  @IsString()
  @IsIn(BOOKED_BY_VALUES)
  @IsOptional()
  bookedBy?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  hotelCompanyId?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  numberOfRooms?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  roomTypes?: string | null;

  @IsOptional()
  @IsDateString()
  checkInDate?: string | null;

  @IsOptional()
  @IsDateString()
  checkOutDate?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  occupantContactId?: number | null;
}

/** Update an existing Hotel travel record. */
export class UpdateEngagementTravelHotelDto extends CreateEngagementTravelHotelDto {}

/** Create a Car Service travel record for an engagement. */
export class CreateEngagementTravelCarServiceDto {
  @IsOptional()
  @IsString()
  @IsIn(BOOKED_BY_VALUES)
  bookedBy?: string | null;

  /** Supply an existing AddressID OR a new address object (server creates it). */
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  originAddressId?: number | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  originAddress?: AddressDto | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  destinationAddressId?: number | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  destinationAddress?: AddressDto | null;

  /** ISO datetime string e.g. "2025-03-15T14:30:00" */
  @IsOptional()
  @IsString()
  pickupDateTime?: string | null;
}

/** Update an existing Car Service travel record. */
export class UpdateEngagementTravelCarServiceDto extends CreateEngagementTravelCarServiceDto {}
