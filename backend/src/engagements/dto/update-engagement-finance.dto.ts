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

/**
 * Partial update: most fields map to dbo.EngagementFinances.
 * `sellableCapacity` and `grossPotential` map to dbo.Engagement (same as engagement PATCH).
 */
export class UpdateEngagementFinanceDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  estimatedBreakeven?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(0)
  sellableCapacity?: number | null;

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
  @MaxLength(100)
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

  @IsOptional()
  @IsString()
  @MaxLength(100)
  artistDealType?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  artistGuarantee?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  artistMiddleMoney?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  artistRoyaltyVariableFee?: string | null;

  @IsOptional()
  @IsString()
  artistBackEndTerms?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  finalAcceptedOfferLink?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  settlementFileSharePointLink?: string | null;

  // ── dbo.SettlementFinance (via EngagementFinances.SettlementFinanceID) ──

  @IsOptional()
  @IsString()
  @MaxLength(50)
  artistSettlementStatus?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  venueSettlementStatus?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  subscriptionSalesRevenueTotal?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  seasonTicketSalesByIae?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  seasonTicketFundsTransferred?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  netBoxOfficeFundsDepositedAccount?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  hstCollectedFromTicketSales?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  hstPaidOnTourPayments?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  hstPaidOnShowExpenses?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  hstPaidOnVenueExpenses?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  artistGrossTaxableCompensation?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  amountDueToDeptOfRevenue?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  checkNumberOrConfOfWithholdingPayment?: string | null;
}
