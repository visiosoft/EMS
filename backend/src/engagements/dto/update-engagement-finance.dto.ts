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

function toOptionalBool(v: unknown): boolean | null | undefined {
  if (v === null) return null;
  if (v === undefined) return undefined;
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === 1 || v === '1') return true;
  if (v === 'false' || v === 0 || v === '0') return false;
  return undefined;
}

/** Partial update for dbo.EngagementFinances */
export class UpdateEngagementFinanceDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  estimatedBreakeven?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  grossPotential?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  promoterProfit?: number | null;

  @IsOptional()
  @IsString()
  venueTerms?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalBool(value))
  @IsBoolean()
  confirmationPacketApproved?: boolean | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  iaeWaiverApplicationConfirmationNumber?: string | null;

  @IsOptional()
  @IsDateString()
  iaeWaiverApplicationSubmissionDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  iaeApplicationWaiverStatus?: string | null;

  @IsOptional()
  @IsDateString()
  dateFundsReceived?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  fundsDue?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  fundsWithheld?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  fundsOwed?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  receivableBankAccount?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  requiredNonResidentWithholdingId?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  artistFinanceId?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  settlementFinanceId?: number | null;
}
