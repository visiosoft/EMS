import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

function toOptionalNumber(v: unknown): number | null | undefined {
  if (v === null || v === '') return null;
  if (v === undefined) return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toOptionalInt(v: unknown): number | null | undefined {
  if (v === null || v === '') return null;
  if (v === undefined) return undefined;
  if (typeof v === 'number' && Number.isInteger(v)) return v;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

export class UpdatePerformanceTicketingDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ticketingStatus?: string | null;

  @IsOptional()
  @IsDateString()
  onSaleDate?: string | null;

  @IsOptional()
  @IsDateString()
  preSaleDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  vipPackagedOffer?: string | null;

  @IsOptional()
  @IsString()
  preSaleSpecialPrices?: string | null;

  @IsOptional()
  @IsString()
  kidsTicketsPrices?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  ticketingLinkId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  ticketingLinkUrl?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  grossTicketSales?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  totalComps?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  totalTickets?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  totalAdmissions?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  sellableCapacity?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  grossPotentialRevenue?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  ticketingSystemCompanyId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  ticketingAdministrator?: string | null;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === 1 || value === '1') return true;
    if (value === 'false' || value === 0 || value === '0') return false;
    return undefined;
  })
  @IsBoolean()
  boxOfficeLaborStaffingRequired?: boolean | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  facilityFeeType?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  facilityFeeAmount?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  dynamicPricingMode?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  serviceChargeRevenueShare?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  rebateAmount?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  bumpAmount?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  creditCardFeesType?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  creditCardFeesAmountPercent?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  salesTaxType?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  salesTaxAmountPercent?: number | null;
}
