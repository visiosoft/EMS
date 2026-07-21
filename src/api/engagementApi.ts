/**
 * Engagement Module API
 *
 * dbo.Engagement columns: EngagementID, EngagementStatus, TourID (NOT NULL).
 * Sellable capacity and gross potential are on dbo.EngagementFinances (joined for list/detail).
 * Opening show is the earliest dbo.Performance (see openingPerformanceDate/Time).
 * AttractionID was REMOVED from dbo.Engagement.
 * AttractionID is on dbo.Tour — reach via: Engagement.TourID → Tour.AttractionID → Attraction
 *
 * dbo.EngagementVenue: EngagementID, VenueCompanyID, IsPrimary
 */
import { apiFetch, apiFetchMultipart } from './config';

export interface ApiEngagementListRow {
  engagementId: number;
  engagementStatus: string;
  engagementScaling: string | null;
  sellableCapacity: number | null;
  grossPotential: number | null;
  /** Earliest dbo.Performance (opening show), if any */
  openingPerformanceDate: string | null;
  openingPerformanceTime: string | null;
  tourId: number;
  tourName: string;
  /** Derived via Tour.AttractionID — may be null if tour has no attraction */
  attractionId: number | null;
  attractionName: string | null;
  primaryVenueCompanyId: number | null;
  venueCompanyName: string | null;
  venueName: string | null;
  city: string | null;
  stateProvince: string | null;
  dmaMarketName: string | null;
  /** Tour banner image URL from dbo.Link (Tour.BannerLinkID) */
  tourBannerImageUrl: string | null;
  /** Entertainment complex company names for primary venue (comma-separated) */
  entertainmentComplexNames: string | null;
  /** dbo.EngagementProduction (latest row by ProductionID) */
  rehearsalDate: string | null;
  rehearsalTime: string | null;
  loadInDate: string | null;
  loadInTime: string | null;
  tourManagerContactId: number | null;
  displayTitle: string;
  appCreated: boolean;
  isCanadaEngagement: boolean | null;
}

export interface ApiEngagementVenueRow {
  engagementId: number;
  venueCompanyId: number;
  venueCompanyName: string | null;
  venueName: string | null;
  city: string | null;
  stateProvince: string | null;
  dmaMarketName: string | null;
  isPrimary: boolean;
  /** dbo.EngagementVenue.VenueBookingManagerContactID */
  venueBookingManagerContactId: number | null;
  venueBookingManagerName: string | null;
  /** dbo.Venue */
  venueTypeId: number | null;
  venueTypeName: string | null;
  stageDimensions: string | null;
  flySystemSpecs: string | null;
  stageType: string | null;
  seatingChartLinkId: number | null;
  seatingChartLinkUrl: string | null;
  /** dbo.Venue.SeatingChartUrl (optional column) — editable seating chart image/link */
  seatingChartUrl: string | null;
  ticketingSystem: string | null;
  /** dbo.PerformanceTicketing (opening performance) */
  ticketingAdminContactId: number | null;
  ticketingAdminContactName: string | null;
  /** Optional DB columns — null when column does not yet exist */
  techPackPdfUrl: string | null;
  attractionTechDirectorContactId: number | null;
  attractionTechDirectorName: string | null;
  venueContractSharePointLink: string | null;
  partiallyExecutedContractSharePointLink: string | null;
  fullyExecutedContractSharePointLink: string | null;
  venueForecastSharePointLink: string | null;
  /** Venue marketing team (optional columns) */
  venueMarketingDirectorContactId: number | null;
  venueMarketingDirectorName: string | null;
  venueMarketingManagerContactId: number | null;
  venueMarketingManagerName: string | null;
  venueDigitalMarketingManagerContactId: number | null;
  venueDigitalMarketingManagerName: string | null;
  /** IAE Production Manager (optional column) */
  iaeProductionManagerContactId: number | null;
  iaeProductionManagerContactName: string | null;
  /** Venue Production Manager (optional column) */
  venueProductionManagerContactId: number | null;
  venueProductionManagerContactName: string | null;
  /** Stagehand / Stage Labor Contact (optional column) */
  stagehandContactId: number | null;
  stagehandContactName: string | null;
}

export interface ApiEngagementVenueTabData {
  venues: ApiEngagementVenueRow[];
  /** From dbo.EngagementFinances.VenueDealTypeID */
  venueDealTypeId: number | null;
  /** From dbo.EngagementFinances (legacy text) */
  venueDealType: string | null;
  venueTerms: string | null;
  /** From dbo.Tour.TechRiderLinkID → dbo.Link.LinkURL */
  techRiderLinkUrl: string | null;
  /** dbo.EngagementLink rows (contracts/forecast) */
  engagementLinks: ApiEngagementLinkRow[];
  /** Role-based contacts per venue for read-only display */
  venueRoleContacts: Record<number, ApiVenueRoleContacts>;
  /** IAE staff assigned with role 'Production Manager' */
  iaeProductionManagers: ApiRoleContactDisplay[];
}

export interface ApiEngagementLinkRow {
  engagementLinkId: number;
  linkId: number;
  linkPurpose: string | null;
  linkUrl: string;
  linkName: string;
}

export interface ApiVenueRoleContacts {
  venueTicketingSoftware: ApiRoleContactDisplay[];
  venueTicketingAdministrator: ApiRoleContactDisplay[];
  venueProductionManager: ApiRoleContactDisplay[];
  venueStageLaborCompany: ApiRoleContactDisplay[];
  attractionTechDirector: ApiRoleContactDisplay[];
  marketingDirector: ApiRoleContactDisplay[];
  marketingManager: ApiRoleContactDisplay[];
  digitalMarketingManager: ApiRoleContactDisplay[];
}

export interface ApiRoleContactDisplay {
  contactId: number;
  firstName: string;
  lastName: string;
  roleName: string;
}

export interface UpdateEngagementVenueTabPayload {
  venueBookingManagerContactId?: number | null;
  venueDealTypeId?: number | null;
  venueTypeId?: number | null;
  stageDimensions?: string | null;
  flySystemSpecs?: string | null;
  stageType?: string | null;
  techPackPdfUrl?: string | null;
  techRiderLinkUrl?: string | null;
  attractionTechDirectorContactId?: number | null;
  venueContractSharePointLink?: string | null;
  partiallyExecutedContractSharePointLink?: string | null;
  fullyExecutedContractSharePointLink?: string | null;
  venueForecastSharePointLink?: string | null;
  venueMarketingDirectorContactId?: number | null;
  venueMarketingManagerContactId?: number | null;
  venueDigitalMarketingManagerContactId?: number | null;
  iaeProductionManagerContactId?: number | null;
  venueProductionManagerContactId?: number | null;
  stagehandContactId?: number | null;
  /** dbo.Venue.TicketingSystem */
  ticketingSystem?: string | null;
  /** dbo.EngagementVenue.TicketingAdminContactID (optional column) */
  ticketingAdminContactId?: number | null;
  /** dbo.Venue.SeatingChartUrl (optional column) */
  seatingChartUrl?: string | null;
}

export interface ApiEngagementServiceProviderRow {
  providerCompanyId: number;
  providerCompanyName: string | null;
  serviceProvidedIds: number[];
  serviceProvidedNames: string[];
}

export type ApiEngagementServiceProvidersResponse = {
  venueCompanyId: number;
  providers: ApiEngagementServiceProviderRow[];
};

export interface CreateEngagementPayload {
  engagementStatus: string;
  /** ISO date YYYY-MM-DD — stored as dbo.Performance.PerformanceDate */
  openingShowDate: string;
  /** HH:mm or HH:mm:ss — stored as dbo.Performance.PerformanceTime */
  openingShowTime: string;
  /** TourID — NOT NULL in DB. Required. Attraction is derived from the tour. */
  tourId: number;
  /** Creates EngagementVenue(IsPrimary=1) */
  primaryVenueCompanyId: number;
  secondaryVenueCompanyIds?: number[];
  // Frontend-only
  bookerId?: string | null;
  showDate?: string | null;
  dealType?: string | null;
  guarantee?: number | null;
}

/** Only persisted fields — capacity/potential stored on EngagementFinances */
export interface UpdateEngagementPayload {
  engagementStatus?: string;
  engagementScaling?: string | null;
  tourId?: number;
  primaryVenueCompanyId?: number;
  sellableCapacity?: number | null;
  grossPotential?: number | null;
  tourManagerContactId?: number | null;
  rehearsalDate?: string | null;
  rehearsalTime?: string | null;
  loadInDate?: string | null;
  loadInTime?: string | null;
}

/** dbo.EngagementFinances — one row per engagement (GET returns nulls for missing row / empty fields) */
export interface ApiEngagementFinanceRow {
  financeId: number | null;
  engagementId: number;
  payableEntityCompanyId: number | null;
  payableEntityCompanyName: string | null;
  estimatedBreakeven: number | null;
  grossPotential: number | null;
  sellableCapacity: number | null;
  grossMarketingBudget: number | null;
  netMarketingBudget: number | null;
  salesRevenueGoal: number | null;
  promoterProfit: number | null;
  venueDealType:
    | 'Rental'
    | 'CoPro'
    | '3rd Party Renting Venue'
    | 'Silent CoPro with Venue'
    | null;
  thirdPartyPartnerDealStructure:
    | 'CoPro with 3rd Party'
    | 'CoPro with 3rd Party, 3rd Party Renting Venue'
    | 'Silent CoPro with 3rd Party, 3rd Party Renting Venue'
    | null;
  /** dbo.EngagementFinances.VenueDealTypeID — merged "Venue Deal" FK. */
  venueDealTypeId: number | null;
  /** dbo.VenueDealType.VenueDealTypeName for display. */
  venueDealTypeName: string | null;
  venueTerms: string | null;
  confirmationPacketApproved: boolean | null;
  iaeWaiverApplicationConfirmationNumber: string | null;
  iaeWaiverApplicationSubmissionDate: string | null;
  iaeApplicationWaiverStatus: string | null;
  dateFundsReceived: string | null;
  fundsDue: number | null;
  fundsWithheld: number | null;
  fundsOwed: number | null;
  receivableBankAccount: string | null;
  requiredNonResidentWithholdingId: number | null;
  isCanadaEngagement: boolean | null;
  artistFinanceId: number | null;
  settlementFinanceId: number | null;
  /** dbo.SettlementFinance via SettlementFinanceID */
  artistSettlementStatus: string | null;
  venueSettlementStatus: string | null;
  subscriptionSalesRevenueTotal: number | null;
  seasonTicketSalesByIae: number | null;
  seasonTicketFundsTransferred: number | null;
  netBoxOfficeFundsDepositedAccount: string | null;
  hstCollectedFromTicketSales: number | null;
  hstPaidOnTourPayments: number | null;
  hstPaidOnShowExpenses: number | null;
  hstPaidOnVenueExpenses: number | null;
  artistGrossTaxableCompensation: number | null;
  amountDueToDeptOfRevenue: number | null;
  checkNumberOrConfOfWithholdingPayment: string | null;
  /** dbo.ArtistFinance via ArtistFinanceID */
  artistDealType: string | null;
  artistGuarantee: number | null;
  artistMiddleMoney: number | null;
  artistRoyaltyVariableFee: string | null;
  artistBackEndTerms: string | null;
  artistVersusPercent: number | null;
  /** dbo.ArtistFinance.OveragePercent */
  overagePercent: number | null;
  artistPromoterProfitPercent: number | null;
  artistBackendPercent: number | null;
  artistRoyaltyRatePercent: number | null;
  artistRoyaltyBasedOn: string | null;
  /** dbo.EngagementFinances (optional columns) */
  finalAcceptedOfferLink: string | null;
  settlementFileSharePointLink: string | null;
  /** dbo.EngagementFinances.TourSplitPoint (existing column) */
  tourSplitPoint: number | null;
  /** dbo.EngagementFinances.AnnouncementDate (optional column) */
  announcementDate: string | null;
  /** dbo.EngagementFinances Booking optional columns */
  promoterPartnerCompanyId: number | null;
  promoterPartnerCompanyName: string | null;
  promoterPartnerContactId: number | null;
  promoterPartnerContactName: string | null;
  tourManagerContactId: number | null;
  tourManagerContactName: string | null;
  attractionContractSharePointLink: string | null;
  partiallyExecutedAttractionContractSharePointLink: string | null;
  fullyExecutedAttractionContractSharePointLink: string | null;
  /** dbo.EngagementFinances Event Business optional columns */
  eventBusinessManagerContactId: number | null;
  eventBusinessManagerContactName: string | null;
  eventBusinessAssistantManagerContactId: number | null;
  eventBusinessAssistantManagerContactName: string | null;
  venueSettlementContactId: number | null;
  venueSettlementContactName: string | null;
  venueSettlementFileSharePointLink: string | null;
  partnerSettlementFileSharePointLink: string | null;
  salesTaxRemittedBy: string | null;
  fexVenueAgreementLink: string | null;
  venueDepositRequired: boolean | null;
  withholdingPayee: string | null;
  withholdingPaymentMethod: string | null;
  withholdingFormToAttractionLink: string | null;
  withholdingFormToMunicipalityLink: string | null;
  withholdingQuickbooksNumber: string | null;
  withholdingWaiver: string | null;
  withholdingCompletedWaiverLink: string | null;
  tourWaiverLink: string | null;
  withholdingExceptions: string | null;
  compensationRoyaltyAmount: number | null;
  compensationOverageAmount: number | null;
  compensationBuyouts: number | null;
  compensationDirectCharges: number | null;
  compensationReimbursibles: number | null;
  financeJob: string | null;
  financeCustomer: string | null;
  /** dbo.Tour licensing flags (read-only from Tour record) */
  tourAscap: boolean | null;
  tourBmi: boolean | null;
  tourSesac: boolean | null;
  tourGmr: boolean | null;
  /** Serialized into dbo.ArtistFinance.ArtistBackEndTerms JSON */
  artistDepositRequired: boolean | null;
  artistPartOfCollateralizedDeal: boolean | null;
  artistFexPerformanceAgreementLink: string | null;
  artistTourOfferLink: string | null;
  artistOverageAmount: number | null;
  artistBuyouts: number | null;
  /** dbo.SettlementFinance — Final Attraction Compensation */
  finalGuaranteeAmount: number | null;
  finalRoyaltyAmount: number | null;
  finalOverageAmount: number | null;
  finalBuyoutAmount: number | null;
  finalDirectCompanyCharges: number | null;
  finalReimbursables: number | null;
}

export type UpdateEngagementFinancePayload = {
  estimatedBreakeven?: number | null;
  sellableCapacity?: number | null;
  grossPotential?: number | null;
  grossMarketingBudget?: number | null;
  netMarketingBudget?: number | null;
  salesRevenueGoal?: number | null;
  promoterProfit?: number | null;
  venueDealType?:
    | 'Rental'
    | 'CoPro'
    | '3rd Party Renting Venue'
    | 'Silent CoPro with Venue'
    | 'CoPro with 3rd Party'
    | 'CoPro with 3rd Party, 3rd Party Renting Venue'
    | 'Silent CoPro with 3rd Party, 3rd Party Renting Venue'
    | null;
  thirdPartyPartnerDealStructure?:
    | 'CoPro with 3rd Party'
    | 'CoPro with 3rd Party, 3rd Party Renting Venue'
    | 'Silent CoPro with 3rd Party, 3rd Party Renting Venue'
    | null;
  /** dbo.EngagementFinances.VenueDealTypeID — merged "Venue Deal" FK. */
  venueDealTypeId?: number | null;
  venueTerms?: string | null;
  confirmationPacketApproved?: boolean | null;
  iaeWaiverApplicationConfirmationNumber?: string | null;
  iaeWaiverApplicationSubmissionDate?: string | null;
  iaeApplicationWaiverStatus?: string | null;
  dateFundsReceived?: string | null;
  fundsDue?: number | null;
  fundsWithheld?: number | null;
  fundsOwed?: number | null;
  receivableBankAccount?: string | null;
  requiredNonResidentWithholdingId?: number | null;
  artistFinanceId?: number | null;
  settlementFinanceId?: number | null;
  artistSettlementStatus?: string | null;
  venueSettlementStatus?: string | null;
  subscriptionSalesRevenueTotal?: number | null;
  seasonTicketSalesByIae?: number | null;
  seasonTicketFundsTransferred?: number | null;
  netBoxOfficeFundsDepositedAccount?: string | null;
  hstCollectedFromTicketSales?: number | null;
  hstPaidOnTourPayments?: number | null;
  hstPaidOnShowExpenses?: number | null;
  hstPaidOnVenueExpenses?: number | null;
  artistGrossTaxableCompensation?: number | null;
  amountDueToDeptOfRevenue?: number | null;
  checkNumberOrConfOfWithholdingPayment?: string | null;
  artistDealType?: string | null;
  artistGuarantee?: number | null;
  artistMiddleMoney?: number | null;
  artistRoyaltyVariableFee?: string | null;
  artistBackEndTerms?: string | null;
  artistVersusPercent?: number | null;
  /** dbo.ArtistFinance.OveragePercent */
  overagePercent?: number | null;
  artistPromoterProfitPercent?: number | null;
  artistBackendPercent?: number | null;
  artistRoyaltyRatePercent?: number | null;
  artistRoyaltyBasedOn?: string | null;
  finalAcceptedOfferLink?: string | null;
  settlementFileSharePointLink?: string | null;
  /** dbo.EngagementFinances.TourSplitPoint */
  tourSplitPoint?: number | null;
  /** dbo.EngagementFinances.AnnouncementDate */
  announcementDate?: string | null;
  /** dbo.EngagementFinances Booking optional columns */
  promoterPartnerCompanyId?: number | null;
  promoterPartnerContactId?: number | null;
  tourManagerContactId?: number | null;
  attractionContractSharePointLink?: string | null;
  partiallyExecutedAttractionContractSharePointLink?: string | null;
  fullyExecutedAttractionContractSharePointLink?: string | null;
  /** dbo.EngagementFinances Event Business optional columns */
  eventBusinessManagerContactId?: number | null;
  eventBusinessAssistantManagerContactId?: number | null;
  venueSettlementContactId?: number | null;
  venueSettlementFileSharePointLink?: string | null;
  partnerSettlementFileSharePointLink?: string | null;
  salesTaxRemittedBy?: string | null;
  fexVenueAgreementLink?: string | null;
  venueDepositRequired?: boolean | null;
  withholdingPayee?: string | null;
  withholdingPaymentMethod?: string | null;
  withholdingFormToAttractionLink?: string | null;
  withholdingFormToMunicipalityLink?: string | null;
  withholdingQuickbooksNumber?: string | null;
  withholdingWaiver?: string | null;
  withholdingCompletedWaiverLink?: string | null;
  tourWaiverLink?: string | null;
  withholdingExceptions?: string | null;
  compensationRoyaltyAmount?: number | null;
  compensationOverageAmount?: number | null;
  compensationBuyouts?: number | null;
  compensationDirectCharges?: number | null;
  compensationReimbursibles?: number | null;
  financeJob?: string | null;
  financeCustomer?: string | null;
  /** Serialized into dbo.ArtistFinance.ArtistBackEndTerms JSON */
  artistDepositRequired?: boolean | null;
  artistPartOfCollateralizedDeal?: boolean | null;
  artistFexPerformanceAgreementLink?: string | null;
  artistTourOfferLink?: string | null;
  artistOverageAmount?: number | null;
  artistBuyouts?: number | null;
  /** dbo.SettlementFinance — Final Attraction Compensation */
  finalGuaranteeAmount?: number | null;
  finalRoyaltyAmount?: number | null;
  finalOverageAmount?: number | null;
  finalBuyoutAmount?: number | null;
  finalDirectCompanyCharges?: number | null;
  finalReimbursables?: number | null;
};

export interface ApiEngagementFinanceLookups {
  nonResidentWithholdings: {
    id: number;
    label: string;
    withholdingTaxRate?: string | null;
    withholdingArea?: string | null;
    areaCategory?: string | null;
    dmaid?: number | null;
    taxAgencyId?: number | null;
    withholdingAgencyName?: string | null;
    withholdingPayee?: string | null;
    paymentMethod?: string | null;
    formToAttractionUrl?: string | null;
    formToMunicipalityUrl?: string | null;
    quickBooksNumber?: string | null;
    canApplyForWaiver?: boolean | null;
    iaeWaiverInstructionsText?: string | null;
    completedWaiverUrl?: string | null;
    iaeWaiverSubmissionDate?: string | null;
    iaeWaiverAppNumber?: string | null;
    iaeWaiverUrl?: string | null;
    tourWaiverUrl?: string | null;
    exceptionsNotes?: string | null;
    withholdingLink?: ApiFinanceLink | null;
    artistWaiverInstructions?: ApiFinanceLink | null;
    iaeWaiverInstructions?: ApiFinanceLink | null;
  }[];
  artistFinances: { id: number; label: string }[];
  settlementFinances: { id: number; label: string }[];
  iaeApplicationWaiverStatuses: { value: string; label: string }[];
  /** dbo.VenueDealType — options for the merged "Venue Deal" dropdown. */
  venueDealTypes: { id: number; label: string }[];
}

export interface ApiFinanceLink {
  linkId: number;
  linkType: string;
  linkUrl: string;
  linkName: string;
  linkPath: string;
}

export const fetchEngagementFinanceLookups = () =>
  apiFetch<ApiEngagementFinanceLookups>('/engagements/finance-lookups');

export interface ApiPerformanceRow {
  performanceId: number;
  engagementId: number;
  performanceStatus: string;
  performanceDate: string;
  performanceTime: string;
}

export interface ApiPerformanceTicketingRow {
  ticketingId: number | null;
  performanceId: number;
  ticketingStatus: string | null;
  onSaleDate: string | null;
  preSaleDate: string | null;
  vipPackagedOffer: string | null;
  preSaleSpecialPrices: string | null;
  kidsTicketsPrices: string | null;
  ticketingLinkId: number | null;
  ticketingLinkUrl: string | null;
  grossTicketSales: number | null;
  totalComps: number | null;
  totalTickets: number | null;
  totalAdmissions: number | null;
  sellableCapacity: number | null;
  grossPotentialRevenue: number | null;
  ticketingSystemCompanyId: number | null;
  ticketingAdministrator: 'Venue' | 'Partner' | 'IAE Contract' | null;
  boxOfficeLaborStaffingRequired: boolean | null;
  facilityFeeType: 'Inside Face Value' | 'Outside Face Value' | null;
  facilityFeeAmount: number | null;
  dynamicPricingMode: 'Self Managed' | '3rd Party Managed' | null;
  rebateAmount: number | null;
  bumpAmount: number | null;
  creditCardFeesType: 'Inside Service Charge' | 'Budget Line Item' | null;
  creditCardFeesAmountPercent: number | null;
  salesTaxType: string | null;
  salesTaxAmountPercent: number | null;
  ticketingAdminContactId: number | null;
  ticketingAdminContactName: string | null;
  ticketingAdminCompanyId: number | null;
  ticketingAdminCompanyName: string | null;
  publicSaleLinkId: number | null;
  publicSaleLinkUrl: string | null;
  preSaleEndDate: string | null;
  preSaleRegistrationStartDate: string | null;
  preSaleRegistrationEndDate: string | null;
  isIAETMDeal: boolean | null;
  presalePassword: string | null;
  presalePasswordDateStart: string | null;
  presalePasswordDateEnd: string | null;
  presaleSpecialPricePassword: string | null;
  presaleSpecialPricePasswordDateStart: string | null;
  presaleSpecialPricePasswordDateEnd: string | null;
  presaleSpecialPriceDiscountType: string | null;
  presaleSpecialPriceDiscountAmount: number | null;
  publicSaleSpecialPricePassword: string | null;
  publicSaleSpecialPricePasswordDateStart: string | null;
  publicSaleSpecialPricePasswordDateEnd: string | null;
  publicSaleSpecialPriceDiscountType: string | null;
  publicSaleSpecialPriceDiscountAmount: number | null;
  vipPackageOffered: boolean | null;
  vipPackageName: string | null;
  vipPackageBenefits: string[] | null;
  compTicketForm: string | null;
  compTicketExcelSheet: string | null;
}

export interface ApiPerformanceTicketingSummaryRow {
  performanceId: number;
  performanceDate: string;
  performanceTime: string;
  performanceStatus: string;
  sellableCapacity: number | null;
  grossPotentialRevenue: number | null;
}

export interface ApiEngagementIaeTicketingManager {
  iaeTicketingManagerContactId: number | null;
  iaeTicketingManagerContactName: string | null;
}

export type UpdatePerformanceTicketingPayload = {
  ticketingStatus?: string | null;
  onSaleDate?: string | null;
  preSaleDate?: string | null;
  vipPackagedOffer?: string | null;
  preSaleSpecialPrices?: string | null;
  kidsTicketsPrices?: string | null;
  engagementScaling?: string | null;
  ticketingLinkId?: number | null;
  ticketingLinkUrl?: string | null;
  grossTicketSales?: number | null;
  totalComps?: number | null;
  totalTickets?: number | null;
  totalAdmissions?: number | null;
  sellableCapacity?: number | null;
  grossPotentialRevenue?: number | null;
  ticketingSystemCompanyId?: number | null;
  ticketingAdministrator?: 'Venue' | 'Partner' | 'IAE Contract' | null;
  boxOfficeLaborStaffingRequired?: boolean | null;
  facilityFeeType?: 'Inside Face Value' | 'Outside Face Value' | null;
  facilityFeeAmount?: number | null;
  dynamicPricingMode?: 'Self Managed' | '3rd Party Managed' | null;
  rebateAmount?: number | null;
  bumpAmount?: number | null;
  creditCardFeesType?: 'Inside Service Charge' | 'Budget Line Item' | null;
  creditCardFeesAmountPercent?: number | null;
  salesTaxType?: string | null;
  salesTaxAmountPercent?: number | null;
  ticketingAdminContactId?: number | null;
  ticketingAdminCompanyId?: number | null;
  publicSaleLinkUrl?: string | null;
  preSaleEndDate?: string | null;
  preSaleRegistrationStartDate?: string | null;
  preSaleRegistrationEndDate?: string | null;
  isIAETMDeal?: boolean | null;
  presalePassword?: string | null;
  presalePasswordDateStart?: string | null;
  presalePasswordDateEnd?: string | null;
  presaleSpecialPricePassword?: string | null;
  presaleSpecialPricePasswordDateStart?: string | null;
  presaleSpecialPricePasswordDateEnd?: string | null;
  presaleSpecialPriceDiscountType?: string | null;
  presaleSpecialPriceDiscountAmount?: number | null;
  publicSaleSpecialPricePassword?: string | null;
  publicSaleSpecialPricePasswordDateStart?: string | null;
  publicSaleSpecialPricePasswordDateEnd?: string | null;
  publicSaleSpecialPriceDiscountType?: string | null;
  publicSaleSpecialPriceDiscountAmount?: number | null;
  vipPackageOffered?: boolean | null;
  vipPackageName?: string | null;
  vipPackageBenefits?: string[] | null;
  compTicketForm?: string | null;
  compTicketExcelSheet?: string | null;
};

export type UpdateNonResidentWithholdingLinksPayload = {
  iaeWaiverInstructionsUrl?: string | null;
  artistWaiverInstructionsUrl?: string | null;
};

export interface ApiEngagementIaeContactRow {
  engagementIaeContactId: number;
  engagementId: number;
  contactId: number;
  contactLabel: string;
  roleId: number | null;
  roleName: string | null;
  departmentId: number | null;
  departmentName: string | null;
  isPrimary: boolean;
  notes: string | null;
  createdDate: string;
}

export interface ApiEngagementIaeContactLookups {
  contacts: { id: number; label: string }[];
  roles: { id: number; label: string }[];
  departments: { id: number; label: string }[];
  ticketingManagerContactIds: number[];
}

export type CreateEngagementIaeContactPayload = {
  contactId: number;
  roleId?: number | null;
  departmentId?: number | null;
  isPrimary?: boolean | null;
  notes?: string | null;
};

export type UpdateEngagementIaeContactPayload = {
  contactId?: number;
  roleId?: number | null;
  departmentId?: number | null;
  isPrimary?: boolean | null;
  notes?: string | null;
};

export interface CreatePerformancePayload {
  performanceDate: string;
  performanceTime: string;
  performanceStatus?: string;
}

/** Full list (legacy). Prefer {@link fetchEngagementsPaged} for the EMS list screen. */
export const fetchEngagements = () => apiFetch<ApiEngagementListRow[]>('/engagements');

/** Company Hub widgets — engagements the signed-in user is assigned to (IAE contact) in the date range. */
export function fetchHubEngagementSchedule(startDate: string, endDate: string) {
  const params = new URLSearchParams({ startDate, endDate });
  return apiFetch<ApiEngagementListRow[]>(`/engagements/hub-schedule?${params}`);
}

/** Company Hub — the signed-in user's assigned engagements still below their sales revenue goal. */
export interface ApiHubRedAlertRow {
  engagementId: number;
  attractionName: string | null;
  tourName: string | null;
  venueName: string | null;
  city: string | null;
  stateProvince: string | null;
  openingPerformanceDate: string | null;
  salesRevenueGoal: number;
  totalRevenue: number;
  /** 0–100, totalRevenue as a share of salesRevenueGoal. */
  pctToGoal: number;
}

export const fetchHubRedAlertEngagements = () =>
  apiFetch<ApiHubRedAlertRow[]>('/engagements/hub-red-alerts');

export interface ApiEngagementsPageResponse {
  data: ApiEngagementListRow[];
  total: number;
}

export interface ApiEngagementFilterOptions {
  attractionNames: string[];
  dmaMarketNames: string[];
  venueLabels: string[];
}

export type EngagementPagedQueryOpts = {
  q?: string;
  engagementId?: number;
  status?: string;
  attraction?: string;
  dma?: string;
  venue?: string;
  timing?: 'all' | 'upcoming' | 'past';
  /** Only engagements where the signed-in user is an IAE contact. */
  mine?: boolean;
  /** Server whitelist: attraction, tour, venue, market, date */
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  /** YYYY-MM-DD — include only engagements with at least one performance in [dateFrom, dateTo]. */
  dateFrom?: string;
  dateTo?: string;
};

export function engagementsPagedQueryKey(
  offset: number,
  limit: number,
  opts: EngagementPagedQueryOpts,
) {
  return [
    'engagements',
    'paged',
    offset,
    limit,
    opts.q ?? '',
    opts.engagementId ?? '',
    opts.status ?? 'All',
    opts.attraction ?? '',
    opts.dma ?? '',
    opts.venue ?? '',
    opts.timing ?? 'all',
    opts.mine ?? false,
    opts.sortBy ?? '',
    opts.sortDir ?? '',
    opts.dateFrom ?? '',
    opts.dateTo ?? '',
  ] as const;
}

/** Large prefetch for engagement search suggestions (local filter while typing). */
export const ENGAGEMENTS_SUGGESTION_CACHE_LIMIT = 5000;

export function engagementsSuggestionCacheQueryKey(opts: Omit<EngagementPagedQueryOpts, 'q'>) {
  return [
    'engagements',
    'suggestion-cache',
    opts.status ?? 'All',
    opts.attraction ?? '',
    opts.dma ?? '',
    opts.venue ?? '',
    opts.timing ?? 'all',
    opts.mine ?? false,
    opts.sortBy ?? '',
    opts.sortDir ?? '',
    opts.dateFrom ?? '',
    opts.dateTo ?? '',
  ] as const;
}

export function fetchEngagementsPaged(
  offset = 0,
  limit = 25,
  opts?: EngagementPagedQueryOpts,
) {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (opts?.q?.trim()) params.set('q', opts.q.trim());
  if (opts?.engagementId && Number.isInteger(opts.engagementId) && opts.engagementId > 0) {
    params.set('engagementId', String(opts.engagementId));
  }
  if (opts?.status && opts.status !== 'All') params.set('status', opts.status);
  if (opts?.attraction?.trim()) params.set('attraction', opts.attraction.trim());
  if (opts?.dma?.trim()) params.set('dma', opts.dma.trim());
  if (opts?.venue?.trim()) params.set('venue', opts.venue.trim());
  if (opts?.timing && opts.timing !== 'all') params.set('timing', opts.timing);
  if (opts?.mine) params.set('mine', '1');
  if (opts?.sortBy?.trim()) {
    params.set('sortBy', opts.sortBy.trim());
    if (opts.sortDir) params.set('sortDir', opts.sortDir);
  }
  if (opts?.dateFrom?.trim()) params.set('dateFrom', opts.dateFrom.trim());
  if (opts?.dateTo?.trim()) params.set('dateTo', opts.dateTo.trim());
  return apiFetch<ApiEngagementsPageResponse>(`/engagements/paged?${params}`);
}

export function fetchEngagementFilterOptions() {
  return apiFetch<ApiEngagementFilterOptions>('/engagements/filter-options');
}
export const fetchEngagement = (id: number) => apiFetch<ApiEngagementListRow>(`/engagements/${id}`);
export const fetchEngagementVenues = (id: number) => apiFetch<ApiEngagementVenueRow[]>(`/engagements/${id}/venues`);
export const fetchEngagementVenueTabData = (id: number) => apiFetch<ApiEngagementVenueTabData>(`/engagements/${id}/venue-tab-data`);
export const updateEngagementVenueTab = (id: number, venueCompanyId: number, body: UpdateEngagementVenueTabPayload) =>
  apiFetch<void>(`/engagements/${id}/venues/${venueCompanyId}/tab`, { method: 'PATCH', body: JSON.stringify(body) });
export const uploadVenueSeatingChart = (id: number, venueCompanyId: number, file: File) => {
  const fd = new FormData();
  fd.append('seatingChart', file);
  return apiFetchMultipart<{ seatingChartLinkId: number; seatingChartLinkUrl: string }>(
    `/engagements/${id}/venues/${venueCompanyId}/seating-chart`,
    { method: 'POST', body: fd },
  );
};
export const removeVenueSeatingChart = (id: number, venueCompanyId: number) =>
  apiFetch<void>(`/engagements/${id}/venues/${venueCompanyId}/seating-chart`, { method: 'DELETE' });
export const upsertEngagementLink = (id: number, body: { linkUrl: string; linkName?: string; linkPurpose: string }) =>
  apiFetch<{ engagementLinkId: number; linkId: number }>(`/engagements/${id}/links`, { method: 'POST', body: JSON.stringify(body) });
export const removeEngagementLink = (id: number, engagementLinkId: number) =>
  apiFetch<void>(`/engagements/${id}/links/${engagementLinkId}`, { method: 'DELETE' });
export const fetchEngagementServiceProviders = (id: number) =>
  apiFetch<ApiEngagementServiceProvidersResponse>(`/engagements/${id}/service-providers`);
export const addEngagementServiceProvider = (id: number, body: { providerCompanyId: number }) =>
  apiFetch<void>(`/engagements/${id}/service-providers`, { method: 'POST', body: JSON.stringify(body) });
export const removeEngagementServiceProvider = (id: number, providerCompanyId: number) =>
  apiFetch<void>(`/engagements/${id}/service-providers/${providerCompanyId}`, { method: 'DELETE' });

// ─── Engagement Partner (dbo.EngagementPartner) ─────────────────────────────
export interface ApiEngagementPartner {
  partnerCompanyId: number | null;
  partnerCompanyName: string | null;
  partnerContactId: number | null;
  partnerContactName: string | null;
}
export const fetchEngagementPartner = (id: number) =>
  apiFetch<ApiEngagementPartner>(`/engagements/${id}/partner`);
export const updateEngagementPartner = (id: number, body: { partnerCompanyId: number; partnerContactId: number | null }) =>
  apiFetch<void>(`/engagements/${id}/partner`, { method: 'PATCH', body: JSON.stringify(body) });

export const addEngagementVenue = (id: number, body: { venueCompanyId: number; isPrimary?: boolean }) =>
  apiFetch<void>(`/engagements/${id}/venues`, { method: 'POST', body: JSON.stringify(body) });
export const removeEngagementVenue = (id: number, venueCompanyId: number) =>
  apiFetch<void>(`/engagements/${id}/venues/${venueCompanyId}`, { method: 'DELETE' });
export const createEngagement = (body: CreateEngagementPayload) =>
  apiFetch<{ engagementId: number }>('/engagements', { method: 'POST', body: JSON.stringify(body) });
export const updateEngagement = (id: number, body: UpdateEngagementPayload) =>
  apiFetch<void>(`/engagements/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
export const deleteEngagement = (id: number) =>
  apiFetch<void>(`/engagements/${id}`, { method: 'DELETE' });
export interface EngagementDeleteImpact {
  canDelete: boolean;
  blockers: string[];
  dependents: { label: string; count: number }[];
}
export const fetchEngagementDeleteImpact = (id: number) =>
  apiFetch<EngagementDeleteImpact>(`/engagements/${id}/delete-impact`);
export const fetchEngagementPerformances = (id: number) =>
  apiFetch<ApiPerformanceRow[]>(`/engagements/${id}/performances`);
export const createEngagementPerformance = (id: number, body: CreatePerformancePayload) =>
  apiFetch<{ performanceId: number }>(`/engagements/${id}/performances`, { method: 'POST', body: JSON.stringify(body) });

export const updateEngagementPerformance = (
  engagementId: number,
  performanceId: number,
  body: { performanceDate?: string; performanceTime?: string; performanceStatus?: string },
) =>
  apiFetch<void>(`/engagements/${engagementId}/performances/${performanceId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const deleteEngagementPerformance = (engagementId: number, performanceId: number) =>
  apiFetch<void>(`/engagements/${engagementId}/performances/${performanceId}`, {
    method: 'DELETE',
  });

export const fetchEngagementPerformanceTicketing = (
  engagementId: number,
  performanceId: number,
) =>
  apiFetch<ApiPerformanceTicketingRow>(
    `/engagements/${engagementId}/performances/${performanceId}/ticketing`,
  );

export const updateEngagementPerformanceTicketing = (
  engagementId: number,
  performanceId: number,
  body: UpdatePerformanceTicketingPayload,
) =>
  apiFetch<void>(`/engagements/${engagementId}/performances/${performanceId}/ticketing`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const fetchPerformancesWithTicketingSummary = (engagementId: number) =>
  apiFetch<ApiPerformanceTicketingSummaryRow[]>(
    `/engagements/${engagementId}/performances/ticketing-summary`,
  );

export const fetchEngagementIaeTicketingManager = (engagementId: number) =>
  apiFetch<ApiEngagementIaeTicketingManager>(
    `/engagements/${engagementId}/iae-ticketing-manager`,
  );

export const updateEngagementIaeTicketingManager = (
  engagementId: number,
  body: { iaeTicketingManagerContactId?: number | null },
) =>
  apiFetch<void>(`/engagements/${engagementId}/iae-ticketing-manager`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const fetchEngagementIaeContactLookups = () =>
  apiFetch<ApiEngagementIaeContactLookups>('/engagements/iae-contact-lookups');

export const fetchEngagementIaeContacts = (engagementId: number) =>
  apiFetch<ApiEngagementIaeContactRow[]>(`/engagements/${engagementId}/iae-contacts`);

export const addEngagementIaeContact = (
  engagementId: number,
  body: CreateEngagementIaeContactPayload,
) =>
  apiFetch<{ engagementIaeContactId: number }>(`/engagements/${engagementId}/iae-contacts`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateEngagementIaeContact = (
  engagementId: number,
  eicId: number,
  body: UpdateEngagementIaeContactPayload,
) =>
  apiFetch<void>(`/engagements/${engagementId}/iae-contacts/${eicId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const deleteEngagementIaeContact = (engagementId: number, eicId: number) =>
  apiFetch<void>(`/engagements/${engagementId}/iae-contacts/${eicId}`, { method: 'DELETE' });

export const fetchEngagementFinance = (id: number) =>
  apiFetch<ApiEngagementFinanceRow>(`/engagements/${id}/finance`);

export const updateEngagementFinance = (id: number, body: UpdateEngagementFinancePayload) =>
  apiFetch<void>(`/engagements/${id}/finance`, { method: 'PATCH', body: JSON.stringify(body) });

// ── Deposit Terms (PerformanceContracts) ────────────────────────────────────
export interface ApiDepositTerms {
  depositAmount: number | null;
  depositDueDate: string | null;
}

export const fetchDepositTerms = (id: number) =>
  apiFetch<ApiDepositTerms>(`/engagements/${id}/deposit-terms`);

export const updateDepositTerms = (id: number, body: { depositAmount?: number | null; depositDueDate?: string | null }) =>
  apiFetch<void>(`/engagements/${id}/deposit-terms`, { method: 'PATCH', body: JSON.stringify(body) });

export type UpdateNonResidentWithholdingPayload = {
  withholdingArea?: string | null;
  withholdingTaxRate?: number | null;
  withholdingAgencyName?: string | null;
  iaeWaiverSubmissionDate?: string | null;
  iaeWaiverAppNumber?: string | null;
};

export const updateNonResidentWithholding = (nrwId: number, body: UpdateNonResidentWithholdingPayload) =>
  apiFetch<void>(`/engagements/non-resident-withholding/${nrwId}`, { method: 'PATCH', body: JSON.stringify(body) });

export const createEngagementWithholding = (id: number) =>
  apiFetch<{ withholdingId: number }>(`/engagements/${id}/withholding`, {
    method: 'POST',
  });

export const updateNonResidentWithholdingLinks = (
  withholdingId: number,
  body: UpdateNonResidentWithholdingLinksPayload,
) =>
  apiFetch<void>(`/engagements/withholdings/${withholdingId}/links`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

// ─── Retail Partners ──────────────────────────────────────────────────────────

export interface ApiRetailPartnerRow {
  retailPartnerId: number;
  engagementId: number;
  companyId: number;
  companyName: string | null;
  companyTypeId: number | null;
  companyTypeName: string | null;
  contactId: number | null;
  contactName: string | null;
}

export interface CreateRetailPartnerPayload {
  companyId: number;
  companyTypeId?: number | null;
  contactId?: number | null;
}

export const fetchRetailPartners = (engagementId: number) =>
  apiFetch<ApiRetailPartnerRow[]>(`/engagements/${engagementId}/retail-partners`);

export const addRetailPartner = (engagementId: number, body: CreateRetailPartnerPayload) =>
  apiFetch<{ retailPartnerId: number }>(`/engagements/${engagementId}/retail-partners`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const deleteRetailPartner = (engagementId: number, retailPartnerId: number) =>
  apiFetch<void>(`/engagements/${engagementId}/retail-partners/${retailPartnerId}`, {
    method: 'DELETE',
  });

// ─── Marketing Meta (read-only tour data) ─────────────────────────────────────

export interface ApiTourMarketingContact {
  tourContactId: number;
  contactId: number;
  contactName: string;
  roleId: number | null;
  roleName: string | null;
}

export interface ApiTourAudienceAgeRange {
  ageRangeId: number;
  ageRangeLabel: string;
  sortOrder: number | null;
}

export interface ApiTourMediaMixItem {
  tourMediaMixId: number;
  advertisingSubTypeId: number;
  subTypeName: string;
  parentCategory: string | null;
  companyId: number | null;
  companyName: string | null;
}

export interface ApiAdvertisingSubType {
  advertisingSubTypeId: number;
  subTypeName: string;
  parentCategory: string | null;
}

export interface ApiMarketingMeta {
  tourMarketingContacts: ApiTourMarketingContact[];
  audienceGender: string | null;
  tourAudienceDemographics: ApiTourAudienceAgeRange[];
  mediaMix: ApiTourMediaMixItem[];
  advertisingSubTypes: ApiAdvertisingSubType[];
  iaeMarketingDirectorContactId: number | null;
  iaeMarketingDirectorContactName: string | null;
  iaeMarketingManagerContactId: number | null;
  iaeMarketingManagerContactName: string | null;
  iaeMarketingCoordinatorContactId: number | null;
  iaeMarketingCoordinatorContactName: string | null;
  tourMarketingDirectorContactId: number | null;
  tourMarketingDirectorContactName: string | null;
  tourMarketingManagerContactId: number | null;
  tourMarketingManagerContactName: string | null;
}

export const fetchMarketingMeta = (engagementId: number) =>
  apiFetch<ApiMarketingMeta>(`/engagements/${engagementId}/marketing-meta`);

export interface UpdateIaeMarketingTeamPayload {
  iaeMarketingDirectorContactId?: number | null;
  iaeMarketingManagerContactId?: number | null;
  iaeMarketingCoordinatorContactId?: number | null;
}

export const updateIaeMarketingTeam = (engagementId: number, body: UpdateIaeMarketingTeamPayload) =>
  apiFetch<void>(`/engagements/${engagementId}/iae-marketing-team`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export interface UpdateTourMarketingTeamPayload {
  tourMarketingDirectorContactId?: number | null;
  tourMarketingManagerContactId?: number | null;
}

export const updateTourMarketingTeam = (engagementId: number, body: UpdateTourMarketingTeamPayload) =>
  apiFetch<void>(`/engagements/${engagementId}/tour-marketing-team`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

// ─── Attraction Travel ─────────────────────────────────────────────────────────

export const TRAVEL_BOOKED_BY_OPTIONS = ['IAE', 'Venue', 'Talent Agency', 'Tour Management'] as const;
export type TravelBookedBy = (typeof TRAVEL_BOOKED_BY_OPTIONS)[number];

export interface ApiTravelAddressInput {
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
}

export interface ApiTravelCarServiceRow {
  carServiceTravelId: number;
  engagementTravelId: number;
  bookedBy: string | null;
  originAddressId: number | null;
  originAddressLabel: string | null;
  destinationAddressId: number | null;
  destinationAddressLabel: string | null;
  pickupDateTime: string | null;
}

export interface ApiTravelHotelRow {
  hotelTravelId: number;
  engagementTravelId: number;
  bookedBy: string | null;
  hotelCompanyId: number | null;
  hotelCompanyName: string | null;
  hotelAddressLine1: string | null;
  hotelAddressCity: string | null;
  hotelAddressStateProvince: string | null;
  hotelAddressPostalCode: string | null;
  hotelAddressCountry: string | null;
  numberOfRooms: number | null;
  roomTypes: string | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  occupantContactId: number | null;
  occupantContactName: string | null;
}

export interface ApiEngagementTravelRow {
  engagementTravelId: number;
  travelType: string;
  hotel: ApiTravelHotelRow | null;
  carServices: ApiTravelCarServiceRow[];
  iaePays?: boolean | null;
  iaeArranges?: boolean | null;
}

export interface CreateTravelHotelPayload {
  bookedBy?: string | null;
  hotelCompanyId?: number | null;
  numberOfRooms?: number | null;
  roomTypes?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  occupantContactId?: number | null;
}

export interface CreateTravelCarServicePayload {
  bookedBy?: string | null;
  originAddressId?: number | null;
  originAddress?: ApiTravelAddressInput | null;
  destinationAddressId?: number | null;
  destinationAddress?: ApiTravelAddressInput | null;
  pickupDateTime?: string | null;
}

export const fetchEngagementTravel = (engagementId: number) =>
  apiFetch<ApiEngagementTravelRow[]>(`/engagements/${engagementId}/travel`);

export interface ApiTravelDrillBitsRow {
  travelType: string;
  iaePays: boolean | null;
  iaeArranges: boolean | null;
}

export const upsertTravelDrillBits = (engagementId: number, travelTypes: ApiTravelDrillBitsRow[]) =>
  apiFetch<void>(`/engagements/${engagementId}/travel/drillbits`, {
    method: 'PUT',
    body: JSON.stringify({ travelTypes }),
  });

export const addEngagementTravelHotel = (engagementId: number, body: CreateTravelHotelPayload) =>
  apiFetch<{ engagementTravelId: number; hotelTravelId: number }>(
    `/engagements/${engagementId}/travel/hotel`,
    { method: 'POST', body: JSON.stringify(body) },
  );

export const updateEngagementTravelHotel = (
  engagementId: number,
  travelId: number,
  body: CreateTravelHotelPayload,
) =>
  apiFetch<void>(`/engagements/${engagementId}/travel/${travelId}/hotel`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const addEngagementTravelCarService = (
  engagementId: number,
  body: CreateTravelCarServicePayload,
) =>
  apiFetch<{ engagementTravelId: number; carServiceTravelId: number }>(
    `/engagements/${engagementId}/travel/car-service`,
    { method: 'POST', body: JSON.stringify(body) },
  );

export const updateEngagementTravelCarService = (
  engagementId: number,
  carServiceTravelId: number,
  body: CreateTravelCarServicePayload,
) =>
  apiFetch<void>(
    `/engagements/${engagementId}/travel/car-service/${carServiceTravelId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );

export const deleteEngagementTravel = (engagementId: number, travelId: number) =>
  apiFetch<void>(`/engagements/${engagementId}/travel/${travelId}`, {
    method: 'DELETE',
  });

// ─── Performance Contracts ────────────────────────────────────────────────────

/** One performance/show date within a contract's schedule. */
export interface ContractPerformanceItem {
  date: string | null;
  time: string | null;
  formatted: string;
}

export interface ApiPerformanceContractRow {
  contractId: number;
  createdAt: string;
  engagementId: number;
  agency: string | null;
  agent: string | null;
  attraction: string | null;
  venueName: string | null;
  venueAddress: string | null;
  venueCity: string | null;
  venueState: string | null;
  venueCountry: string | null;
  producer: string | null;
  producerAddress: string | null;
  producerFedId: string | null;
  guaranteeAmount: number | null;
  guaranteeCurrency: string | null;
  depositAmount: number | null;
  depositDueDate: string | null;
  balanceAmount: number | null;
  balanceDueDate: string | null;
  royaltyDescription: string | null;
  overageDescription: string | null;
  paymentTerms: string | null;
  paymentMethodType: string | null;
  paymentPayableTo: string | null;
  paymentBankName: string | null;
  performances: ContractPerformanceItem[] | null;
  additionallyInsured: string[] | null;
  annotatedPdfBlobName: string | null;
  originalFilename: string | null;
  oneDrivePdfUrl: string | null;
}

export interface SavePerformanceContractPayload {
  agency?: string | null;
  agent?: string | null;
  attraction?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  venueCity?: string | null;
  venueState?: string | null;
  venueCountry?: string | null;
  producer?: string | null;
  producerAddress?: string | null;
  producerFedId?: string | null;
  guaranteeAmount?: number | null;
  guaranteeCurrency?: string | null;
  depositAmount?: number | null;
  depositDueDate?: string | null;
  balanceAmount?: number | null;
  balanceDueDate?: string | null;
  royaltyDescription?: string | null;
  overageDescription?: string | null;
  paymentTerms?: string | null;
  paymentMethodType?: string | null;
  paymentPayableTo?: string | null;
  paymentBankName?: string | null;
  performances?: ContractPerformanceItem[] | null;
  additionallyInsured?: string[] | null;
  oneDrivePdfUrl?: string | null;
  originalFilename?: string | null;
  annotatedPdfBlobName?: string | null;
}

/** Per-field review metadata returned alongside the extracted values (not persisted). */
export interface ContractFieldMeta {
  confidence: number;
  status: 'high' | 'review' | 'derived' | 'not_found';
  sourceQuote: string | null;
  sourcePage: number | null;
  verified: boolean;
}

export type ContractFieldMetaMap = Partial<Record<string, ContractFieldMeta>>;

export interface ContractUploadResponse {
  extracted: {
    agency: string | null;
    agent: string | null;
    attraction: string | null;
    venueName: string | null;
    venueAddress: string | null;
    venueCity: string | null;
    venueState: string | null;
    venueCountry: string | null;
    producer: string | null;
    producerAddress: string | null;
    producerFedId: string | null;
    guaranteeAmount: number | null;
    guaranteeCurrency: string | null;
    depositAmount: number | null;
    depositDueDate: string | null;
    balanceAmount: number | null;
    balanceDueDate: string | null;
    royaltyDescription: string | null;
    overageDescription: string | null;
    paymentTerms: string | null;
    paymentMethodType: string | null;
    paymentPayableTo: string | null;
    paymentBankName: string | null;
    performances: ContractPerformanceItem[] | null;
    additionallyInsured: string[] | null;
    oneDrivePdfUrl: string | null;
  };
  /** Per-field confidence + source snippet for the review UI. */
  fieldMeta?: ContractFieldMetaMap;
  originalFilename: string;
  annotatedPdfBlobName: string;
}

export const fetchPerformanceContracts = (engagementId: number) =>
  apiFetch<ApiPerformanceContractRow[]>(`/engagements/${engagementId}/contracts`);

export const uploadContractPdf = (engagementId: number, file: File) => {
  const fd = new FormData();
  fd.append('contractFile', file);
  return apiFetchMultipart<ContractUploadResponse>(
    `/engagements/${engagementId}/contracts/upload`,
    { method: 'POST', body: fd },
  );
};

export const savePerformanceContract = (engagementId: number, body: SavePerformanceContractPayload) =>
  apiFetch<{ contractId: number }>(`/engagements/${engagementId}/contracts`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updatePerformanceContract = (engagementId: number, contractId: number, body: SavePerformanceContractPayload) =>
  apiFetch<void>(`/engagements/${engagementId}/contracts/${contractId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const deletePerformanceContract = (engagementId: number, contractId: number) =>
  apiFetch<void>(`/engagements/${engagementId}/contracts/${contractId}`, {
    method: 'DELETE',
  });

// ─── SharePoint Folder Management ──────────────────────────────────────────

export interface EngagementSharePointFolderLink {
  linkUrl: string | null;
  linkName: string | null;
  /** Engagement (attraction-level) folder path: `{Year}/{Market}/{Attraction}`. */
  linkPath?: string | null;
  /** Default Market (DMA) folder path one level up: `{Year}/{Market}`. Opened by default in the Documents tab. */
  marketFolderPath?: string | null;
}

/** Get the SharePoint folder link for an engagement */
export const fetchEngagementSharePointFolder = (
  engagementId: number,
): Promise<EngagementSharePointFolderLink | null> =>
  apiFetch<EngagementSharePointFolderLink | null>(
    `/engagements/${engagementId}/sharepoint-folder`,
  );

export type EngagementSharePointFolderStatusValue = 'ready' | 'pending' | 'failed' | 'none';

export interface EngagementSharePointFolderStatus extends EngagementSharePointFolderLink {
  status: EngagementSharePointFolderStatusValue;
  /** The drive the engagement documents live on — the tab browses/uploads/downloads against it. */
  source?: 'sharepoint' | 'onedrive';
  /** Present (with a user-friendly message) when status is 'failed'. */
  error?: string | null;
}

/**
 * Poll the background SharePoint folder provisioning state. Returns 'pending' while
 * folders are being created, 'ready' (with paths) once available, 'failed' on error,
 * or 'none' when no folder exists and nothing is in progress.
 */
export const fetchEngagementSharePointFolderStatus = (
  engagementId: number,
): Promise<EngagementSharePointFolderStatus> =>
  apiFetch<EngagementSharePointFolderStatus>(
    `/engagements/${engagementId}/sharepoint-folder/status`,
  );

/** Manually (re)trigger SharePoint folder creation. Non-blocking — poll status for completion. */
export const createEngagementSharePointFolders = (
  engagementId: number,
): Promise<{ status: EngagementSharePointFolderStatusValue }> =>
  apiFetch<{ status: EngagementSharePointFolderStatusValue }>(
    `/engagements/${engagementId}/create-sharepoint-folders`,
    { method: 'POST' },
  );

