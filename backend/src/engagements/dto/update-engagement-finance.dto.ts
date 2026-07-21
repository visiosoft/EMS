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
  grossMarketingBudget?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  netMarketingBudget?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  salesRevenueGoal?: number | null;

  /** dbo.EngagementFinances.TourSplitPoint — existing column */
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  tourSplitPoint?: number | null;

  /** dbo.EngagementFinances.AnnouncementDate — optional column */
  @IsOptional()
  @IsDateString()
  announcementDate?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  promoterProfit?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  venueDealType?:
    | 'Rental'
    | 'CoPro'
    | '3rd Party Renting Venue'
    | 'Silent CoPro with Venue'
    | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  thirdPartyPartnerDealStructure?:
    | 'CoPro with 3rd Party'
    | 'CoPro with 3rd Party, 3rd Party Renting Venue'
    | 'Silent CoPro with 3rd Party, 3rd Party Renting Venue'
    | null;

  /**
   * dbo.EngagementFinances.VenueDealTypeID — FK into dbo.VenueDealType.
   * Single merged "Venue Deal" dropdown (replaces the venueDealType /
   * thirdPartyPartnerDealStructure string pair on the Finance tab).
   */
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  venueDealTypeId?: number | null;

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
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  artistRoyaltyRatePercent?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  artistRoyaltyBasedOn?: string | null;

  @IsOptional()
  @IsString()
  artistBackEndTerms?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  artistVersusPercent?: number | null;

  /** dbo.ArtistFinance.OveragePercent — Overage (%) as decimal */
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  overagePercent?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  artistPromoterProfitPercent?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  artistBackendPercent?: number | null;

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

  // ── Booking tab — optional columns on dbo.EngagementFinances ───────────

  /** dbo.EngagementFinances.PromoterPartnerCompanyID (optional column) */
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  promoterPartnerCompanyId?: number | null;

  /** dbo.EngagementFinances.PromoterPartnerContactID (optional column) */
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  promoterPartnerContactId?: number | null;

  /** dbo.EngagementFinances.TourManagerContactID (optional column) */
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  tourManagerContactId?: number | null;

  /** dbo.EngagementFinances.AttractionContractSharePointLink (optional column) */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  attractionContractSharePointLink?: string | null;

  /** dbo.EngagementFinances.PartiallyExecutedAttractionContractSharePointLink (optional column) */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  partiallyExecutedAttractionContractSharePointLink?: string | null;

  /** dbo.EngagementFinances.FullyExecutedAttractionContractSharePointLink (optional column) */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  fullyExecutedAttractionContractSharePointLink?: string | null;

  // ── Event Business tab — optional columns on dbo.EngagementFinances ──────

  /** dbo.EngagementFinances.EventBusinessManagerContactID */
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  eventBusinessManagerContactId?: number | null;

  /** dbo.EngagementFinances.EventBusinessAssistantManagerContactID */
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  eventBusinessAssistantManagerContactId?: number | null;

  /** dbo.EngagementFinances.VenueSettlementContactID */
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  venueSettlementContactId?: number | null;

  /** dbo.EngagementFinances.VenueSettlementFileSharePointLink */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  venueSettlementFileSharePointLink?: string | null;

  /** dbo.EngagementFinances.PartnerSettlementFileSharePointLink */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  partnerSettlementFileSharePointLink?: string | null;

  /** dbo.EngagementFinances.SalesTaxRemittedBy */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  salesTaxRemittedBy?: string | null;

  /** dbo.EngagementFinances.FexVenueAgreementLink */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  fexVenueAgreementLink?: string | null;

  /** dbo.EngagementFinances.VenueDepositRequired */
  @IsOptional()
  @IsBoolean()
  venueDepositRequired?: boolean | null;

  /** dbo.EngagementFinances.WithholdingPayee */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  withholdingPayee?: string | null;

  /** dbo.EngagementFinances.WithholdingPaymentMethod */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  withholdingPaymentMethod?: string | null;

  /** dbo.EngagementFinances.WithholdingFormToAttractionLink */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  withholdingFormToAttractionLink?: string | null;

  /** dbo.EngagementFinances.WithholdingFormToMunicipalityLink */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  withholdingFormToMunicipalityLink?: string | null;

  /** dbo.EngagementFinances.WithholdingQuickbooksNumber */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  withholdingQuickbooksNumber?: string | null;

  /** dbo.EngagementFinances.WithholdingWaiver (Yes/No) */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  withholdingWaiver?: string | null;

  /** dbo.EngagementFinances.WithholdingCompletedWaiverLink */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  withholdingCompletedWaiverLink?: string | null;

  /** dbo.EngagementFinances.TourWaiverLink */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  tourWaiverLink?: string | null;

  /** dbo.EngagementFinances.WithholdingExceptions */
  @IsOptional()
  @IsString()
  withholdingExceptions?: string | null;

  /** dbo.EngagementFinances.CompensationRoyaltyAmount */
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  compensationRoyaltyAmount?: number | null;

  /** dbo.EngagementFinances.CompensationOverageAmount */
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  compensationOverageAmount?: number | null;

  /** dbo.EngagementFinances.CompensationBuyouts */
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  compensationBuyouts?: number | null;

  /** dbo.EngagementFinances.CompensationDirectCharges */
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  compensationDirectCharges?: number | null;

  /** dbo.EngagementFinances.CompensationReimbursibles */
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  compensationReimbursibles?: number | null;

  /** dbo.EngagementFinances.FinanceJob */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  financeJob?: string | null;

  /** dbo.EngagementFinances.FinanceCustomer (optional column) */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  financeCustomer?: string | null;

  // ── Attraction Terms extras — serialized into ArtistBackEndTerms JSON ──

  /** Serialized into dbo.ArtistFinance.ArtistBackEndTerms JSON */
  @IsOptional()
  @IsBoolean()
  artistDepositRequired?: boolean | null;

  @IsOptional()
  @IsBoolean()
  artistPartOfCollateralizedDeal?: boolean | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  artistFexPerformanceAgreementLink?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  artistTourOfferLink?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  artistOverageAmount?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  artistBuyouts?: number | null;

  // ── Final Attraction Compensation — stored on dbo.SettlementFinance ──

  /** dbo.SettlementFinance.FinalGuaranteeAmount */
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  finalGuaranteeAmount?: number | null;

  /** dbo.SettlementFinance.FinalRoyaltyAmount */
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  finalRoyaltyAmount?: number | null;

  /** dbo.SettlementFinance.FinalOverageAmount */
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  finalOverageAmount?: number | null;

  /** dbo.SettlementFinance.FinalBuyoutAmount */
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  finalBuyoutAmount?: number | null;

  /** dbo.SettlementFinance.DirectCompanyCharges */
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  finalDirectCompanyCharges?: number | null;

  /** dbo.SettlementFinance.Reimbursables */
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  finalReimbursables?: number | null;
}
