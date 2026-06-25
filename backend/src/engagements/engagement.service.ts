import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Address } from '../entities/address.entity';
import { Attraction } from '../entities/attraction.entity';
import { Company } from '../entities/company.entity';
import { Contact } from '../entities/contact.entity';
import { ContactAssignment } from '../entities/contact-assignment.entity';
import { ContactInfo } from '../entities/contact-info.entity';
import { Department } from '../entities/department.entity';
import { Dma } from '../entities/dma.entity';
import { Link } from '../entities/link.entity';
import { EngagementLink } from '../entities/engagement-link.entity';
import { Engagement } from '../entities/engagement.entity';
import { EngagementIAEContact } from '../entities/engagement-iae-contact.entity';
import { EngagementFinances } from '../entities/engagement-finance.entity';
import { EngagementProduction } from '../entities/engagement-production.entity';
import { EngagementVenue } from '../entities/engagement-venue.entity';
import { EngagementXref } from '../entities/engagement-xref.entity';
import { VenueServiceProvider } from '../entities/venue-service-provider.entity';
import { CompanyService as CompanyServiceEntity } from '../entities/company-service.entity';
import { ServiceProvided } from '../entities/service-provided.entity';
import { NonResidentWithholding } from '../entities/non-resident-withholding.entity';
import { ArtistFinance } from '../entities/artist-finance.entity';
import { SettlementFinance } from '../entities/settlement-finance.entity';
import { Performance } from '../entities/performance.entity';
import { PerformanceTicketing } from '../entities/performance-ticketing.entity';
import { Role } from '../entities/role.entity';
import { TicketingSales } from '../entities/ticketing-sales.entity';
import { Tour } from '../entities/tour.entity';
import { Venue } from '../entities/venue.entity';
import { EmsAppCreatedStore } from '../attraction-tours/ems-app-created.store';
import { DocumentLibraryService } from '../document-library/document-library.service';
import { buildEngagementFolderHierarchies } from './engagement-folder-structure';
import { CreateEngagementDto } from './dto/create-engagement.dto';
import { CreatePerformanceDto } from './dto/create-performance.dto';
import { UpdateEngagementDto } from './dto/update-engagement.dto';
import { UpdateEngagementFinanceDto } from './dto/update-engagement-finance.dto';
import { UpdatePerformanceTicketingDto } from './dto/update-performance-ticketing.dto';
import { CreateEngagementIaeContactDto } from './dto/create-engagement-iae-contact.dto';
import { UpdateEngagementIaeContactDto } from './dto/update-engagement-iae-contact.dto';
import { UpdateNonResidentWithholdingLinksDto } from './dto/update-non-resident-withholding-links.dto';
import { AddEngagementVenueDto } from './dto/add-engagement-venue.dto';
import { UpdateEngagementVenueTabDto } from './dto/update-engagement-venue-tab.dto';
import { CreateEngagementRetailPartnerDto } from './dto/create-engagement-retail-partner.dto';
import { CreateEngagementTravelHotelDto, UpdateEngagementTravelHotelDto, CreateEngagementTravelCarServiceDto, UpdateEngagementTravelCarServiceDto } from './dto/engagement-travel.dto';
import { EngagementTravel } from '../entities/engagement-travel.entity';
import { EngagementTravelCarService } from '../entities/engagement-travel-car-service.entity';
import { EngagementTravelHotel } from '../entities/engagement-travel-hotel.entity';
import { AuditRequestContext } from '../audit/audit-request-context.service';
import { buildEngagementDisplayTitle } from './engagement-display.util';
import { normalizeEngagementStatus } from './engagement-status.util';
import { getIaeWaiverStatusAllowlist } from './iae-waiver-status.constants';

export interface EngagementListRow {
  engagementId: number;
  engagementStatus: string;
  engagementScaling: string | null;
  sellableCapacity: number | null;
  grossPotential: number | null;
  /** Earliest dbo.Performance for this engagement (opening show), if any */
  openingPerformanceDate: string | null;
  openingPerformanceTime: string | null;
  /** Derived via Engagement → Tour → Attraction */
  attractionId: number | null;
  attractionName: string | null;
  tourId: number;
  tourName: string;
  primaryVenueCompanyId: number | null;
  venueCompanyName: string | null;
  venueName: string | null;
  city: string | null;
  stateProvince: string | null;
  dmaMarketName: string | null;
  /** dbo.Tour.BannerLinkID → dbo.Link.LinkURL for tile imagery */
  tourBannerImageUrl: string | null;
  /** dbo.VenueComplexMember → complex company names (comma-separated) for primary venue */
  entertainmentComplexNames: string | null;
  /** Latest dbo.EngagementProduction row for this engagement (RehearsalDate / LoadInDate). */
  rehearsalDate: string | null;
  rehearsalTime: string | null;
  loadInDate: string | null;
  loadInTime: string | null;
  tourManagerContactId: number | null;
  displayTitle: string;
  appCreated: boolean;
  isCanadaEngagement: boolean | null;
}

export interface EngagementVenueRow {
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
  /** dbo.PerformanceTicketing (first performance) */
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
  /** Venue marketing team (optional columns on dbo.EngagementVenue) */
  venueMarketingDirectorContactId: number | null;
  venueMarketingDirectorName: string | null;
  venueMarketingManagerContactId: number | null;
  venueMarketingManagerName: string | null;
  venueDigitalMarketingManagerContactId: number | null;
  venueDigitalMarketingManagerName: string | null;
  /** IAE Production Manager (optional column on dbo.EngagementVenue) */
  iaeProductionManagerContactId: number | null;
  iaeProductionManagerContactName: string | null;
  /** Venue Production Manager (optional column on dbo.EngagementVenue) */
  venueProductionManagerContactId: number | null;
  venueProductionManagerContactName: string | null;
  /** Stagehand / Stage Labor Contact (optional column on dbo.EngagementVenue) */
  stagehandContactId: number | null;
  stagehandContactName: string | null;
}

export interface EngagementVenueTabData {
  venues: EngagementVenueRow[];
  /** From dbo.EngagementFinances.VenueDealTypeID */
  venueDealTypeId: number | null;
  /** From dbo.EngagementFinances (legacy text) */
  venueDealType: string | null;
  venueTerms: string | null;
  /** From dbo.Tour.TechRiderLinkID → dbo.Link.LinkURL */
  techRiderLinkUrl: string | null;
  /** dbo.EngagementLink rows for this engagement (contracts/forecast) */
  engagementLinks: EngagementLinkRow[];
  /** Role-based contacts per venue (for read-only display sections) */
  venueRoleContacts: Record<number, VenueRoleContacts>;
  /** IAE staff assigned to this engagement with role 'Production Manager' */
  iaeProductionManagers: RoleContactDisplay[];
}

export interface EngagementLinkRow {
  engagementLinkId: number;
  linkId: number;
  linkPurpose: string | null;
  linkUrl: string;
  linkName: string;
}

export interface VenueRoleContacts {
  venueTicketingSoftware: RoleContactDisplay[];
  venueTicketingAdministrator: RoleContactDisplay[];
  venueProductionManager: RoleContactDisplay[];
  venueStageLaborCompany: RoleContactDisplay[];
  attractionTechDirector: RoleContactDisplay[];
  marketingDirector: RoleContactDisplay[];
  marketingManager: RoleContactDisplay[];
  digitalMarketingManager: RoleContactDisplay[];
}

export interface RoleContactDisplay {
  contactId: number;
  firstName: string;
  lastName: string;
  roleName: string;
}

export interface EngagementTravelCarServiceRow {
  carServiceTravelId: number;
  engagementTravelId: number;
  bookedBy: string | null;
  originAddressId: number | null;
  originAddressLabel: string | null;
  destinationAddressId: number | null;
  destinationAddressLabel: string | null;
  pickupDateTime: string | null;
}

export interface EngagementTravelHotelRow {
  hotelTravelId: number;
  engagementTravelId: number;
  bookedBy: string | null;
  hotelCompanyId: number | null;
  hotelCompanyName: string | null;
  /** Hotel company physical address (read-only, from dbo.Company → dbo.Address) */
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

export interface EngagementTravelRow {
  engagementTravelId: number;
  travelType: 'Hotel' | 'Car';
  hotel: EngagementTravelHotelRow | null;
  carServices: EngagementTravelCarServiceRow[];
}

export interface EngagementRetailPartnerRow {
  retailPartnerId: number;
  engagementId: number;
  companyId: number | null;
  companyName: string | null;
  companyTypeId: number | null;
  companyTypeName: string | null;
  contactId: number | null;
  contactName: string | null;
}

export interface TourMarketingContactRow {
  tourContactId: number;
  contactId: number;
  contactName: string | null;
  roleId: number | null;
  roleName: string | null;
  isPrimary: boolean;
}

export interface AdvertisingSubTypeRow {
  advertisingSubTypeId: number;
  subTypeName: string;
  parentCategory: string | null;
  isActive: boolean;
}

export interface TourMediaMixRow {
  tourMediaMixId: number;
  advertisingSubTypeId: number;
  subTypeName: string;
  parentCategory: string | null;
  companyId: number | null;
  companyName: string | null;
}

export interface EngagementMarketingMeta {
  /** Marketing contacts for the tour (read-only, from dbo.TourContact) */
  tourMarketingContacts: TourMarketingContactRow[];
  /** Tour audience gender (read-only, from dbo.Tour.AudienceGender) */
  audienceGender: string | null;
  /** Tour audience age range (read-only, from dbo.TourAudienceAgeRange + dbo.AgeRange) */
  tourAudienceDemographics: { ageRangeId: number; ageRangeLabel: string; sortOrder: number | null }[];
  /** Tour audience age range as combined string */
  tourAudienceAgeRange: string | null;
  /** Media mix entries for the tour (read-only, from dbo.TourMediaMix) */
  mediaMix: TourMediaMixRow[];
  /** All active AdvertisingSubType entries for the Media Mix picker (reference data) */
  advertisingSubTypes: AdvertisingSubTypeRow[];
  /** IAE Marketing Team (optional columns on dbo.Engagement) */
  iaeMarketingDirectorContactId: number | null;
  iaeMarketingDirectorContactName: string | null;
  iaeMarketingManagerContactId: number | null;
  iaeMarketingManagerContactName: string | null;
  iaeMarketingCoordinatorContactId: number | null;
  iaeMarketingCoordinatorContactName: string | null;
  /** Tour Marketing Team (optional columns on dbo.Tour) */
  tourMarketingDirectorContactId: number | null;
  tourMarketingDirectorContactName: string | null;
  tourMarketingManagerContactId: number | null;
  tourMarketingManagerContactName: string | null;
}

export interface EngagementServiceProviderRow {
  providerCompanyId: number;
  providerCompanyName: string | null;
  serviceProvidedIds: number[];
  serviceProvidedNames: string[];
}

export interface EngagementFinanceRow {
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
  /** dbo.EngagementFinances.VenueDealTypeID — FK into dbo.VenueDealType (merged "Venue Deal"). */
  venueDealTypeId: number | null;
  /** dbo.VenueDealType.VenueDealTypeName for the selected VenueDealTypeID (display only). */
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
  /** dbo.SettlementFinance (via EngagementFinances.SettlementFinanceID) */
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
  /** dbo.ArtistFinance (via EngagementFinances.ArtistFinanceID) */
  artistDealType: string | null;
  artistGuarantee: number | null;
  artistMiddleMoney: number | null;
  artistRoyaltyVariableFee: string | null;
  artistBackEndTerms: string | null;
  artistVersusPercent: number | null;
  /** dbo.ArtistFinance.OveragePercent — Overage (%) stored as decimal */
  overagePercent: number | null;
  artistPromoterProfitPercent: number | null;
  artistBackendPercent: number | null;
  artistRoyaltyRatePercent: number | null;
  artistRoyaltyBasedOn: string | null;
  /** dbo.EngagementFinances — add columns if missing */
  finalAcceptedOfferLink: string | null;
  settlementFileSharePointLink: string | null;
  /** dbo.EngagementFinances.TourSplitPoint — existing column */
  tourSplitPoint: number | null;
  /** dbo.EngagementFinances.AnnouncementDate — optional column */
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
  /** dbo.EngagementFinances.FinanceCustomer (optional column) */
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

export interface FinanceMasterOption {
  id: number;
  label: string;
  withholdingTaxRate?: string | null;
  withholdingArea?: string | null;
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
  withholdingLink?: FinanceLink | null;
  artistWaiverInstructions?: FinanceLink | null;
  iaeWaiverInstructions?: FinanceLink | null;
}

export interface FinanceLink {
  linkId: number;
  linkType: string;
  linkUrl: string;
  linkName: string;
  linkPath: string;
}

export interface EngagementFinanceLookups {
  nonResidentWithholdings: FinanceMasterOption[];
  artistFinances: FinanceMasterOption[];
  settlementFinances: FinanceMasterOption[];
  iaeApplicationWaiverStatuses: { value: string; label: string }[];
  /** dbo.VenueDealType — options for the merged "Venue Deal" dropdown. */
  venueDealTypes: { id: number; label: string }[];
}

/** dbo.PerformanceTicketing (one logical row per performance in the EMS UI). */
export interface PerformanceTicketingRow {
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
  serviceChargeRevenueShare: number | null;
  rebateAmount: number | null;
  bumpAmount: number | null;
  creditCardFeesType: 'Inside Service Charge' | 'Budget Line Item' | null;
  creditCardFeesAmountPercent: number | null;
  salesTaxType: string | null;
  salesTaxAmountPercent: number | null;
  /** Existing DB cols exposed via optional-col probe */
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
  /** Optional DB columns — null when column absent */
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

export interface PerformanceTicketingSummaryRow {
  performanceId: number;
  performanceDate: string;
  performanceTime: string;
  performanceStatus: string;
  sellableCapacity: number | null;
  grossPotentialRevenue: number | null;
}

export interface EngagementIaeTicketingManager {
  iaeTicketingManagerContactId: number | null;
  iaeTicketingManagerContactName: string | null;
}

export interface EngagementIaeContactRow {
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

export interface EngagementIaeContactLookups {
  contacts: FinanceMasterOption[];
  roles: FinanceMasterOption[];
  departments: FinanceMasterOption[];
  ticketingManagerContactIds: number[];
}

/** Query params for {@link EngagementService.listPaginated}. */
export interface EngagementListFilters {
  q?: string;
  engagementId?: number;
  status?: string;
  attractionName?: string;
  dmaMarketName?: string;
  venueLabel?: string;
  timing?: 'all' | 'upcoming' | 'past';
  /** Whitelist: attraction, tour, venue, market, date */
  sortBy?: string;
  sortDir?: string;
}

function pickRaw(r: Record<string, unknown>, key: string): unknown {
  if (key in r) return r[key];
  const lower = key.toLowerCase();
  const found = Object.keys(r).find((x) => x.toLowerCase() === lower);
  return found ? r[found] : undefined;
}

@Injectable()
export class EngagementService {
  private readonly logger = new Logger(EngagementService.name);

  /**
   * When dbo.EngagementFinances has optional SharePoint link columns, read/write them via raw SQL.
   * `null` = not yet probed; avoids repeated metadata queries once resolved.
   */
  private engagementFinanceSharePointLinkColsPresent: boolean | null = null;
  private engagementFinanceMarketingBudgetColsPresent: boolean | null = null;
  private engagementFinanceDealStructureColsPresent:
    | {
        venueDealType: boolean;
        thirdPartyPartnerDealStructure: boolean;
        venueDealTypeId: boolean;
      }
    | null = null;
  private performanceTicketingAdvancedColsPresent: boolean | null = null;
  private performanceTicketingExtendedColsPresent: boolean | null = null;
  private performanceTicketingPasswordColsPresent: boolean | null = null;
  private engagementFinancesIaeTicketingManagerColPresent: boolean | null = null;
  private nonResidentWithholdingHasDmaIdColumn: boolean | null = null;
  private engagementProductionTimeColsPresent: boolean | null = null;
  private engagementVenueOptionalColsPresent: boolean | null = null;
  private venueOptionalTechPackColPresent: boolean | null = null;
  /** Optional venue marketing contact columns on dbo.EngagementVenue */
  private engagementVenueMarketingColsPresent: boolean | null = null;
  /** Optional IaeProductionManagerContactID column on dbo.EngagementVenue */
  private engagementVenueProductionManagerColPresent: boolean | null = null;
  /** Optional VenueProductionManagerContactID column on dbo.EngagementVenue */
  private engagementVenueVenueProductionManagerColPresent: boolean | null = null;
  /** Optional StagehandContactID column on dbo.EngagementVenue */
  private engagementVenueStagehandContactColPresent: boolean | null = null;
  /** Optional TicketingAdminContactID column on dbo.EngagementVenue */
  private engagementVenueTicketingAdminColPresent: boolean | null = null;
  /** Optional SeatingChartUrl column on dbo.Venue */
  private venueSeatingChartUrlColPresent: boolean | null = null;
  /** Optional IAE Marketing Team columns on dbo.Engagement */
  private engagementIaeMarketingColsPresent: boolean | null = null;
  /** Optional Tour Marketing Director/Manager columns on dbo.Tour */
  private tourMarketingColsPresent: boolean | null = null;
  /** Optional AnnouncementDate column on dbo.EngagementFinances */
  private engagementFinanceAnnouncementDatePresent: boolean | null = null;
  /** Optional Booking contact columns on dbo.EngagementFinances */
  private engagementFinanceBookingColsPresent: boolean | null = null;
  /** Optional Attraction Contract link columns on dbo.EngagementFinances */
  private engagementFinanceContractLinkColsPresent: boolean | null = null;
  /** Optional Event Business columns on dbo.EngagementFinances */
  private engagementFinanceEventBusinessColsPresent: boolean | null = null;

  constructor(
    @InjectRepository(Engagement)
    private readonly engagementRepo: Repository<Engagement>,
    @InjectRepository(EngagementFinances)
    private readonly engagementFinancesRepo: Repository<EngagementFinances>,
    @InjectRepository(EngagementVenue)
    private readonly engagementVenueRepo: Repository<EngagementVenue>,
    @InjectRepository(EngagementProduction)
    private readonly engagementProductionRepo: Repository<EngagementProduction>,
    @InjectRepository(Tour)
    private readonly tourRepo: Repository<Tour>,
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(VenueServiceProvider)
    private readonly venueServiceProviderRepo: Repository<VenueServiceProvider>,
    @InjectRepository(CompanyServiceEntity)
    private readonly companyServiceRepo: Repository<CompanyServiceEntity>,
    @InjectRepository(ServiceProvided)
    private readonly serviceProvidedRepo: Repository<ServiceProvided>,
    @InjectRepository(Performance)
    private readonly performanceRepo: Repository<Performance>,
    @InjectRepository(PerformanceTicketing)
    private readonly performanceTicketingRepo: Repository<PerformanceTicketing>,
    @InjectRepository(Link)
    private readonly linkRepo: Repository<Link>,
    @InjectRepository(EngagementIAEContact)
    private readonly engagementIaeContactRepo: Repository<EngagementIAEContact>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(ContactInfo)
    private readonly contactInfoRepo: Repository<ContactInfo>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(NonResidentWithholding)
    private readonly nonResidentWithholdingRepo: Repository<NonResidentWithholding>,
    @InjectRepository(ArtistFinance)
    private readonly artistFinanceRepo: Repository<ArtistFinance>,
    @InjectRepository(SettlementFinance)
    private readonly settlementFinanceRepo: Repository<SettlementFinance>,
    @InjectRepository(EngagementTravel)
    private readonly engagementTravelRepo: Repository<EngagementTravel>,
    @InjectRepository(EngagementTravelCarService)
    private readonly engagementTravelCarServiceRepo: Repository<EngagementTravelCarService>,
    @InjectRepository(EngagementTravelHotel)
    private readonly engagementTravelHotelRepo: Repository<EngagementTravelHotel>,
    @InjectRepository(EngagementLink)
    private readonly engagementLinkRepo: Repository<EngagementLink>,
    private readonly emsCreated: EmsAppCreatedStore,
    private readonly dataSource: DataSource,
    private readonly auditContext: AuditRequestContext,
    private readonly documentLibrary: DocumentLibraryService,
  ) {}

  private async getPrimaryVenueCompanyIdForEngagement(
    engagementId: number,
  ): Promise<number> {
    const row = await this.engagementVenueRepo.findOne({
      where: { engagementId, isPrimary: true },
    });
    const id = row?.venueCompanyId ?? null;
    if (id == null || !Number.isInteger(id) || id < 1) {
      throw new BadRequestException({
        message:
          'This engagement has no primary venue, so service providers cannot be managed.',
      });
    }
    return id;
  }

  private async loadCompanyServices(
    companyId: number,
  ): Promise<ServiceProvided[]> {
    const rows = await this.companyServiceRepo.find({
      where: { companyId },
      relations: { serviceProvided: true },
    });
    const list = rows
      .map((r) => r.serviceProvided)
      .filter((s): s is ServiceProvided => !!s);
    const deduped = new Map<number, ServiceProvided>();
    for (const s of list) deduped.set(s.serviceProvidedId, s);
    return [...deduped.values()].sort((a, b) =>
      a.serviceName.localeCompare(b.serviceName, undefined, {
        sensitivity: 'base',
      }),
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private normalizeTime(t: string): string {
    const parts = t.trim().split(':');
    if (parts.length === 2)
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
    if (parts.length === 3)
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0').slice(0, 2)}`;
    throw new BadRequestException({
      message: 'Invalid performance time format. Expected HH:mm or HH:mm:ss.',
    });
  }

  private async assertPerformanceSlotAvailable(
    engagementId: number,
    performanceDate: string,
    performanceTime: string,
    excludePerformanceId?: number,
  ): Promise<void> {
    const qb = this.performanceRepo
      .createQueryBuilder('p')
      .where('p.engagementId = :engagementId', { engagementId })
      .andWhere('p.performanceDate = :performanceDate', { performanceDate })
      .andWhere('p.performanceTime = :performanceTime', { performanceTime });

    if (excludePerformanceId != null) {
      qb.andWhere('p.performanceId <> :excludePerformanceId', {
        excludePerformanceId,
      });
    }

    const existing = await qb.getOne();
    if (existing) {
      throw new ConflictException({
        message:
          'A show already exists for this engagement at the exact same date and time.',
      });
    }
  }

  private async assertVenueCompany(venueCompanyId: number): Promise<void> {
    const company = await this.companyRepo.findOne({
      where: { companyId: venueCompanyId },
    });
    if (!company) {
      throw new BadRequestException({
        message: `Company with ID ${venueCompanyId} does not exist.`,
      });
    }
    const venue = await this.venueRepo.findOne({
      where: { companyId: venueCompanyId },
    });
    if (!venue) {
      throw new BadRequestException({
        message: `Company #${venueCompanyId} exists but is not registered as a venue.`,
      });
    }
  }

  private async assertEngagementExists(id: number): Promise<Engagement> {
    const e = await this.engagementRepo.findOne({
      where: { engagementId: id },
    });
    if (!e)
      throw new NotFoundException({ message: `Engagement #${id} not found.` });
    return e;
  }

  private mapFinanceNumber(
    v: string | number | null | undefined,
  ): number | null {
    if (v == null || v === '') return null;
    const x = typeof v === 'string' ? parseFloat(v) : v;
    return Number.isFinite(x) ? x : null;
  }

  private mapFinanceYmd(v: string | Date | null | undefined): string | null {
    if (v == null || v === '') return null;
    if (v instanceof Date) {
      if (Number.isNaN(v.getTime())) return null;
      const y = v.getUTCFullYear();
      const m = String(v.getUTCMonth() + 1).padStart(2, '0');
      const d = String(v.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const s = String(v).trim();
    const t = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return t ? t[1] : null;
  }

  private assertYmdOrNull(value: string | null | undefined): string | null {
    if (value == null || value === '') return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException({
        message: 'Invalid date. Use YYYY-MM-DD.',
      });
    }
    return value;
  }

  private escapeSqlNVarCharLiteral(value: string): string {
    return `N'${String(value).replace(/'/g, "''")}'`;
  }

  /**
   * Escapes SQL Server LIKE wildcards so user-entered search text is treated literally.
   * Uses backslash as the ESCAPE character.
   */
  private escapeLikePattern(value: string): string {
    return String(value)
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]');
  }

  private searchTokens(value: string): string[] {
    return [
      ...new Set(
        String(value ?? '')
          .trim()
          .split(/[^a-zA-Z0-9]+/)
          .map((token) => token.trim())
          .filter(Boolean),
      ),
    ].slice(0, 8);
  }

  private async engagementFinancesHasSharePointLinkColumns(): Promise<boolean> {
    if (this.engagementFinanceSharePointLinkColsPresent !== null) {
      return this.engagementFinanceSharePointLinkColsPresent;
    }
    try {
      const r = await this.dataSource.query(
        `
        SELECT CASE WHEN
          EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'FinalAcceptedOfferLink'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'SettlementFileSharePointLink'
          )
        THEN 1 ELSE 0 END AS ok
      `,
      );
      const row0 = (r as Record<string, unknown>[])?.[0];
      const rawOk = row0 ? pickRaw(row0, 'ok') : undefined;
      const ok =
        rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
      this.engagementFinanceSharePointLinkColsPresent = ok;
      return ok;
    } catch {
      this.engagementFinanceSharePointLinkColsPresent = false;
      return false;
    }
  }

  private async mergeFinanceSharePointLinksFromDb(
    financeId: number,
    base: EngagementFinanceRow,
  ): Promise<EngagementFinanceRow> {
    if (!(await this.engagementFinancesHasSharePointLinkColumns())) {
      return base;
    }
    try {
      const fid = Math.floor(Number(financeId));
      if (!Number.isFinite(fid) || fid < 1) return base;
      const r = await this.dataSource.query(
        `SELECT [FinalAcceptedOfferLink] AS fl, [SettlementFileSharePointLink] AS sl
         FROM dbo.EngagementFinances WHERE [FinanceID] = ${fid}`,
      );
      const lr = (r as Record<string, unknown>[])?.[0];
      if (!lr) return base;
      const fl = pickRaw(lr, 'fl');
      const sl = pickRaw(lr, 'sl');
      return {
        ...base,
        finalAcceptedOfferLink:
          fl == null || fl === '' ? null : String(fl).slice(0, 500),
        settlementFileSharePointLink:
          sl == null || sl === '' ? null : String(sl).slice(0, 500),
      };
    } catch {
      return base;
    }
  }

  private async tryPersistFinanceSharePointLinks(
    financeId: number | null | undefined,
    dto: UpdateEngagementFinanceDto,
  ): Promise<void> {
    const fid = financeId == null ? NaN : Math.floor(Number(financeId));
    if (!Number.isFinite(fid) || fid < 1) return;
    if (!(await this.engagementFinancesHasSharePointLinkColumns())) return;
    const wantF = dto.finalAcceptedOfferLink !== undefined;
    const wantS = dto.settlementFileSharePointLink !== undefined;
    if (!wantF && !wantS) return;
    const fSql =
      wantF &&
      (dto.finalAcceptedOfferLink == null ||
        String(dto.finalAcceptedOfferLink).trim() === '')
        ? 'NULL'
        : wantF
          ? this.escapeSqlNVarCharLiteral(
              String(dto.finalAcceptedOfferLink).trim().slice(0, 500),
            )
          : null;
    const sSql =
      wantS &&
      (dto.settlementFileSharePointLink == null ||
        String(dto.settlementFileSharePointLink).trim() === '')
        ? 'NULL'
        : wantS
          ? this.escapeSqlNVarCharLiteral(
              String(dto.settlementFileSharePointLink).trim().slice(0, 500),
            )
          : null;
    const sets: string[] = [];
    if (wantF && fSql != null) sets.push(`[FinalAcceptedOfferLink] = ${fSql}`);
    if (wantS && sSql != null)
      sets.push(`[SettlementFileSharePointLink] = ${sSql}`);
    if (!sets.length) return;
    await this.dataSource.query(
      `UPDATE dbo.EngagementFinances SET ${sets.join(', ')} WHERE [FinanceID] = ${fid}`,
    );
  }

  private async engagementFinancesHasMarketingBudgetColumns(): Promise<boolean> {
    if (this.engagementFinanceMarketingBudgetColsPresent !== null) {
      return this.engagementFinanceMarketingBudgetColsPresent;
    }
    try {
      const r = await this.dataSource.query(
        `
        SELECT CASE WHEN
          EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'GrossMarketingBudget'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'NetMarketingBudget'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'SalesRevenueGoal'
          )
        THEN 1 ELSE 0 END AS ok
      `,
      );
      const row0 = (r as Record<string, unknown>[])?.[0];
      const rawOk = row0 ? pickRaw(row0, 'ok') : undefined;
      const ok =
        rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
      this.engagementFinanceMarketingBudgetColsPresent = ok;
      return ok;
    } catch {
      this.engagementFinanceMarketingBudgetColsPresent = false;
      return false;
    }
  }

  private async mergeFinanceMarketingBudgetFromDb(
    financeId: number,
    base: EngagementFinanceRow,
  ): Promise<EngagementFinanceRow> {
    if (!(await this.engagementFinancesHasMarketingBudgetColumns())) {
      return base;
    }
    try {
      const fid = Math.floor(Number(financeId));
      if (!Number.isFinite(fid) || fid < 1) return base;
      const r = await this.dataSource.query(
        `SELECT
          [GrossMarketingBudget] AS gmb,
          [NetMarketingBudget] AS nmb,
          [SalesRevenueGoal] AS srg,
          [TourSplitPoint] AS tsp
         FROM dbo.EngagementFinances WHERE [FinanceID] = ${fid}`,
      );
      const row0 = (r as Record<string, unknown>[])?.[0];
      if (!row0) return base;
      const gmb = pickRaw(row0, 'gmb') as string | number | null | undefined;
      const nmb = pickRaw(row0, 'nmb') as string | number | null | undefined;
      const srg = pickRaw(row0, 'srg') as string | number | null | undefined;
      const tsp = pickRaw(row0, 'tsp') as string | number | null | undefined;
      const merged: EngagementFinanceRow = {
        ...base,
        grossMarketingBudget: this.mapFinanceNumber(gmb),
        netMarketingBudget: this.mapFinanceNumber(nmb),
        salesRevenueGoal: this.mapFinanceNumber(srg),
        tourSplitPoint: this.mapFinanceNumber(tsp),
      };
      return merged;
    } catch {
      return base;
    }
  }

  private async engagementFinancesHasAnnouncementDateColumn(): Promise<boolean> {
    if (this.engagementFinanceAnnouncementDatePresent !== null)
      return this.engagementFinanceAnnouncementDatePresent;
    try {
      const r = await this.dataSource.query(`
        SELECT CASE WHEN EXISTS (
          SELECT 1 FROM sys.columns c
          INNER JOIN sys.tables t ON c.object_id = t.object_id
          INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
          WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'AnnouncementDate'
        ) THEN 1 ELSE 0 END AS ok`);
      const raw = pickRaw((r as Record<string, unknown>[])?.[0] ?? {}, 'ok');
      this.engagementFinanceAnnouncementDatePresent =
        raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
      return this.engagementFinanceAnnouncementDatePresent;
    } catch {
      this.engagementFinanceAnnouncementDatePresent = false;
      return false;
    }
  }

  private async mergeFinanceAnnouncementDateFromDb(
    financeId: number,
    base: EngagementFinanceRow,
  ): Promise<EngagementFinanceRow> {
    if (!(await this.engagementFinancesHasAnnouncementDateColumn())) return base;
    try {
      const fid = Math.floor(Number(financeId));
      if (!Number.isFinite(fid) || fid < 1) return base;
      const r = await this.dataSource.query(
        `SELECT CONVERT(varchar(10), [AnnouncementDate], 120) AS ad
         FROM dbo.EngagementFinances WHERE [FinanceID] = ${fid}`,
      );
      const row0 = (r as Record<string, unknown>[])?.[0];
      if (!row0) return base;
      const ad = pickRaw(row0, 'ad');
      return {
        ...base,
        announcementDate: ad != null && ad !== '' ? String(ad).slice(0, 10) : null,
      };
    } catch {
      return base;
    }
  }

  private async mergeAnnouncementDateFromProduction(
    engagementId: number,
    base: EngagementFinanceRow,
  ): Promise<EngagementFinanceRow> {
    try {
      const rows = await this.engagementProductionRepo.find({
        where: { engagementId },
        order: { productionId: 'DESC' },
        take: 1,
      });
      const prod = rows[0];
      if (!prod) return base;
      const ad = prod.announcementDate;
      return {
        ...base,
        announcementDate: ad != null && String(ad).trim() !== '' ? String(ad).slice(0, 10) : null,
      };
    } catch {
      return base;
    }
  }

  private async tryPersistFinanceMarketingBudget(
    financeId: number | null | undefined,
    dto: UpdateEngagementFinanceDto,
  ): Promise<void> {
    const fid = financeId == null ? NaN : Math.floor(Number(financeId));
    if (!Number.isFinite(fid) || fid < 1) return;
    if (!(await this.engagementFinancesHasMarketingBudgetColumns())) return;

    const wantG = dto.grossMarketingBudget !== undefined;
    const wantN = dto.netMarketingBudget !== undefined;
    const wantS = dto.salesRevenueGoal !== undefined;
    const wantT = dto.tourSplitPoint !== undefined;
    if (!wantG && !wantN && !wantS && !wantT) {
      return;
    }

    const sets: string[] = [];
    if (wantG) {
      sets.push(
        `[GrossMarketingBudget] = ${dto.grossMarketingBudget == null ? 'NULL' : Number(dto.grossMarketingBudget)}`,
      );
    }
    if (wantN) {
      sets.push(
        `[NetMarketingBudget] = ${dto.netMarketingBudget == null ? 'NULL' : Number(dto.netMarketingBudget)}`,
      );
    }
    if (wantS) {
      sets.push(
        `[SalesRevenueGoal] = ${dto.salesRevenueGoal == null ? 'NULL' : Number(dto.salesRevenueGoal)}`,
      );
    }
    if (wantT) {
      sets.push(
        `[TourSplitPoint] = ${dto.tourSplitPoint == null ? 'NULL' : Number(dto.tourSplitPoint)}`,
      );
    }
    if (sets.length > 0) {
      await this.dataSource.query(
        `UPDATE dbo.EngagementFinances SET ${sets.join(', ')} WHERE [FinanceID] = ${fid}`,
      );
    }
  }

  private async tryPersistFinanceAnnouncementDate(
    financeId: number,
    dto: UpdateEngagementFinanceDto,
  ): Promise<void> {
    if (dto.announcementDate === undefined) return;
    if (!(await this.engagementFinancesHasAnnouncementDateColumn())) return;
    const val =
      dto.announcementDate == null || dto.announcementDate === ''
        ? 'NULL'
        : this.escapeSqlNVarCharLiteral(String(dto.announcementDate).slice(0, 10));
    await this.dataSource.query(
      `UPDATE dbo.EngagementFinances SET [AnnouncementDate] = ${val} WHERE [FinanceID] = ${financeId}`,
    );
  }

  private async tryPersistAnnouncementDateToProduction(
    engagementId: number,
    dto: UpdateEngagementFinanceDto,
  ): Promise<void> {
    if (dto.announcementDate === undefined) return;
    const rows = await this.engagementProductionRepo.find({
      where: { engagementId },
      order: { productionId: 'DESC' },
      take: 1,
    });
    let prod = rows[0] ?? null;
    if (!prod) {
      prod = this.engagementProductionRepo.create({
        engagementId,
        rehearsalDate: null,
        loadInDate: null,
        announcementDate: null,
      });
    }
    prod.announcementDate =
      dto.announcementDate == null || dto.announcementDate === ''
        ? null
        : this.assertYmdOrNull(dto.announcementDate);
    await this.engagementProductionRepo.save(prod);
  }

  private normalizeVenueDealType(
    value: unknown,
  ):
    | 'Rental'
    | 'CoPro'
    | '3rd Party Renting Venue'
    | 'Silent CoPro with Venue'
    | null {
    const t = String(value ?? '').trim().toLowerCase();
    if (!t) return null;
    if (t === 'rental') return 'Rental';
    if (t === 'copro') return 'CoPro';
    if (t === '3rd party renting venue') return '3rd Party Renting Venue';
    if (t === 'silent copro with venue') return 'Silent CoPro with Venue';
    return null;
  }

  private normalizeThirdPartyPartnerDealStructure(
    value: unknown,
  ):
    | 'CoPro with 3rd Party'
    | 'CoPro with 3rd Party, 3rd Party Renting Venue'
    | 'Silent CoPro with 3rd Party, 3rd Party Renting Venue'
    | null {
    const t = String(value ?? '').trim().toLowerCase();
    if (!t) return null;
    if (t === 'copro with 3rd party') return 'CoPro with 3rd Party';
    if (t === 'copro with 3rd party, 3rd party renting venue') {
      return 'CoPro with 3rd Party, 3rd Party Renting Venue';
    }
    if (t === 'silent copro with 3rd party, 3rd party renting venue') {
      return 'Silent CoPro with 3rd Party, 3rd Party Renting Venue';
    }
    return null;
  }

  private async engagementFinancesGetDealStructureColumns(): Promise<{
    venueDealType: boolean;
    thirdPartyPartnerDealStructure: boolean;
    venueDealTypeId: boolean;
  }> {
    if (this.engagementFinanceDealStructureColsPresent !== null) {
      return this.engagementFinanceDealStructureColsPresent;
    }
    try {
      const r = await this.dataSource.query(
        `
        SELECT
          CASE WHEN EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'VenueDealType'
          ) THEN 1 ELSE 0 END AS venueDealType,
          CASE WHEN EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'ThirdPartyPartnerDealStructure'
          ) THEN 1 ELSE 0 END AS thirdPartyPartnerDealStructure,
          CASE WHEN EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'VenueDealTypeID'
          ) THEN 1 ELSE 0 END AS venueDealTypeId
      `,
      );
      const row0 = (r as Record<string, unknown>[])?.[0];
      const venueDealTypeRaw = row0 ? pickRaw(row0, 'venueDealType') : undefined;
      const thirdPartyRaw = row0
        ? pickRaw(row0, 'thirdPartyPartnerDealStructure')
        : undefined;
      const venueDealTypeIdRaw = row0
        ? pickRaw(row0, 'venueDealTypeId')
        : undefined;
      const truthy = (v: unknown) =>
        v === 1 || v === true || v === '1' || Number(v) === 1;
      const present = {
        venueDealType: truthy(venueDealTypeRaw),
        thirdPartyPartnerDealStructure: truthy(thirdPartyRaw),
        venueDealTypeId: truthy(venueDealTypeIdRaw),
      };
      this.engagementFinanceDealStructureColsPresent = present;
      return present;
    } catch {
      const missing = {
        venueDealType: false,
        thirdPartyPartnerDealStructure: false,
        venueDealTypeId: false,
      };
      this.engagementFinanceDealStructureColsPresent = missing;
      return missing;
    }
  }

  private async mergeFinanceDealStructuresFromDb(
    financeId: number,
    base: EngagementFinanceRow,
  ): Promise<EngagementFinanceRow> {
    const cols = await this.engagementFinancesGetDealStructureColumns();
    if (
      !cols.venueDealType &&
      !cols.thirdPartyPartnerDealStructure &&
      !cols.venueDealTypeId
    ) {
      return base;
    }
    try {
      const fid = Math.floor(Number(financeId));
      if (!Number.isFinite(fid) || fid < 1) return base;
      const sets: string[] = [];
      if (cols.venueDealType) sets.push('ef.[VenueDealType] AS vdt');
      if (cols.thirdPartyPartnerDealStructure) {
        sets.push('ef.[ThirdPartyPartnerDealStructure] AS tppds');
      }
      if (cols.venueDealTypeId) {
        sets.push('ef.[VenueDealTypeID] AS vdtid');
        sets.push('vdt_lk.[VenueDealTypeName] AS vdtname');
      }
      if (!sets.length) return base;
      const join = cols.venueDealTypeId
        ? 'LEFT JOIN dbo.VenueDealType vdt_lk ON vdt_lk.VenueDealTypeID = ef.VenueDealTypeID'
        : '';
      const r = await this.dataSource.query(
        `SELECT ${sets.join(', ')} FROM dbo.EngagementFinances ef ${join} WHERE ef.[FinanceID] = ${fid}`,
      );
      const row0 = (r as Record<string, unknown>[])?.[0];
      if (!row0) return base;
      const vdtidRaw = cols.venueDealTypeId ? pickRaw(row0, 'vdtid') : null;
      const vdtid =
        vdtidRaw == null || vdtidRaw === '' ? null : Math.floor(Number(vdtidRaw));
      return {
        ...base,
        venueDealType: cols.venueDealType
          ? this.normalizeVenueDealType(pickRaw(row0, 'vdt'))
          : base.venueDealType,
        thirdPartyPartnerDealStructure: cols.thirdPartyPartnerDealStructure
          ? this.normalizeThirdPartyPartnerDealStructure(pickRaw(row0, 'tppds'))
          : base.thirdPartyPartnerDealStructure,
        venueDealTypeId: cols.venueDealTypeId
          ? Number.isFinite(vdtid as number) && (vdtid as number) > 0
            ? (vdtid as number)
            : null
          : base.venueDealTypeId,
        venueDealTypeName: cols.venueDealTypeId
          ? (() => {
              const n = String(pickRaw(row0, 'vdtname') ?? '').trim();
              return n || null;
            })()
          : base.venueDealTypeName,
      };
    } catch {
      return base;
    }
  }

  private async tryPersistFinanceDealStructures(
    financeId: number | null | undefined,
    dto: UpdateEngagementFinanceDto,
  ): Promise<void> {
    const fid = financeId == null ? NaN : Math.floor(Number(financeId));
    if (!Number.isFinite(fid) || fid < 1) return;
    const cols = await this.engagementFinancesGetDealStructureColumns();
    if (
      !cols.venueDealType &&
      !cols.thirdPartyPartnerDealStructure &&
      !cols.venueDealTypeId
    ) {
      return;
    }

    const sets: string[] = [];
    if (cols.venueDealType && dto.venueDealType !== undefined) {
      const v = this.normalizeVenueDealType(dto.venueDealType);
      sets.push(`[VenueDealType] = ${v == null ? 'NULL' : this.escapeSqlNVarCharLiteral(v)}`);
    }
    if (
      cols.thirdPartyPartnerDealStructure &&
      dto.thirdPartyPartnerDealStructure !== undefined
    ) {
      const v = this.normalizeThirdPartyPartnerDealStructure(
        dto.thirdPartyPartnerDealStructure,
      );
      sets.push(
        `[ThirdPartyPartnerDealStructure] = ${v == null ? 'NULL' : this.escapeSqlNVarCharLiteral(v)}`,
      );
    }
    if (cols.venueDealTypeId && dto.venueDealTypeId !== undefined) {
      const id =
        dto.venueDealTypeId == null
          ? null
          : Math.floor(Number(dto.venueDealTypeId));
      sets.push(
        `[VenueDealTypeID] = ${id == null || !Number.isFinite(id) || id < 1 ? 'NULL' : id}`,
      );
    }
    if (!sets.length) return;

    await this.dataSource.query(
      `UPDATE dbo.EngagementFinances SET ${sets.join(', ')} WHERE [FinanceID] = ${fid}`,
    );
  }

  // ── Booking tab optional columns (PromoterPartnerContactID, TourManagerContactID,
  //    AttractionContractSharePointLink, PartiallyExecuted…, FullyExecuted…) ──────

  private async engagementFinancesHasBookingColumns(): Promise<boolean> {
    if (this.engagementFinanceBookingColsPresent !== null) {
      return this.engagementFinanceBookingColsPresent;
    }
    try {
      const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'EngagementFinances' AND c.name=N'PromoterPartnerContactID') AND
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'EngagementFinances' AND c.name=N'TourManagerContactID')
        THEN 1 ELSE 0 END AS ok
      `);
      const row0 = (r as Record<string, unknown>[])?.[0];
      const rawOk = row0 ? pickRaw(row0, 'ok') : undefined;
      const ok = rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
      this.engagementFinanceBookingColsPresent = ok;
      return ok;
    } catch {
      this.engagementFinanceBookingColsPresent = false;
      return false;
    }
  }

  private async engagementFinancesHasContractLinkColumns(): Promise<boolean> {
    if (this.engagementFinanceContractLinkColsPresent !== null) {
      return this.engagementFinanceContractLinkColsPresent;
    }
    try {
      const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'EngagementFinances' AND c.name=N'AttractionContractSharePointLink') AND
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'EngagementFinances' AND c.name=N'PartiallyExecutedAttractionContractSharePointLink') AND
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'EngagementFinances' AND c.name=N'FullyExecutedAttractionContractSharePointLink')
        THEN 1 ELSE 0 END AS ok
      `);
      const row0 = (r as Record<string, unknown>[])?.[0];
      const rawOk = row0 ? pickRaw(row0, 'ok') : undefined;
      const ok = rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
      this.engagementFinanceContractLinkColsPresent = ok;
      return ok;
    } catch {
      this.engagementFinanceContractLinkColsPresent = false;
      return false;
    }
  }

  private async mergeFinanceBookingFieldsFromDb(
    financeId: number,
    base: EngagementFinanceRow,
  ): Promise<EngagementFinanceRow> {
    const hasContactCols = await this.engagementFinancesHasBookingColumns();
    const hasLinkCols = await this.engagementFinancesHasContractLinkColumns();
    if (!hasContactCols && !hasLinkCols) return base;
    try {
      const fid = Math.floor(Number(financeId));
      if (!Number.isFinite(fid) || fid < 1) return base;
      const selects: string[] = [];
      const joins: string[] = [];
      if (hasContactCols) {
        selects.push(
          'ef.[PromoterPartnerContactID] AS ppContactId',
          'ef.[TourManagerContactID] AS tmContactId',
          "ppc.FirstName + ' ' + ppc.LastName AS ppContactName",
          "tmc.FirstName + ' ' + tmc.LastName AS tmContactName",
        );
        joins.push(
          'LEFT JOIN dbo.Contact ppc ON ppc.ContactID = ef.[PromoterPartnerContactID]',
          'LEFT JOIN dbo.Contact tmc ON tmc.ContactID = ef.[TourManagerContactID]',
        );
      }
      if (hasLinkCols) {
        selects.push(
          'ef.[AttractionContractSharePointLink] AS acLink',
          'ef.[PartiallyExecutedAttractionContractSharePointLink] AS peLink',
          'ef.[FullyExecutedAttractionContractSharePointLink] AS feLink',
        );
      }
      if (!selects.length) return base;
      const r = await this.dataSource.query(
        `SELECT ${selects.join(', ')} FROM dbo.EngagementFinances ef ${joins.join(' ')} WHERE ef.[FinanceID] = ${fid}`,
      );
      const row0 = (r as Record<string, unknown>[])?.[0];
      if (!row0) return base;
      const merged = { ...base };
      if (hasContactCols) {
        const ppId = pickRaw(row0, 'ppContactId');
        const tmId = pickRaw(row0, 'tmContactId');
        const ppName = pickRaw(row0, 'ppContactName');
        const tmName = pickRaw(row0, 'tmContactName');
        merged.promoterPartnerContactId = ppId == null ? null : Math.trunc(Number(ppId)) || null;
        merged.promoterPartnerContactName = ppName == null || ppName === '' ? null : String(ppName).trim();
        merged.tourManagerContactId = tmId == null ? null : Math.trunc(Number(tmId)) || null;
        merged.tourManagerContactName = tmName == null || tmName === '' ? null : String(tmName).trim();
      }
      if (hasLinkCols) {
        const acLink = pickRaw(row0, 'acLink');
        const peLink = pickRaw(row0, 'peLink');
        const feLink = pickRaw(row0, 'feLink');
        merged.attractionContractSharePointLink = acLink == null || acLink === '' ? null : String(acLink).slice(0, 2048);
        merged.partiallyExecutedAttractionContractSharePointLink = peLink == null || peLink === '' ? null : String(peLink).slice(0, 2048);
        merged.fullyExecutedAttractionContractSharePointLink = feLink == null || feLink === '' ? null : String(feLink).slice(0, 2048);
      }
      return merged;
    } catch {
      return base;
    }
  }

  private async tryPersistFinanceBookingFields(
    financeId: number | null | undefined,
    dto: UpdateEngagementFinanceDto,
  ): Promise<void> {
    const fid = financeId == null ? NaN : Math.floor(Number(financeId));
    if (!Number.isFinite(fid) || fid < 1) return;

    const hasContactCols = await this.engagementFinancesHasBookingColumns();
    const hasLinkCols = await this.engagementFinancesHasContractLinkColumns();
    if (!hasContactCols && !hasLinkCols) return;

    const sets: string[] = [];
    if (hasContactCols) {
      if (dto.promoterPartnerContactId !== undefined) {
        sets.push(`[PromoterPartnerContactID] = ${dto.promoterPartnerContactId == null ? 'NULL' : Math.trunc(Number(dto.promoterPartnerContactId))}`);
      }
      if (dto.tourManagerContactId !== undefined) {
        sets.push(`[TourManagerContactID] = ${dto.tourManagerContactId == null ? 'NULL' : Math.trunc(Number(dto.tourManagerContactId))}`);
      }
    }
    if (hasLinkCols) {
      if (dto.attractionContractSharePointLink !== undefined) {
        const v = dto.attractionContractSharePointLink;
        sets.push(`[AttractionContractSharePointLink] = ${v == null || String(v).trim() === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(v).trim().slice(0, 2048))}`);
      }
      if (dto.partiallyExecutedAttractionContractSharePointLink !== undefined) {
        const v = dto.partiallyExecutedAttractionContractSharePointLink;
        sets.push(`[PartiallyExecutedAttractionContractSharePointLink] = ${v == null || String(v).trim() === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(v).trim().slice(0, 2048))}`);
      }
      if (dto.fullyExecutedAttractionContractSharePointLink !== undefined) {
        const v = dto.fullyExecutedAttractionContractSharePointLink;
        sets.push(`[FullyExecutedAttractionContractSharePointLink] = ${v == null || String(v).trim() === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(v).trim().slice(0, 2048))}`);
      }
    }
    if (!sets.length) return;
    await this.dataSource.query(
      `UPDATE dbo.EngagementFinances SET ${sets.join(', ')} WHERE [FinanceID] = ${fid}`,
    );
  }

  // ── Event Business tab optional columns ─────────────────────────────────

  private async engagementFinancesHasEventBusinessColumns(): Promise<boolean> {
    if (this.engagementFinanceEventBusinessColsPresent !== null) {
      return this.engagementFinanceEventBusinessColsPresent;
    }
    try {
      const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'EngagementFinances' AND c.name=N'EventBusinessManagerContactID') AND
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'EngagementFinances' AND c.name=N'VenueSettlementFileSharePointLink') AND
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'EngagementFinances' AND c.name=N'CompensationRoyaltyAmount')
        THEN 1 ELSE 0 END AS ok
      `);
      const row0 = (r as Record<string, unknown>[])?.[0];
      const rawOk = row0 ? pickRaw(row0, 'ok') : undefined;
      const ok = rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
      this.engagementFinanceEventBusinessColsPresent = ok;
      return ok;
    } catch {
      this.engagementFinanceEventBusinessColsPresent = false;
      return false;
    }
  }

  private async mergeFinanceEventBusinessFieldsFromDb(
    financeId: number,
    base: EngagementFinanceRow,
  ): Promise<EngagementFinanceRow> {
    if (!(await this.engagementFinancesHasEventBusinessColumns())) return base;
    try {
      const fid = Math.floor(Number(financeId));
      if (!Number.isFinite(fid) || fid < 1) return base;
      const r = await this.dataSource.query(`
        SELECT
          ef.[EventBusinessManagerContactID]            AS ebmId,
          ebmc.FirstName + ' ' + ebmc.LastName          AS ebmName,
          ef.[EventBusinessAssistantManagerContactID]   AS ebamId,
          ebamc.FirstName + ' ' + ebamc.LastName        AS ebamName,
          ef.[VenueSettlementContactID]                 AS vscId,
          vscc.FirstName + ' ' + vscc.LastName          AS vscName,
          ef.[VenueSettlementFileSharePointLink]        AS vsLink,
          ef.[PartnerSettlementFileSharePointLink]      AS psLink,
          ef.[SalesTaxRemittedBy]                       AS stRemittedBy,
          ef.[FexVenueAgreementLink]                    AS fexVenueLink,
          ef.[VenueDepositRequired]                     AS venueDeposit,
          ef.[WithholdingPayee]                         AS whPayee,
          ef.[WithholdingPaymentMethod]                 AS whPayMethod,
          ef.[WithholdingFormToAttractionLink]          AS whAttrLink,
          ef.[WithholdingFormToMunicipalityLink]        AS whMuniLink,
          ef.[WithholdingQuickbooksNumber]              AS whQb,
          ef.[WithholdingWaiver]                        AS whWaiver,
          ef.[WithholdingCompletedWaiverLink]           AS whCompleted,
          ef.[TourWaiverLink]                           AS tourWaiver,
          ef.[WithholdingExceptions]                    AS whExceptions,
          ef.[CompensationRoyaltyAmount]                AS compRoyalty,
          ef.[CompensationOverageAmount]                AS compOverage,
          ef.[CompensationBuyouts]                      AS compBuyouts,
          ef.[CompensationDirectCharges]                AS compDirect,
          ef.[CompensationReimbursibles]                AS compReimb,
          ef.[FinanceJob]                               AS finJob
        FROM dbo.EngagementFinances ef
        LEFT JOIN dbo.Contact ebmc  ON ebmc.ContactID  = ef.[EventBusinessManagerContactID]
        LEFT JOIN dbo.Contact ebamc ON ebamc.ContactID = ef.[EventBusinessAssistantManagerContactID]
        LEFT JOIN dbo.Contact vscc  ON vscc.ContactID  = ef.[VenueSettlementContactID]
        WHERE ef.[FinanceID] = ${fid}
      `);
      const row0 = (r as Record<string, unknown>[])?.[0];
      if (!row0) return base;
      const toStr = (k: string, max = 2048): string | null => {
        const v = pickRaw(row0, k);
        return v == null || v === '' ? null : String(v).trim().slice(0, max) || null;
      };
      const toContactId = (k: string): number | null => {
        const v = pickRaw(row0, k);
        return v == null ? null : Math.trunc(Number(v)) || null;
      };
      const toContactName = (k: string): string | null => {
        const v = pickRaw(row0, k);
        return v == null || v === '' ? null : String(v).trim() || null;
      };
      const toNum = (k: string): number | null => {
        const v = pickRaw(row0, k);
        if (v == null) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const toBit = (k: string): boolean | null => {
        const v = pickRaw(row0, k);
        if (v == null) return null;
        return v === 1 || v === true || v === '1' || v === 'true';
      };
      return {
        ...base,
        eventBusinessManagerContactId: toContactId('ebmId'),
        eventBusinessManagerContactName: toContactName('ebmName'),
        eventBusinessAssistantManagerContactId: toContactId('ebamId'),
        eventBusinessAssistantManagerContactName: toContactName('ebamName'),
        venueSettlementContactId: toContactId('vscId'),
        venueSettlementContactName: toContactName('vscName'),
        venueSettlementFileSharePointLink: toStr('vsLink'),
        partnerSettlementFileSharePointLink: toStr('psLink'),
        salesTaxRemittedBy: toStr('stRemittedBy', 100),
        fexVenueAgreementLink: toStr('fexVenueLink'),
        venueDepositRequired: toBit('venueDeposit'),
        withholdingPayee: toStr('whPayee', 255),
        withholdingPaymentMethod: toStr('whPayMethod', 255),
        withholdingFormToAttractionLink: toStr('whAttrLink'),
        withholdingFormToMunicipalityLink: toStr('whMuniLink'),
        withholdingQuickbooksNumber: toStr('whQb', 100),
        withholdingWaiver: toStr('whWaiver', 10),
        withholdingCompletedWaiverLink: toStr('whCompleted'),
        tourWaiverLink: toStr('tourWaiver'),
        withholdingExceptions: toStr('whExceptions', 4000),
        compensationRoyaltyAmount: toNum('compRoyalty'),
        compensationOverageAmount: toNum('compOverage'),
        compensationBuyouts: toNum('compBuyouts'),
        compensationDirectCharges: toNum('compDirect'),
        compensationReimbursibles: toNum('compReimb'),
        financeJob: toStr('finJob', 255),
      };
    } catch {
      return base;
    }
  }

  private async tryPersistFinanceEventBusinessFields(
    financeId: number | null | undefined,
    dto: UpdateEngagementFinanceDto,
  ): Promise<void> {
    const fid = financeId == null ? NaN : Math.floor(Number(financeId));
    if (!Number.isFinite(fid) || fid < 1) return;
    if (!(await this.engagementFinancesHasEventBusinessColumns())) return;

    const sets: string[] = [];
    const intField = (col: string, v: number | null | undefined) => {
      if (v !== undefined) sets.push(`[${col}] = ${v == null ? 'NULL' : Math.trunc(Number(v))}`);
    };
    const strField = (col: string, v: string | null | undefined, max: number) => {
      if (v !== undefined) sets.push(`[${col}] = ${v == null || String(v).trim() === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(v).trim().slice(0, max))}`);
    };
    const numField = (col: string, v: number | null | undefined) => {
      if (v !== undefined) sets.push(`[${col}] = ${v == null ? 'NULL' : Number(v)}`);
    };
    const bitField = (col: string, v: boolean | null | undefined) => {
      if (v !== undefined) sets.push(`[${col}] = ${v == null ? 'NULL' : v ? '1' : '0'}`);
    };
    intField('EventBusinessManagerContactID', dto.eventBusinessManagerContactId);
    intField('EventBusinessAssistantManagerContactID', dto.eventBusinessAssistantManagerContactId);
    intField('VenueSettlementContactID', dto.venueSettlementContactId);
    strField('FexVenueAgreementLink', dto.fexVenueAgreementLink, 2048);
    bitField('VenueDepositRequired', dto.venueDepositRequired);
    strField('WithholdingPayee', dto.withholdingPayee, 255);
    strField('WithholdingPaymentMethod', dto.withholdingPaymentMethod, 255);
    strField('WithholdingFormToAttractionLink', dto.withholdingFormToAttractionLink, 2048);
    strField('WithholdingFormToMunicipalityLink', dto.withholdingFormToMunicipalityLink, 2048);
    strField('WithholdingQuickbooksNumber', dto.withholdingQuickbooksNumber, 100);
    strField('WithholdingWaiver', dto.withholdingWaiver, 10);
    strField('WithholdingCompletedWaiverLink', dto.withholdingCompletedWaiverLink, 2048);
    strField('TourWaiverLink', dto.tourWaiverLink, 2048);
    strField('WithholdingExceptions', dto.withholdingExceptions, 4000);
    numField('CompensationRoyaltyAmount', dto.compensationRoyaltyAmount);
    numField('CompensationOverageAmount', dto.compensationOverageAmount);
    numField('CompensationBuyouts', dto.compensationBuyouts);
    numField('CompensationDirectCharges', dto.compensationDirectCharges);
    numField('CompensationReimbursibles', dto.compensationReimbursibles);
    strField('FinanceJob', dto.financeJob, 255);
    if (!sets.length) return;
    await this.dataSource.query(
      `UPDATE dbo.EngagementFinances SET ${sets.join(', ')} WHERE [FinanceID] = ${fid}`,
    );
    // Separately probed optional columns
    await this.tryPersistFinanceCustomer(fid, dto);
    await this.tryPersistFinancePromoterPartnerCompany(fid, dto);
  }

  // ── Finance Customer optional column ─────────────────────────────────────

  private engagementFinanceCustomerColPresent: boolean | null = null;

  private async engagementFinancesHasCustomerColumn(): Promise<boolean> {
    if (this.engagementFinanceCustomerColPresent !== null)
      return this.engagementFinanceCustomerColPresent;
    try {
      const r = await this.dataSource.query(`
        SELECT CASE WHEN EXISTS (
          SELECT 1 FROM sys.columns c
          INNER JOIN sys.tables t ON c.object_id = t.object_id
          INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
          WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'FinanceCustomer'
        ) THEN 1 ELSE 0 END AS ok`);
      const raw = pickRaw((r as Record<string, unknown>[])?.[0] ?? {}, 'ok');
      this.engagementFinanceCustomerColPresent =
        raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
      return this.engagementFinanceCustomerColPresent;
    } catch {
      this.engagementFinanceCustomerColPresent = false;
      return false;
    }
  }

  private async mergeFinanceCustomerFromDb(
    financeId: number,
    base: EngagementFinanceRow,
  ): Promise<EngagementFinanceRow> {
    if (!(await this.engagementFinancesHasCustomerColumn())) return base;
    try {
      const fid = Math.floor(Number(financeId));
      if (!Number.isFinite(fid) || fid < 1) return base;
      const r = await this.dataSource.query(
        `SELECT [FinanceCustomer] AS fc FROM dbo.EngagementFinances WHERE [FinanceID] = ${fid}`,
      );
      const row0 = (r as Record<string, unknown>[])?.[0];
      if (!row0) return base;
      const fc = pickRaw(row0, 'fc');
      return {
        ...base,
        financeCustomer: fc == null || fc === '' ? null : String(fc).trim().slice(0, 255) || null,
      };
    } catch {
      return base;
    }
  }

  private async tryPersistFinanceCustomer(
    financeId: number,
    dto: UpdateEngagementFinanceDto,
  ): Promise<void> {
    if (dto.financeCustomer === undefined) return;
    if (!(await this.engagementFinancesHasCustomerColumn())) return;
    const fid = Math.floor(Number(financeId));
    if (!Number.isFinite(fid) || fid < 1) return;
    const val =
      dto.financeCustomer == null || String(dto.financeCustomer).trim() === ''
        ? 'NULL'
        : this.escapeSqlNVarCharLiteral(String(dto.financeCustomer).trim().slice(0, 255));
    await this.dataSource.query(
      `UPDATE dbo.EngagementFinances SET [FinanceCustomer] = ${val} WHERE [FinanceID] = ${fid}`,
    );
  }

  // ── PromoterPartnerCompanyID optional column ────────────────────────────

  private engagementFinancePromoterPartnerCompanyColPresent: boolean | null = null;

  private async engagementFinancesHasPromoterPartnerCompanyColumn(): Promise<boolean> {
    if (this.engagementFinancePromoterPartnerCompanyColPresent !== null)
      return this.engagementFinancePromoterPartnerCompanyColPresent;
    try {
      const r = await this.dataSource.query(`
        SELECT CASE WHEN EXISTS (
          SELECT 1 FROM sys.columns c
          INNER JOIN sys.tables t ON c.object_id = t.object_id
          INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
          WHERE s.name = N'dbo' AND t.name = N'EngagementFinances' AND c.name = N'PromoterPartnerCompanyID'
        ) THEN 1 ELSE 0 END AS ok`);
      const raw = pickRaw((r as Record<string, unknown>[])?.[0] ?? {}, 'ok');
      this.engagementFinancePromoterPartnerCompanyColPresent =
        raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
      return this.engagementFinancePromoterPartnerCompanyColPresent;
    } catch {
      this.engagementFinancePromoterPartnerCompanyColPresent = false;
      return false;
    }
  }

  private async mergeFinancePromoterPartnerCompanyFromDb(
    financeId: number,
    base: EngagementFinanceRow,
  ): Promise<EngagementFinanceRow> {
    if (!(await this.engagementFinancesHasPromoterPartnerCompanyColumn())) return base;
    try {
      const fid = Math.floor(Number(financeId));
      if (!Number.isFinite(fid) || fid < 1) return base;
      const r = await this.dataSource.query(
        `SELECT ef.[PromoterPartnerCompanyID] AS cid, c.CompanyName AS cname
         FROM dbo.EngagementFinances ef
         LEFT JOIN dbo.Company c ON c.CompanyID = ef.[PromoterPartnerCompanyID]
         WHERE ef.[FinanceID] = ${fid}`,
      );
      const row0 = (r as Record<string, unknown>[])?.[0];
      if (!row0) return base;
      const cid = pickRaw(row0, 'cid');
      const cname = pickRaw(row0, 'cname');
      return {
        ...base,
        promoterPartnerCompanyId: cid == null ? null : Math.trunc(Number(cid)) || null,
        promoterPartnerCompanyName: cname == null || cname === '' ? null : String(cname).trim() || null,
      };
    } catch {
      return base;
    }
  }

  private async tryPersistFinancePromoterPartnerCompany(
    financeId: number,
    dto: UpdateEngagementFinanceDto,
  ): Promise<void> {
    if (dto.promoterPartnerCompanyId === undefined) return;
    if (!(await this.engagementFinancesHasPromoterPartnerCompanyColumn())) return;
    const fid = Math.floor(Number(financeId));
    if (!Number.isFinite(fid) || fid < 1) return;
    const val =
      dto.promoterPartnerCompanyId == null
        ? 'NULL'
        : Math.trunc(Number(dto.promoterPartnerCompanyId));
    await this.dataSource.query(
      `UPDATE dbo.EngagementFinances SET [PromoterPartnerCompanyID] = ${val} WHERE [FinanceID] = ${fid}`,
    );
  }

  private async engagementProductionHasTimeColumns(): Promise<boolean> {
    if (this.engagementProductionTimeColsPresent !== null) {
      return this.engagementProductionTimeColsPresent;
    }
    try {
      const r = await this.dataSource.query(
        `
        SELECT CASE WHEN
          EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'EngagementProduction' AND c.name = N'RehearsalTime'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'EngagementProduction' AND c.name = N'LoadInTime'
          )
        THEN 1 ELSE 0 END AS ok
      `,
      );
      const row0 = (r as Record<string, unknown>[])?.[0];
      const rawOk = row0 ? pickRaw(row0, 'ok') : undefined;
      const ok =
        rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
      this.engagementProductionTimeColsPresent = ok;
      return ok;
    } catch {
      this.engagementProductionTimeColsPresent = false;
      return false;
    }
  }

  private normalizeTicketingAdmin(
    value: unknown,
  ): 'Venue' | 'Partner' | 'IAE Contract' | null {
    const t = String(value ?? '').trim().toLowerCase();
    if (!t) return null;
    if (t === 'venue') return 'Venue';
    if (t === 'partner') return 'Partner';
    if (t === 'iae contract') return 'IAE Contract';
    return null;
  }

  private normalizeTicketingPick(
    value: unknown,
    a: string,
    b: string,
  ): string | null {
    const t = String(value ?? '').trim().toLowerCase();
    if (!t) return null;
    if (t === a.toLowerCase()) return a;
    if (t === b.toLowerCase()) return b;
    return null;
  }

  private async performanceTicketingHasAdvancedColumns(): Promise<boolean> {
    if (this.performanceTicketingAdvancedColsPresent !== null) {
      return this.performanceTicketingAdvancedColsPresent;
    }
    try {
      const r = await this.dataSource.query(
        `
        SELECT CASE WHEN
          EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'SellableCapacity'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'GrossPotentialRevenue'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'TicketingCompanyID'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'TicketingAdministrator'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'BoxOfficeLaborRequired'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'FacilityFeePlacement'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'FacilityFeeAmount'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'DynamicPricingType'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'ServiceChargeRebateAmount'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'ServiceChargeBumpAmount'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'CreditCardFeePlacement'
          ) AND EXISTS (
            SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = N'dbo' AND t.name = N'PerformanceTicketing' AND c.name = N'CreditCardFeePercent'
          )
        THEN 1 ELSE 0 END AS ok
      `,
      );
      const row0 = (r as Record<string, unknown>[])?.[0];
      const rawOk = row0 ? pickRaw(row0, 'ok') : undefined;
      const ok =
        rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
      this.performanceTicketingAdvancedColsPresent = ok;
      return ok;
    } catch {
      this.performanceTicketingAdvancedColsPresent = false;
      return false;
    }
  }

  private async performanceTicketingHasExtendedColumns(): Promise<boolean> {
    if (this.performanceTicketingExtendedColsPresent !== null) {
      return this.performanceTicketingExtendedColsPresent;
    }
    try {
      const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'PerformanceTicketing' AND c.name=N'TicketingAdminContactID') AND
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'PerformanceTicketing' AND c.name=N'TicketingAdminCompanyID') AND
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'PerformanceTicketing' AND c.name=N'PublicSaleLinkID') AND
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'PerformanceTicketing' AND c.name=N'IsIAETMDeal') AND
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'PerformanceTicketing' AND c.name=N'PreSaleEndDate')
        THEN 1 ELSE 0 END AS ok
      `);
      const row0 = (r as Record<string, unknown>[])?.[0];
      const rawOk = row0 ? pickRaw(row0, 'ok') : undefined;
      const ok = rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
      this.performanceTicketingExtendedColsPresent = ok;
      return ok;
    } catch {
      this.performanceTicketingExtendedColsPresent = false;
      return false;
    }
  }

  private async performanceTicketingHasPasswordColumns(): Promise<boolean> {
    if (this.performanceTicketingPasswordColsPresent !== null) {
      return this.performanceTicketingPasswordColsPresent;
    }
    try {
      const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.tables t INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'PerformancePromoPassword')
        THEN 1 ELSE 0 END AS ok
      `);
      const row0 = (r as Record<string, unknown>[])?.[0];
      const rawOk = row0 ? pickRaw(row0, 'ok') : undefined;
      const ok = rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
      this.performanceTicketingPasswordColsPresent = ok;
      return ok;
    } catch {
      this.performanceTicketingPasswordColsPresent = false;
      return false;
    }
  }

  private async engagementFinancesHasIaeTicketingManagerCol(): Promise<boolean> {
    if (this.engagementFinancesIaeTicketingManagerColPresent !== null) {
      return this.engagementFinancesIaeTicketingManagerColPresent;
    }
    try {
      const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c INNER JOIN sys.tables t ON c.object_id=t.object_id INNER JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name=N'dbo' AND t.name=N'EngagementFinances' AND c.name=N'IAETicketingManagerContactID')
        THEN 1 ELSE 0 END AS ok
      `);
      const row0 = (r as Record<string, unknown>[])?.[0];
      const rawOk = row0 ? pickRaw(row0, 'ok') : undefined;
      const ok = rawOk === 1 || rawOk === true || rawOk === '1' || Number(rawOk) === 1;
      this.engagementFinancesIaeTicketingManagerColPresent = ok;
      return ok;
    } catch {
      this.engagementFinancesIaeTicketingManagerColPresent = false;
      return false;
    }
  }

  private async mergePerformanceTicketingAdvancedFromDb(
    ticketingId: number,
    base: PerformanceTicketingRow,
  ): Promise<PerformanceTicketingRow> {
    if (!(await this.performanceTicketingHasAdvancedColumns())) return base;
    try {
      const tid = Math.floor(Number(ticketingId));
      if (!Number.isFinite(tid) || tid < 1) return base;
      const r = await this.dataSource.query(
        `SELECT
          [SellableCapacity] AS sc,
          [GrossPotentialRevenue] AS gpr,
          [TicketingCompanyID] AS tsc,
          [TicketingAdministrator] AS ta,
          [BoxOfficeLaborRequired] AS bol,
          [FacilityFeePlacement] AS fft,
          [FacilityFeeAmount] AS ffa,
          [DynamicPricingType] AS dpm,
          [ServiceChargeRebateAmount] AS ra,
          [ServiceChargeBumpAmount] AS ba,
          [CreditCardFeePlacement] AS ccft,
          [CreditCardFeePercent] AS ccfap,
          [CompTicketForm] AS ctf,
          [CompTicketExcelSheet] AS ctes
         FROM dbo.PerformanceTicketing WHERE [TicketingID] = ${tid}`,
      );
      const row0 = (r as Record<string, unknown>[])?.[0];
      if (!row0) return base;
      const sc = pickRaw(row0, 'sc');
      const tsc = pickRaw(row0, 'tsc');
      const merged: PerformanceTicketingRow = {
        ...base,
        sellableCapacity:
          sc == null || sc === '' ? null : Number.isFinite(Number(sc)) ? Math.trunc(Number(sc)) : null,
        grossPotentialRevenue: this.mapFinanceNumber(
          pickRaw(row0, 'gpr') as string | number | null | undefined,
        ),
        ticketingSystemCompanyId:
          tsc == null || tsc === ''
            ? null
            : Number.isFinite(Number(tsc))
              ? Math.trunc(Number(tsc))
              : null,
        ticketingAdministrator: this.normalizeTicketingAdmin(pickRaw(row0, 'ta')),
        boxOfficeLaborStaffingRequired: this.mapBit(
          pickRaw(row0, 'bol') as boolean | number | Buffer | null | undefined,
        ),
        facilityFeeType: this.normalizeTicketingPick(
          pickRaw(row0, 'fft'),
          'Inside Face Value',
          'Outside Face Value',
        ) as 'Inside Face Value' | 'Outside Face Value' | null,
        facilityFeeAmount: this.mapFinanceNumber(
          pickRaw(row0, 'ffa') as string | number | null | undefined,
        ),
        dynamicPricingMode: this.normalizeTicketingPick(
          pickRaw(row0, 'dpm'),
          'Self Managed',
          '3rd Party Managed',
        ) as 'Self Managed' | '3rd Party Managed' | null,
        serviceChargeRevenueShare: null,
        rebateAmount: this.mapFinanceNumber(
          pickRaw(row0, 'ra') as string | number | null | undefined,
        ),
        bumpAmount: this.mapFinanceNumber(
          pickRaw(row0, 'ba') as string | number | null | undefined,
        ),
        creditCardFeesType: this.normalizeTicketingPick(
          pickRaw(row0, 'ccft'),
          'Inside Service Charge',
          'Budget Line Item',
        ) as 'Inside Service Charge' | 'Budget Line Item' | null,
        creditCardFeesAmountPercent: this.mapFinanceNumber(
          pickRaw(row0, 'ccfap') as string | number | null | undefined,
        ),
        compTicketForm: pickRaw(row0, 'ctf') != null && pickRaw(row0, 'ctf') !== '' ? String(pickRaw(row0, 'ctf')).trim() : null,
        compTicketExcelSheet: pickRaw(row0, 'ctes') != null && pickRaw(row0, 'ctes') !== '' ? String(pickRaw(row0, 'ctes')).trim() : null,
        salesTaxType: null,
        salesTaxAmountPercent: null,
      };
      return this.mergePerformanceTicketingExtendedFromDb(
        ticketingId,
        await this.mergePerformanceTicketingPasswordFromDb(ticketingId, merged),
      );
    } catch {
      return base;
    }
  }

  private async mergePerformanceTicketingExtendedFromDb(
    ticketingId: number,
    base: PerformanceTicketingRow,
  ): Promise<PerformanceTicketingRow> {
    if (!(await this.performanceTicketingHasExtendedColumns())) return base;
    try {
      const tid = Math.floor(Number(ticketingId));
      if (!Number.isFinite(tid) || tid < 1) return base;
      const r = await this.dataSource.query(
        `SELECT
          [TicketingAdminContactID] AS tacid,
          [TicketingAdminCompanyID] AS taccid,
          [PublicSaleLinkID] AS pslid,
          [IsIAETMDeal] AS iatm,
          CONVERT(varchar(10), [PreSaleEndDate], 120) AS psed,
          CONVERT(varchar(10), [PreSaleRegistrationStartDate], 120) AS psrsd,
          CONVERT(varchar(10), [PreSaleRegistrationEndDate], 120) AS psred
         FROM dbo.PerformanceTicketing WHERE [TicketingID] = ${tid}`,
      );
      const row0 = (r as Record<string, unknown>[])?.[0];
      if (!row0) return base;
      const tacid = pickRaw(row0, 'tacid');
      const taccid = pickRaw(row0, 'taccid');
      const pslid = pickRaw(row0, 'pslid');
      const taContactId = tacid != null && tacid !== '' && Number.isFinite(Number(tacid)) ? Math.trunc(Number(tacid)) : null;
      const taCompanyId = taccid != null && taccid !== '' && Number.isFinite(Number(taccid)) ? Math.trunc(Number(taccid)) : null;
      const pubSaleLinkId = pslid != null && pslid !== '' && Number.isFinite(Number(pslid)) ? Math.trunc(Number(pslid)) : null;
      const [taContactName, taCompanyName, pubSaleLinkUrl] = await Promise.all([
        this.lookupContactName(taContactId),
        taCompanyId != null ? this.lookupCompanyName(taCompanyId) : Promise.resolve(null),
        pubSaleLinkId != null
          ? this.linkRepo.findOne({ where: { linkId: pubSaleLinkId } }).then((l) => l?.linkUrl ?? null)
          : Promise.resolve(null),
      ]);
      const psed = pickRaw(row0, 'psed');
      const psrsd = pickRaw(row0, 'psrsd');
      const psred = pickRaw(row0, 'psred');
      return {
        ...base,
        ticketingAdminContactId: taContactId,
        ticketingAdminContactName: taContactName,
        ticketingAdminCompanyId: taCompanyId,
        ticketingAdminCompanyName: taCompanyName,
        publicSaleLinkId: pubSaleLinkId,
        publicSaleLinkUrl: pubSaleLinkUrl,
        preSaleEndDate: psed != null && psed !== '' ? String(psed).slice(0, 10) : null,
        preSaleRegistrationStartDate: psrsd != null && psrsd !== '' ? String(psrsd).slice(0, 10) : null,
        preSaleRegistrationEndDate: psred != null && psred !== '' ? String(psred).slice(0, 10) : null,
        isIAETMDeal: this.mapBit(pickRaw(row0, 'iatm') as boolean | number | Buffer | null | undefined),
      };
    } catch {
      return base;
    }
  }

  private async mergePerformanceTicketingPasswordFromDb(
    ticketingId: number,
    base: PerformanceTicketingRow,
  ): Promise<PerformanceTicketingRow> {
    if (!(await this.performanceTicketingHasPasswordColumns())) return base;
    try {
      const pid = base.performanceId;
      if (!Number.isFinite(pid) || pid < 1) return base;

      // Read promo passwords from PerformancePromoPassword table
      const pwRows = await this.dataSource.query(
        `SELECT
          [PasswordType] AS ptype,
          [Password] AS pw,
          CONVERT(varchar(10),[ActiveDateStart],120) AS ds,
          CONVERT(varchar(10),[ActiveDateEnd],120) AS de,
          [DiscountType] AS dt,
          [DiscountAmount] AS da
         FROM dbo.PerformancePromoPassword WHERE [PerformanceID] = ${pid}`,
      ) as Record<string, unknown>[];

      const strOrNull = (v: unknown) => v == null || v === '' ? null : String(v).trim();
      const dateOrNull = (v: unknown) => v == null || v === '' ? null : String(v).slice(0, 10);

      let presalePassword: string | null = null;
      let presalePasswordDateStart: string | null = null;
      let presalePasswordDateEnd: string | null = null;
      let presaleSpecialPricePassword: string | null = null;
      let presaleSpecialPricePasswordDateStart: string | null = null;
      let presaleSpecialPricePasswordDateEnd: string | null = null;
      let presaleSpecialPriceDiscountType: string | null = null;
      let presaleSpecialPriceDiscountAmount: number | null = null;
      let publicSaleSpecialPricePassword: string | null = null;
      let publicSaleSpecialPricePasswordDateStart: string | null = null;
      let publicSaleSpecialPricePasswordDateEnd: string | null = null;
      let publicSaleSpecialPriceDiscountType: string | null = null;
      let publicSaleSpecialPriceDiscountAmount: number | null = null;

      for (const row of pwRows) {
        const ptype = strOrNull(pickRaw(row, 'ptype'))?.toLowerCase();
        if (ptype === 'presale') {
          presalePassword = strOrNull(pickRaw(row, 'pw'));
          presalePasswordDateStart = dateOrNull(pickRaw(row, 'ds'));
          presalePasswordDateEnd = dateOrNull(pickRaw(row, 'de'));
        } else if (ptype === 'presalespecialprice') {
          presaleSpecialPricePassword = strOrNull(pickRaw(row, 'pw'));
          presaleSpecialPricePasswordDateStart = dateOrNull(pickRaw(row, 'ds'));
          presaleSpecialPricePasswordDateEnd = dateOrNull(pickRaw(row, 'de'));
          presaleSpecialPriceDiscountType = strOrNull(pickRaw(row, 'dt'));
          presaleSpecialPriceDiscountAmount = this.mapFinanceNumber(pickRaw(row, 'da') as string | number | null | undefined);
        } else if (ptype === 'publicsalespecialprice') {
          publicSaleSpecialPricePassword = strOrNull(pickRaw(row, 'pw'));
          publicSaleSpecialPricePasswordDateStart = dateOrNull(pickRaw(row, 'ds'));
          publicSaleSpecialPricePasswordDateEnd = dateOrNull(pickRaw(row, 'de'));
          publicSaleSpecialPriceDiscountType = strOrNull(pickRaw(row, 'dt'));
          publicSaleSpecialPriceDiscountAmount = this.mapFinanceNumber(pickRaw(row, 'da') as string | number | null | undefined);
        }
      }

      // Read VIP Package from VIPPackage + VIPPackageBenefit tables
      let vipPackageOffered: boolean | null = null;
      let vipPackageName: string | null = null;
      let vipPackageBenefits: string[] | null = null;

      const vipRows = await this.dataSource.query(
        `SELECT [VIPPackageID] AS vpid, [IsOffered] AS iso, [PackageName] AS pn
         FROM dbo.VIPPackage WHERE [PerformanceID] = ${pid}`,
      ) as Record<string, unknown>[];

      if (vipRows.length > 0) {
        const vipRow = vipRows[0]!;
        vipPackageOffered = this.mapBit(pickRaw(vipRow, 'iso') as boolean | number | Buffer | null | undefined);
        vipPackageName = strOrNull(pickRaw(vipRow, 'pn'));
        const vpid = pickRaw(vipRow, 'vpid');
        if (vpid != null && Number.isFinite(Number(vpid))) {
          const benefitRows = await this.dataSource.query(
            `SELECT [VIPBenefitID] AS bid FROM dbo.VIPPackageBenefit WHERE [VIPPackageID] = ${Math.trunc(Number(vpid))}`,
          ) as Record<string, unknown>[];
          if (benefitRows.length > 0) {
            vipPackageBenefits = benefitRows.map((br) => String(pickRaw(br, 'bid')));
          }
        }
      }

      return {
        ...base,
        presalePassword,
        presalePasswordDateStart,
        presalePasswordDateEnd,
        presaleSpecialPricePassword,
        presaleSpecialPricePasswordDateStart,
        presaleSpecialPricePasswordDateEnd,
        presaleSpecialPriceDiscountType,
        presaleSpecialPriceDiscountAmount,
        publicSaleSpecialPricePassword,
        publicSaleSpecialPricePasswordDateStart,
        publicSaleSpecialPricePasswordDateEnd,
        publicSaleSpecialPriceDiscountType,
        publicSaleSpecialPriceDiscountAmount,
        vipPackageOffered,
        vipPackageName,
        vipPackageBenefits,
        compTicketForm: null,
        compTicketExcelSheet: null,
      };
    } catch {
      return base;
    }
  }

  private async tryPersistPerformanceTicketingAdvanced(
    ticketingId: number | null | undefined,
    dto: UpdatePerformanceTicketingDto,
    performanceId?: number,
  ): Promise<void> {
    const tid = ticketingId == null ? NaN : Math.floor(Number(ticketingId));
    if (!Number.isFinite(tid) || tid < 1) return;
    if (!(await this.performanceTicketingHasAdvancedColumns())) return;

    const sets: string[] = [];
    if (dto.sellableCapacity !== undefined) {
      sets.push(
        `[SellableCapacity] = ${dto.sellableCapacity == null ? 'NULL' : Math.trunc(Number(dto.sellableCapacity))}`,
      );
    }
    if (dto.grossPotentialRevenue !== undefined) {
      sets.push(
        `[GrossPotentialRevenue] = ${dto.grossPotentialRevenue == null ? 'NULL' : Number(dto.grossPotentialRevenue)}`,
      );
    }
    if (dto.ticketingSystemCompanyId !== undefined) {
      sets.push(
        `[TicketingCompanyID] = ${dto.ticketingSystemCompanyId == null ? 'NULL' : Math.trunc(Number(dto.ticketingSystemCompanyId))}`,
      );
    }
    if (dto.ticketingAdministrator !== undefined) {
      const v = this.normalizeTicketingAdmin(dto.ticketingAdministrator);
      sets.push(
        `[TicketingAdministrator] = ${v == null ? 'NULL' : this.escapeSqlNVarCharLiteral(v)}`,
      );
    }
    if (dto.boxOfficeLaborStaffingRequired !== undefined) {
      sets.push(
        `[BoxOfficeLaborRequired] = ${dto.boxOfficeLaborStaffingRequired == null ? 'NULL' : dto.boxOfficeLaborStaffingRequired ? 1 : 0}`,
      );
    }
    if (dto.facilityFeeType !== undefined) {
      const v = this.normalizeTicketingPick(
        dto.facilityFeeType,
        'Inside Face Value',
        'Outside Face Value',
      );
      sets.push(
        `[FacilityFeePlacement] = ${v == null ? 'NULL' : this.escapeSqlNVarCharLiteral(v)}`,
      );
    }
    if (dto.facilityFeeAmount !== undefined) {
      sets.push(
        `[FacilityFeeAmount] = ${dto.facilityFeeAmount == null ? 'NULL' : Number(dto.facilityFeeAmount)}`,
      );
    }
    if (dto.dynamicPricingMode !== undefined) {
      const v = this.normalizeTicketingPick(
        dto.dynamicPricingMode,
        'Self Managed',
        '3rd Party Managed',
      );
      sets.push(
        `[DynamicPricingType] = ${v == null ? 'NULL' : this.escapeSqlNVarCharLiteral(v)}`,
      );
    }
    if (dto.rebateAmount !== undefined) {
      sets.push(
        `[ServiceChargeRebateAmount] = ${dto.rebateAmount == null ? 'NULL' : Number(dto.rebateAmount)}`,
      );
    }
    if (dto.bumpAmount !== undefined) {
      sets.push(
        `[ServiceChargeBumpAmount] = ${dto.bumpAmount == null ? 'NULL' : Number(dto.bumpAmount)}`,
      );
    }
    if (dto.creditCardFeesType !== undefined) {
      const v = this.normalizeTicketingPick(
        dto.creditCardFeesType,
        'Inside Service Charge',
        'Budget Line Item',
      );
      sets.push(
        `[CreditCardFeePlacement] = ${v == null ? 'NULL' : this.escapeSqlNVarCharLiteral(v)}`,
      );
    }
    if (dto.creditCardFeesAmountPercent !== undefined) {
      sets.push(
        `[CreditCardFeePercent] = ${dto.creditCardFeesAmountPercent == null ? 'NULL' : Number(dto.creditCardFeesAmountPercent)}`,
      );
    }
    if (dto.compTicketForm !== undefined) {
      sets.push(
        `[CompTicketForm] = ${dto.compTicketForm == null ? 'NULL' : this.escapeSqlNVarCharLiteral(String(dto.compTicketForm).trim())}`,
      );
    }
    if (dto.compTicketExcelSheet !== undefined) {
      sets.push(
        `[CompTicketExcelSheet] = ${dto.compTicketExcelSheet == null ? 'NULL' : this.escapeSqlNVarCharLiteral(String(dto.compTicketExcelSheet).trim())}`,
      );
    }

    if (sets.length) {
      await this.dataSource.query(
        `UPDATE dbo.PerformanceTicketing SET ${sets.join(', ')} WHERE [TicketingID] = ${tid}`,
      );
    }
    await Promise.all([
      this.tryPersistPerformanceTicketingExtended(tid, dto),
      this.tryPersistPerformanceTicketingPassword(tid, dto, performanceId),
    ]);
  }

  private async tryPersistPerformanceTicketingExtended(
    ticketingId: number,
    dto: UpdatePerformanceTicketingDto,
  ): Promise<void> {
    if (!(await this.performanceTicketingHasExtendedColumns())) return;
    const sets: string[] = [];
    if (dto.ticketingAdminContactId !== undefined) {
      sets.push(`[TicketingAdminContactID] = ${dto.ticketingAdminContactId == null ? 'NULL' : Math.trunc(Number(dto.ticketingAdminContactId))}`);
    }
    if (dto.ticketingAdminCompanyId !== undefined) {
      sets.push(`[TicketingAdminCompanyID] = ${dto.ticketingAdminCompanyId == null ? 'NULL' : Math.trunc(Number(dto.ticketingAdminCompanyId))}`);
    }
    if (dto.publicSaleLinkUrl !== undefined) {
      if (dto.publicSaleLinkUrl == null || String(dto.publicSaleLinkUrl).trim() === '') {
        sets.push(`[PublicSaleLinkID] = NULL`);
      } else {
        const urlVal = String(dto.publicSaleLinkUrl).trim().slice(0, 2048);
        const escaped = this.escapeSqlNVarCharLiteral(urlVal);
        const linkR = await this.dataSource.query(
          `DECLARE @lnkId INT;
           SELECT @lnkId = [LinkID] FROM dbo.Link WHERE [LinkURL] = ${escaped};
           IF @lnkId IS NULL
           BEGIN INSERT INTO dbo.Link ([LinkType], [LinkURL], [LinkName], [LinkPath]) VALUES (N'URL', ${escaped}, N'Public Sale Link', ${escaped}); SET @lnkId = SCOPE_IDENTITY(); END
           UPDATE dbo.PerformanceTicketing SET [PublicSaleLinkID] = @lnkId WHERE [TicketingID] = ${ticketingId};
           SELECT @lnkId AS lid`,
        );
        // PublicSaleLinkID already updated in the SQL above — no need to add to sets
      }
    }
    if (dto.preSaleEndDate !== undefined) {
      sets.push(`[PreSaleEndDate] = ${dto.preSaleEndDate == null || dto.preSaleEndDate === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(dto.preSaleEndDate).slice(0, 10))}`);
    }
    if (dto.preSaleRegistrationStartDate !== undefined) {
      sets.push(`[PreSaleRegistrationStartDate] = ${dto.preSaleRegistrationStartDate == null || dto.preSaleRegistrationStartDate === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(dto.preSaleRegistrationStartDate).slice(0, 10))}`);
    }
    if (dto.preSaleRegistrationEndDate !== undefined) {
      sets.push(`[PreSaleRegistrationEndDate] = ${dto.preSaleRegistrationEndDate == null || dto.preSaleRegistrationEndDate === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(dto.preSaleRegistrationEndDate).slice(0, 10))}`);
    }
    if (dto.isIAETMDeal !== undefined) {
      sets.push(`[IsIAETMDeal] = ${dto.isIAETMDeal == null ? 'NULL' : dto.isIAETMDeal ? 1 : 0}`);
    }
    if (!sets.length) return;
    await this.dataSource.query(
      `UPDATE dbo.PerformanceTicketing SET ${sets.join(', ')} WHERE [TicketingID] = ${ticketingId}`,
    );
  }

  private async tryPersistPerformanceTicketingPassword(
    ticketingId: number,
    dto: UpdatePerformanceTicketingDto,
    performanceId?: number,
  ): Promise<void> {
    if (!(await this.performanceTicketingHasPasswordColumns())) return;
    const pid = performanceId ?? (ticketingId > 0 ? await this.getPerformanceIdFromTicketingId(ticketingId) : null);
    if (pid == null || !Number.isFinite(pid) || pid < 1) return;

    // --- Promo Passwords: upsert into PerformancePromoPassword ---
    const upsertPromoPassword = async (
      passwordType: string,
      password: string | null | undefined,
      dateStart: string | null | undefined,
      dateEnd: string | null | undefined,
      discountType?: string | null | undefined,
      discountAmount?: number | null | undefined,
    ) => {
      if (password === undefined && dateStart === undefined && dateEnd === undefined && discountType === undefined && discountAmount === undefined) return;
      const escapedType = this.escapeSqlNVarCharLiteral(passwordType);

      // If password is being cleared, delete the row (Password column is NOT NULL)
      if (password === null || password === '') {
        await this.dataSource.query(
          `DELETE FROM dbo.PerformancePromoPassword WHERE [PerformanceID] = ${pid} AND [PasswordType] = ${escapedType}`,
        );
        return;
      }

      const pwSql = this.escapeSqlNVarCharLiteral(String(password).slice(0, 500));
      const dsSql = dateStart == null || dateStart === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(dateStart).slice(0, 10));
      const deSql = dateEnd == null || dateEnd === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(dateEnd).slice(0, 10));
      const dtSql = discountType == null || discountType === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(discountType).slice(0, 10));
      const daSql = discountAmount == null ? 'NULL' : String(Number(discountAmount));
      await this.dataSource.query(
        `IF EXISTS (SELECT 1 FROM dbo.PerformancePromoPassword WHERE [PerformanceID] = ${pid} AND [PasswordType] = ${escapedType})
           UPDATE dbo.PerformancePromoPassword SET [Password] = ${pwSql}, [ActiveDateStart] = ${dsSql}, [ActiveDateEnd] = ${deSql}, [DiscountType] = ${dtSql}, [DiscountAmount] = ${daSql} WHERE [PerformanceID] = ${pid} AND [PasswordType] = ${escapedType}
         ELSE
           INSERT INTO dbo.PerformancePromoPassword ([PerformanceID],[PasswordType],[Password],[ActiveDateStart],[ActiveDateEnd],[DiscountType],[DiscountAmount]) VALUES (${pid}, ${escapedType}, ${pwSql}, ${dsSql}, ${deSql}, ${dtSql}, ${daSql})`,
      );
    };

    await Promise.all([
      upsertPromoPassword('PreSale', dto.presalePassword, dto.presalePasswordDateStart, dto.presalePasswordDateEnd),
      upsertPromoPassword('PreSaleSpecialPrice', dto.presaleSpecialPricePassword, dto.presaleSpecialPricePasswordDateStart, dto.presaleSpecialPricePasswordDateEnd, dto.presaleSpecialPriceDiscountType, dto.presaleSpecialPriceDiscountAmount),
      upsertPromoPassword('PublicSaleSpecialPrice', dto.publicSaleSpecialPricePassword, dto.publicSaleSpecialPricePasswordDateStart, dto.publicSaleSpecialPricePasswordDateEnd, dto.publicSaleSpecialPriceDiscountType, dto.publicSaleSpecialPriceDiscountAmount),
    ]);

    // --- VIP Package: upsert into VIPPackage + VIPPackageBenefit ---
    if (dto.vipPackageOffered !== undefined || dto.vipPackageName !== undefined || dto.vipPackageBenefits !== undefined) {
      const offeredSql = dto.vipPackageOffered == null ? '0' : dto.vipPackageOffered ? '1' : '0';
      const nameSql = dto.vipPackageName == null || dto.vipPackageName === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(dto.vipPackageName).slice(0, 255));

      const vpResult = await this.dataSource.query(
        `DECLARE @vpid INT;
         SELECT @vpid = [VIPPackageID] FROM dbo.VIPPackage WHERE [PerformanceID] = ${pid};
         IF @vpid IS NULL
         BEGIN INSERT INTO dbo.VIPPackage ([PerformanceID],[IsOffered],[PackageName]) VALUES (${pid}, ${offeredSql}, ${nameSql}); SET @vpid = SCOPE_IDENTITY(); END
         ELSE
         BEGIN UPDATE dbo.VIPPackage SET [IsOffered] = ${offeredSql}, [PackageName] = ${nameSql} WHERE [VIPPackageID] = @vpid; END
         SELECT @vpid AS vpid`,
      );
      const vpid = pickRaw((vpResult as Record<string, unknown>[])?.[0] ?? {}, 'vpid');

      if (dto.vipPackageBenefits !== undefined && vpid != null && Number.isFinite(Number(vpid))) {
        const vipPkgId = Math.trunc(Number(vpid));
        await this.dataSource.query(`DELETE FROM dbo.VIPPackageBenefit WHERE [VIPPackageID] = ${vipPkgId}`);
        if (Array.isArray(dto.vipPackageBenefits) && dto.vipPackageBenefits.length > 0) {
          const values = dto.vipPackageBenefits
            .filter((b) => b != null && String(b).trim() !== '' && Number.isFinite(Number(b)))
            .map((b) => `(${vipPkgId}, ${Math.trunc(Number(b))})`)
            .filter((_, i, arr) => arr.indexOf(_) === i);
          if (values.length > 0) {
            await this.dataSource.query(
              `INSERT INTO dbo.VIPPackageBenefit ([VIPPackageID],[VIPBenefitID]) VALUES ${values.join(', ')}`,
            );
          }
        }
      }
    }
  }

  private async getPerformanceIdFromTicketingId(ticketingId: number): Promise<number | null> {
    try {
      const r = await this.dataSource.query(
        `SELECT [PerformanceID] AS pid FROM dbo.PerformanceTicketing WHERE [TicketingID] = ${Math.trunc(ticketingId)}`,
      );
      const row0 = (r as Record<string, unknown>[])?.[0];
      const pid = row0 ? pickRaw(row0, 'pid') : null;
      return pid != null && Number.isFinite(Number(pid)) ? Math.trunc(Number(pid)) : null;
    } catch {
      return null;
    }
  }

  private async mergeEngagementProductionTimesFromDb(
    engagementId: number,
    base: EngagementListRow,
  ): Promise<EngagementListRow> {
    if (!(await this.engagementProductionHasTimeColumns())) return base;
    try {
      const eid = Math.floor(Number(engagementId));
      if (!Number.isFinite(eid) || eid < 1) return base;
      const r = await this.dataSource.query(
        `
        SELECT TOP 1
          CONVERT(varchar(8), ep.RehearsalTime, 108) AS rehearsalTime,
          CONVERT(varchar(8), ep.LoadInTime, 108) AS loadInTime
        FROM dbo.EngagementProduction ep
        WHERE ep.EngagementID = ${eid}
        ORDER BY ep.ProductionID DESC
      `,
      );
      const row0 = (r as Record<string, unknown>[])?.[0];
      if (!row0) return base;
      return {
        ...base,
        rehearsalTime: this.parseOpeningTimeOnly(pickRaw(row0, 'rehearsalTime')),
        loadInTime: this.parseOpeningTimeOnly(pickRaw(row0, 'loadInTime')),
      };
    } catch {
      return base;
    }
  }

  private async tryPersistEngagementProductionTimes(
    productionId: number | null | undefined,
    dto: UpdateEngagementDto,
  ): Promise<void> {
    const pid = productionId == null ? NaN : Math.floor(Number(productionId));
    if (!Number.isFinite(pid) || pid < 1) return;
    if (!(await this.engagementProductionHasTimeColumns())) return;

    const wantRehearsalTime = dto.rehearsalTime !== undefined;
    const wantLoadInTime = dto.loadInTime !== undefined;
    if (!wantRehearsalTime && !wantLoadInTime) return;

    const rtSql =
      wantRehearsalTime &&
      (dto.rehearsalTime == null || String(dto.rehearsalTime).trim() === '')
        ? 'NULL'
        : wantRehearsalTime
          ? this.escapeSqlNVarCharLiteral(
              this.normalizeTime(String(dto.rehearsalTime)).slice(0, 8),
            )
          : null;
    const ltSql =
      wantLoadInTime &&
      (dto.loadInTime == null || String(dto.loadInTime).trim() === '')
        ? 'NULL'
        : wantLoadInTime
          ? this.escapeSqlNVarCharLiteral(
              this.normalizeTime(String(dto.loadInTime)).slice(0, 8),
            )
          : null;
    const sets: string[] = [];
    if (wantRehearsalTime && rtSql != null) sets.push(`[RehearsalTime] = ${rtSql}`);
    if (wantLoadInTime && ltSql != null) sets.push(`[LoadInTime] = ${ltSql}`);
    if (!sets.length) return;
    await this.dataSource.query(
      `UPDATE dbo.EngagementProduction SET ${sets.join(', ')} WHERE [ProductionID] = ${pid}`,
    );
  }

  private async enforceOpeningPerformancePublic(
    engagementId: number,
  ): Promise<void> {
    const opening = await this.performanceRepo.findOne({
      where: { engagementId },
      order: {
        performanceDate: 'ASC',
        performanceTime: 'ASC',
        performanceId: 'ASC',
      },
    });
    if (!opening) return;
    const isPublic = opening.performanceStatus.trim().toLowerCase() === 'public';
    if (isPublic) return;
    opening.performanceStatus = 'Public';
    await this.performanceRepo.save(opening);
  }

  private mapBit(
    v: boolean | number | Buffer | null | undefined,
  ): boolean | null {
    if (v == null) return null;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (Buffer.isBuffer(v)) return v[0] === 1;
    return null;
  }

  private mapFinanceLink(link: Link | null | undefined): FinanceLink | null {
    if (!link) return null;
    return {
      linkId: link.linkId,
      linkType: link.linkType,
      linkUrl: link.linkUrl,
      linkName: link.linkName,
      linkPath: link.linkPath,
    };
  }

  private async dboTableHasColumn(
    tableName: string,
    columnName: string,
  ): Promise<boolean> {
    try {
      const rows = await this.dataSource.query(
        `
          SELECT TOP 1 1 AS ok
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = 'dbo'
            AND TABLE_NAME = @0
            AND COLUMN_NAME = @1
        `,
        [tableName, columnName],
      );
      return rows.length > 0;
    } catch {
      return false;
    }
  }

  private async nonResidentWithholdingHasDmaId(): Promise<boolean> {
    if (this.nonResidentWithholdingHasDmaIdColumn != null) {
      return this.nonResidentWithholdingHasDmaIdColumn;
    }
    const hasColumn = await this.dboTableHasColumn(
      'NonResidentWithholding',
      'DMAID',
    );
    this.nonResidentWithholdingHasDmaIdColumn = hasColumn;
    return hasColumn;
  }

  private async listNonResidentWithholdingRowsSafe(em?: EntityManager): Promise<
    Array<{
      withholdingId: number;
      withholdingTaxRate: string;
      dmaid: number | null;
      taxAgencyId: number | null;
      withholdingLinkId: number | null;
      artistWaiverInstructionsId: number | null;
      iaeWaiverInstructionsId: number | null;
      withholdingArea: string | null;
      withholdingAgencyName: string | null;
      withholdingPayee: string | null;
      paymentMethod: string | null;
      formToAttractionUrl: string | null;
      formToMunicipalityUrl: string | null;
      quickBooksNumber: string | null;
      canApplyForWaiver: boolean | null;
      iaeWaiverInstructionsText: string | null;
      completedWaiverUrl: string | null;
      iaeWaiverSubmissionDate: string | null;
      iaeWaiverAppNumber: string | null;
      iaeWaiverUrl: string | null;
      tourWaiverUrl: string | null;
      exceptionsNotes: string | null;
    }>
  > {
    const manager = em ?? this.dataSource.manager;
    const hasDmaId = await this.nonResidentWithholdingHasDmaId();
    let rows: Record<string, unknown>[] = [];
    const extraCols = `
            ,w.WithholdingArea AS withholdingArea
            ,w.WithholdingAgencyName AS withholdingAgencyName
            ,w.WithholdingPayee AS withholdingPayee
            ,w.PaymentMethod AS paymentMethod
            ,w.FormToAttractionURL AS formToAttractionUrl
            ,w.FormToMunicipalityURL AS formToMunicipalityUrl
            ,w.QuickBooksNumber AS quickBooksNumber
            ,w.CanApplyForWaiver AS canApplyForWaiver
            ,w.IAEWaiverInstructions AS iaeWaiverInstructionsText
            ,w.CompletedWaiverURL AS completedWaiverUrl
            ,w.IAEWaiverSubmissionDate AS iaeWaiverSubmissionDate
            ,w.IAEWaiverAppNumber AS iaeWaiverAppNumber
            ,w.IAEWaiverURL AS iaeWaiverUrl
            ,w.TourWaiverURL AS tourWaiverUrl
            ,w.ExceptionsNotes AS exceptionsNotes`;
    try {
      rows = await manager.query(
        `
          SELECT
            w.WithholdingID AS withholdingId,
            w.WithholdingTaxRate AS withholdingTaxRate,
            ${hasDmaId ? 'w.DMAID' : 'CAST(NULL AS int)'} AS dmaid,
            w.TaxAgencyID AS taxAgencyId,
            w.WithholdingLinkID AS withholdingLinkId,
            w.ArtistWaiverInstructionsID AS artistWaiverInstructionsId,
            w.IAEWaiverInstructionsID AS iaeWaiverInstructionsId
            ${extraCols}
          FROM [dbo].[NonResidentWithholding] w
          ORDER BY w.WithholdingID ASC
        `,
      );
    } catch (error) {
      this.nonResidentWithholdingHasDmaIdColumn = false;
      rows = await manager.query(
        `
          SELECT
            w.WithholdingID AS withholdingId,
            w.WithholdingTaxRate AS withholdingTaxRate,
            CAST(NULL AS int) AS dmaid,
            w.TaxAgencyID AS taxAgencyId,
            w.WithholdingLinkID AS withholdingLinkId,
            w.ArtistWaiverInstructionsID AS artistWaiverInstructionsId,
            w.IAEWaiverInstructionsID AS iaeWaiverInstructionsId
            ${extraCols}
          FROM [dbo].[NonResidentWithholding] w
          ORDER BY w.WithholdingID ASC
        `,
      );
    }

    return rows
      .map((row) => {
        const withholdingId = Number(row.withholdingId ?? 0);
        if (!Number.isInteger(withholdingId) || withholdingId < 1) return null;
        return {
          withholdingId,
          withholdingTaxRate: String(row.withholdingTaxRate ?? ''),
          dmaid: row.dmaid == null ? null : Number(row.dmaid),
          taxAgencyId: row.taxAgencyId == null ? null : Number(row.taxAgencyId),
          withholdingLinkId: row.withholdingLinkId == null ? null : Number(row.withholdingLinkId),
          artistWaiverInstructionsId: row.artistWaiverInstructionsId == null ? null : Number(row.artistWaiverInstructionsId),
          iaeWaiverInstructionsId: row.iaeWaiverInstructionsId == null ? null : Number(row.iaeWaiverInstructionsId),
          withholdingArea: row.withholdingArea == null ? null : String(row.withholdingArea),
          withholdingAgencyName: row.withholdingAgencyName == null ? null : String(row.withholdingAgencyName),
          withholdingPayee: row.withholdingPayee == null ? null : String(row.withholdingPayee),
          paymentMethod: row.paymentMethod == null ? null : String(row.paymentMethod),
          formToAttractionUrl: row.formToAttractionUrl == null ? null : String(row.formToAttractionUrl),
          formToMunicipalityUrl: row.formToMunicipalityUrl == null ? null : String(row.formToMunicipalityUrl),
          quickBooksNumber: row.quickBooksNumber == null ? null : String(row.quickBooksNumber),
          canApplyForWaiver: row.canApplyForWaiver == null ? null : Boolean(row.canApplyForWaiver),
          iaeWaiverInstructionsText: row.iaeWaiverInstructionsText == null ? null : String(row.iaeWaiverInstructionsText),
          completedWaiverUrl: row.completedWaiverUrl == null ? null : String(row.completedWaiverUrl),
          iaeWaiverSubmissionDate: row.iaeWaiverSubmissionDate == null ? null : String(row.iaeWaiverSubmissionDate),
          iaeWaiverAppNumber: row.iaeWaiverAppNumber == null ? null : String(row.iaeWaiverAppNumber),
          iaeWaiverUrl: row.iaeWaiverUrl == null ? null : String(row.iaeWaiverUrl),
          tourWaiverUrl: row.tourWaiverUrl == null ? null : String(row.tourWaiverUrl),
          exceptionsNotes: row.exceptionsNotes == null ? null : String(row.exceptionsNotes),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);
  }

  /**
   * Update editable fields on dbo.NonResidentWithholding by WithholdingID.
   */
  async updateNonResidentWithholding(
    withholdingId: number,
    dto: {
      withholdingArea?: string | null;
      withholdingTaxRate?: number | null;
      withholdingAgencyName?: string | null;
      iaeWaiverSubmissionDate?: string | null;
      iaeWaiverAppNumber?: string | null;
    },
  ): Promise<void> {
    const id = Math.floor(Number(withholdingId));
    if (!Number.isInteger(id) || id < 1) return;
    const sets: string[] = [];
    const strField = (col: string, v: string | null | undefined, max: number) => {
      if (v !== undefined) sets.push(`[${col}] = ${v == null || String(v).trim() === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(String(v).trim().slice(0, max))}`);
    };
    const numField = (col: string, v: number | null | undefined) => {
      if (v !== undefined) sets.push(`[${col}] = ${v == null ? 'NULL' : Number(v)}`);
    };
    strField('WithholdingArea', dto.withholdingArea, 100);
    numField('WithholdingTaxRate', dto.withholdingTaxRate);
    strField('WithholdingAgencyName', dto.withholdingAgencyName, 200);
    strField('IAEWaiverSubmissionDate', dto.iaeWaiverSubmissionDate, 10);
    strField('IAEWaiverAppNumber', dto.iaeWaiverAppNumber, 100);
    if (sets.length === 0) return;
    await this.dataSource.query(
      `UPDATE dbo.NonResidentWithholding SET ${sets.join(', ')} WHERE [WithholdingID] = ${id}`,
    );
  }

  private async findNonResidentWithholdingByIdSafe(
    withholdingId: number,
    em?: EntityManager,
  ): Promise<{
    withholdingId: number;
    withholdingTaxRate: string;
    dmaid: number | null;
    taxAgencyId: number | null;
    withholdingLinkId: number | null;
    artistWaiverInstructionsId: number | null;
    iaeWaiverInstructionsId: number | null;
  } | null> {
    const id = Math.floor(Number(withholdingId));
    if (!Number.isInteger(id) || id < 1) return null;
    const manager = em ?? this.dataSource.manager;
    const hasDmaId = await this.nonResidentWithholdingHasDmaId();
    let rows: Record<string, unknown>[] = [];
    try {
      rows = await manager.query(
        `
          SELECT TOP 1
            w.WithholdingID AS withholdingId,
            w.WithholdingTaxRate AS withholdingTaxRate,
            ${hasDmaId ? 'w.DMAID' : 'CAST(NULL AS int)'} AS dmaid,
            w.TaxAgencyID AS taxAgencyId,
            w.WithholdingLinkID AS withholdingLinkId,
            w.ArtistWaiverInstructionsID AS artistWaiverInstructionsId,
            w.IAEWaiverInstructionsID AS iaeWaiverInstructionsId
          FROM [dbo].[NonResidentWithholding] w
          WHERE w.WithholdingID = @0
        `,
        [id],
      );
    } catch (error) {
      this.nonResidentWithholdingHasDmaIdColumn = false;
      rows = await manager.query(
        `
          SELECT TOP 1
            w.WithholdingID AS withholdingId,
            w.WithholdingTaxRate AS withholdingTaxRate,
            CAST(NULL AS int) AS dmaid,
            w.TaxAgencyID AS taxAgencyId,
            w.WithholdingLinkID AS withholdingLinkId,
            w.ArtistWaiverInstructionsID AS artistWaiverInstructionsId,
            w.IAEWaiverInstructionsID AS iaeWaiverInstructionsId
          FROM [dbo].[NonResidentWithholding] w
          WHERE w.WithholdingID = @0
        `,
        [id],
      );
    }
    const row = rows[0];
    if (!row) return null;
    const parsedId = Number(row.withholdingId ?? NaN);
    if (!Number.isInteger(parsedId) || parsedId < 1) return null;
    return {
      withholdingId: parsedId,
      withholdingTaxRate: String(row.withholdingTaxRate ?? ''),
      dmaid: row.dmaid == null ? null : Number(row.dmaid),
      taxAgencyId: row.taxAgencyId == null ? null : Number(row.taxAgencyId),
      withholdingLinkId:
        row.withholdingLinkId == null ? null : Number(row.withholdingLinkId),
      artistWaiverInstructionsId:
        row.artistWaiverInstructionsId == null
          ? null
          : Number(row.artistWaiverInstructionsId),
      iaeWaiverInstructionsId:
        row.iaeWaiverInstructionsId == null
          ? null
          : Number(row.iaeWaiverInstructionsId),
    };
  }

  private async assertNonResidentWithholdingExists(id: number): Promise<void> {
    const found = await this.findNonResidentWithholdingByIdSafe(id);
    if (!found) {
      throw new BadRequestException({
        message: `Non-resident withholding #${id} was not found.`,
      });
    }
  }

  private normalizeHttpOrHttpsUrl(
    raw: string | null | undefined,
    label: string,
  ): string | null {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed) return null;
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new BadRequestException({
        message: `${label} must be a valid http(s) URL.`,
      });
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException({
        message: `${label} must start with http:// or https://.`,
      });
    }
    return trimmed.slice(0, 2048);
  }

  private async upsertUrlLink(
    rawUrl: string | null | undefined,
    existingLinkId: number | null,
    label: string,
  ): Promise<number | null> {
    const url = this.normalizeHttpOrHttpsUrl(rawUrl, label);
    if (!url) return null;

    const existing =
      existingLinkId != null && existingLinkId > 0
        ? await this.linkRepo.findOne({ where: { linkId: existingLinkId } })
        : null;
    const link =
      existing ??
      this.linkRepo.create({
        linkType: 'URL',
        linkName: label,
      });
    link.linkType = 'URL';
    link.linkUrl = url;
    link.linkPath = url.slice(0, 1024);
    link.linkName = (link.linkName?.trim() || label).slice(0, 255);
    const saved = await this.linkRepo.save(link);
    return saved.linkId;
  }

  private async upsertTicketingUrlLink(
    rawUrl: string | null | undefined,
    existingLinkId: number | null,
  ): Promise<number | null> {
    return this.upsertUrlLink(rawUrl, existingLinkId, 'Ticketing link');
  }

  private toPercentOrNull(v: unknown): number | null {
    if (v == null || v === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 100) return null;
    return n;
  }

  private toDecimalOrNull(v: unknown): number | null {
    if (v == null || v === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return n;
  }

  private normalizeRoyaltyBasis(v: unknown): 'Net' | 'NAGBOR' | null {
    const t = String(v ?? '').trim().toLowerCase();
    if (!t) return null;
    if (t === 'net' || t === 'based on net') return 'Net';
    if (t === 'nagbor' || t === 'based on nagbor') return 'NAGBOR';
    return null;
  }

  private parseArtistRoyaltyVariableFee(raw: string | null | undefined): {
    ratePercent: number | null;
    basedOn: 'Net' | 'NAGBOR' | null;
  } {
    const t = String(raw ?? '').trim();
    if (!t) return { ratePercent: null, basedOn: null };

    try {
      const parsed = JSON.parse(t) as {
        ratePercent?: unknown;
        basedOn?: unknown;
      };
      if (parsed && typeof parsed === 'object') {
        return {
          ratePercent: this.toPercentOrNull(parsed.ratePercent),
          basedOn: this.normalizeRoyaltyBasis(parsed.basedOn),
        };
      }
    } catch {
      // Not JSON; continue with tolerant legacy parsing.
    }

    const rateMatch = /(-?\d+(?:\.\d+)?)/.exec(t);
    return {
      ratePercent: rateMatch ? this.toPercentOrNull(rateMatch[1]) : null,
      basedOn: this.normalizeRoyaltyBasis(t),
    };
  }

  private parseArtistBackEndTerms(raw: string | null | undefined): {
    versusPercent: number | null;
    promoterProfitPercent: number | null;
    artistBackendPercent: number | null;
    depositRequired: boolean | null;
    partOfCollateralizedDeal: boolean | null;
    fexPerformanceAgreementLink: string | null;
    tourOfferLink: string | null;
    overageAmount: number | null;
    buyouts: number | null;
  } {
    const t = String(raw ?? '').trim();
    const empty = {
      versusPercent: null,
      promoterProfitPercent: null,
      artistBackendPercent: null,
      depositRequired: null,
      partOfCollateralizedDeal: null,
      fexPerformanceAgreementLink: null,
      tourOfferLink: null,
      overageAmount: null,
      buyouts: null,
    };
    if (!t) return empty;

    try {
      const parsed = JSON.parse(t) as {
        versusPercent?: unknown;
        promoterProfitPercent?: unknown;
        artistBackendPercent?: unknown;
        depositRequired?: unknown;
        partOfCollateralizedDeal?: unknown;
        fexPerformanceAgreementLink?: unknown;
        tourOfferLink?: unknown;
        overageAmount?: unknown;
        buyouts?: unknown;
      };
      if (parsed && typeof parsed === 'object') {
        const toOptBool = (v: unknown): boolean | null => {
          if (v === true || v === 1 || v === '1' || v === 'true') return true;
          if (v === false || v === 0 || v === '0' || v === 'false') return false;
          return null;
        };
        const toOptStr = (v: unknown): string | null => {
          if (v == null || v === '') return null;
          return String(v).trim().slice(0, 2048) || null;
        };
        return {
          versusPercent: this.toPercentOrNull(parsed.versusPercent),
          promoterProfitPercent: this.toPercentOrNull(parsed.promoterProfitPercent),
          artistBackendPercent: this.toPercentOrNull(parsed.artistBackendPercent),
          depositRequired: toOptBool(parsed.depositRequired),
          partOfCollateralizedDeal: toOptBool(parsed.partOfCollateralizedDeal),
          fexPerformanceAgreementLink: toOptStr(parsed.fexPerformanceAgreementLink),
          tourOfferLink: toOptStr(parsed.tourOfferLink),
          overageAmount: this.toDecimalOrNull(parsed.overageAmount),
          buyouts: this.toDecimalOrNull(parsed.buyouts),
        };
      }
    } catch {
      // Not JSON; continue with tolerant legacy parsing.
    }

    return empty;
  }

  private nextArtistRoyaltyVariableFee(
    currentRaw: string | null | undefined,
    dto: UpdateEngagementFinanceDto,
  ): string | null {
    const hasStructuredInput =
      dto.artistRoyaltyRatePercent !== undefined ||
      dto.artistRoyaltyBasedOn !== undefined;
    if (!hasStructuredInput) {
      const t = dto.artistRoyaltyVariableFee;
      return t == null || t.trim() === '' ? null : t.trim().slice(0, 255);
    }

    const parsed = this.parseArtistRoyaltyVariableFee(currentRaw);
    const ratePercent =
      dto.artistRoyaltyRatePercent !== undefined
        ? this.toPercentOrNull(dto.artistRoyaltyRatePercent)
        : parsed.ratePercent;
    const basedOn =
      dto.artistRoyaltyBasedOn !== undefined
        ? this.normalizeRoyaltyBasis(dto.artistRoyaltyBasedOn)
        : parsed.basedOn;
    if (ratePercent == null && basedOn == null) return null;
    return JSON.stringify({ ratePercent, basedOn });
  }

  private nextArtistBackEndTerms(
    currentRaw: string | null | undefined,
    dto: UpdateEngagementFinanceDto,
  ): string | null {
    const hasStructuredInput =
      dto.artistVersusPercent !== undefined ||
      dto.artistPromoterProfitPercent !== undefined ||
      dto.artistBackendPercent !== undefined ||
      dto.artistDepositRequired !== undefined ||
      dto.artistPartOfCollateralizedDeal !== undefined ||
      dto.artistFexPerformanceAgreementLink !== undefined ||
      dto.artistTourOfferLink !== undefined ||
      dto.artistOverageAmount !== undefined ||
      dto.artistBuyouts !== undefined;
    if (!hasStructuredInput) {
      const t = dto.artistBackEndTerms;
      return t == null || t.trim() === '' ? null : t.trim();
    }

    const parsed = this.parseArtistBackEndTerms(currentRaw);
    const toOptBool = (v: boolean | null | undefined, fallback: boolean | null): boolean | null => {
      if (v === undefined) return fallback;
      return v ?? null;
    };
    const toOptStr = (v: string | null | undefined, fallback: string | null): string | null => {
      if (v === undefined) return fallback;
      return v == null || String(v).trim() === '' ? null : String(v).trim().slice(0, 2048);
    };
    const versusPercent =
      dto.artistVersusPercent !== undefined
        ? this.toPercentOrNull(dto.artistVersusPercent)
        : parsed.versusPercent;
    const promoterProfitPercent =
      dto.artistPromoterProfitPercent !== undefined
        ? this.toPercentOrNull(dto.artistPromoterProfitPercent)
        : parsed.promoterProfitPercent;
    const artistBackendPercent =
      dto.artistBackendPercent !== undefined
        ? this.toPercentOrNull(dto.artistBackendPercent)
        : parsed.artistBackendPercent;
    const depositRequired = toOptBool(dto.artistDepositRequired, parsed.depositRequired);
    const partOfCollateralizedDeal = toOptBool(dto.artistPartOfCollateralizedDeal, parsed.partOfCollateralizedDeal);
    const fexPerformanceAgreementLink = toOptStr(dto.artistFexPerformanceAgreementLink, parsed.fexPerformanceAgreementLink);
    const tourOfferLink = toOptStr(dto.artistTourOfferLink, parsed.tourOfferLink);
    const overageAmount =
      dto.artistOverageAmount !== undefined
        ? this.toDecimalOrNull(dto.artistOverageAmount)
        : parsed.overageAmount;
    const buyouts =
      dto.artistBuyouts !== undefined
        ? this.toDecimalOrNull(dto.artistBuyouts)
        : parsed.buyouts;

    if (
      versusPercent == null &&
      promoterProfitPercent == null &&
      artistBackendPercent == null &&
      depositRequired == null &&
      partOfCollateralizedDeal == null &&
      fexPerformanceAgreementLink == null &&
      tourOfferLink == null &&
      overageAmount == null &&
      buyouts == null
    ) {
      return null;
    }

    return JSON.stringify({
      versusPercent,
      promoterProfitPercent,
      artistBackendPercent,
      depositRequired,
      partOfCollateralizedDeal,
      fexPerformanceAgreementLink,
      tourOfferLink,
      overageAmount,
      buyouts,
    });
  }

  private settlementFinanceResponseSlice(
    settlementRow: SettlementFinance | null,
  ): Pick<
    EngagementFinanceRow,
    | 'artistSettlementStatus'
    | 'venueSettlementStatus'
    | 'subscriptionSalesRevenueTotal'
    | 'seasonTicketSalesByIae'
    | 'seasonTicketFundsTransferred'
    | 'netBoxOfficeFundsDepositedAccount'
    | 'hstCollectedFromTicketSales'
    | 'hstPaidOnTourPayments'
    | 'hstPaidOnShowExpenses'
    | 'hstPaidOnVenueExpenses'
    | 'artistGrossTaxableCompensation'
    | 'amountDueToDeptOfRevenue'
    | 'checkNumberOrConfOfWithholdingPayment'
    | 'finalGuaranteeAmount'
    | 'finalRoyaltyAmount'
    | 'finalOverageAmount'
    | 'finalBuyoutAmount'
    | 'finalDirectCompanyCharges'
    | 'finalReimbursables'
  > {
    if (!settlementRow) {
      return {
        artistSettlementStatus: null,
        venueSettlementStatus: null,
        subscriptionSalesRevenueTotal: null,
        seasonTicketSalesByIae: null,
        seasonTicketFundsTransferred: null,
        netBoxOfficeFundsDepositedAccount: null,
        hstCollectedFromTicketSales: null,
        hstPaidOnTourPayments: null,
        hstPaidOnShowExpenses: null,
        hstPaidOnVenueExpenses: null,
        artistGrossTaxableCompensation: null,
        amountDueToDeptOfRevenue: null,
        checkNumberOrConfOfWithholdingPayment: null,
        finalGuaranteeAmount: null,
        finalRoyaltyAmount: null,
        finalOverageAmount: null,
        finalBuyoutAmount: null,
        finalDirectCompanyCharges: null,
        finalReimbursables: null,
      };
    }
    return {
      artistSettlementStatus: settlementRow.artistSettlementStatus ?? null,
      venueSettlementStatus: settlementRow.venueSettlementStatus ?? null,
      subscriptionSalesRevenueTotal: this.mapFinanceNumber(
        settlementRow.subscriptionSalesRevenueTotal,
      ),
      seasonTicketSalesByIae: this.mapFinanceNumber(
        settlementRow.seasonTicketSalesByIae,
      ),
      seasonTicketFundsTransferred: this.mapFinanceNumber(
        settlementRow.seasonTicketFundsTransferred,
      ),
      netBoxOfficeFundsDepositedAccount:
        settlementRow.netBoxOfficeFundsDepositedAccount ?? null,
      hstCollectedFromTicketSales: this.mapFinanceNumber(
        settlementRow.hstCollectedFromTicketSales,
      ),
      hstPaidOnTourPayments: this.mapFinanceNumber(
        settlementRow.hstPaidOnTourPayments,
      ),
      hstPaidOnShowExpenses: this.mapFinanceNumber(
        settlementRow.hstPaidOnShowExpenses,
      ),
      hstPaidOnVenueExpenses: this.mapFinanceNumber(
        settlementRow.hstPaidOnVenueExpenses,
      ),
      artistGrossTaxableCompensation: this.mapFinanceNumber(
        settlementRow.artistGrossTaxableCompensation,
      ),
      amountDueToDeptOfRevenue: this.mapFinanceNumber(
        settlementRow.amountDueToDeptOfRevenue,
      ),
      checkNumberOrConfOfWithholdingPayment:
        settlementRow.checkNumberOrConfOfWithholdingPayment ?? null,
      finalGuaranteeAmount: this.mapFinanceNumber(settlementRow.finalGuaranteeAmount),
      finalRoyaltyAmount: this.mapFinanceNumber(settlementRow.finalRoyaltyAmount),
      finalOverageAmount: this.mapFinanceNumber(settlementRow.finalOverageAmount),
      finalBuyoutAmount: this.mapFinanceNumber(settlementRow.finalBuyoutAmount),
      finalDirectCompanyCharges: this.mapFinanceNumber(settlementRow.directCompanyCharges),
      finalReimbursables: this.mapFinanceNumber(settlementRow.reimbursables),
    };
  }

  private toFinanceResponse(
    engagementId: number,
    row: EngagementFinances | null,
    engagement: Engagement,
    artistRow: ArtistFinance | null,
    settlementRow: SettlementFinance | null,
    payableEntity: { companyId: number; companyName: string } | null,
  ): EngagementFinanceRow {
    const grossPotential = this.mapFinanceNumber(engagement.grossPotential);
    const sellableCapacity =
      engagement.sellableCapacity != null
        ? Number(engagement.sellableCapacity)
        : null;

    const artistDealType = artistRow?.artistDealType ?? null;
    const artistGuarantee = artistRow
      ? this.mapFinanceNumber(artistRow.artistGuarantee)
      : null;
    const artistMiddleMoney = artistRow
      ? this.mapFinanceNumber(artistRow.artistMiddleMoney)
      : null;
    const artistRoyaltyVariableFee =
      artistRow?.artistRoyaltyVariableFee ?? null;
    const artistBackEndTerms = artistRow?.artistBackEndTerms ?? null;

    // Read versus% directly from ArtistRoyaltyVariableFee column (plain number string)
    const artistVersusPercent = artistRoyaltyVariableFee != null
      ? this.toPercentOrNull(parseFloat(artistRoyaltyVariableFee))
      : null;
    const overagePercent = artistRow
      ? this.mapFinanceNumber(artistRow.overagePercent)
      : null;
    // Read backend% directly from ArtistBackEndTerms column (plain number string)
    const artistBackendPercent = artistBackEndTerms != null
      ? this.toPercentOrNull(parseFloat(artistBackEndTerms))
      : null;

    const promoterProfitPercent = row
      ? this.mapFinanceNumber(row.promoterProfit)
      : null;

    if (!row) {
      return {
        financeId: null,
        engagementId,
        payableEntityCompanyId: payableEntity?.companyId ?? null,
        payableEntityCompanyName: payableEntity?.companyName ?? null,
        estimatedBreakeven: null,
        grossPotential,
        sellableCapacity,
        grossMarketingBudget: null,
        netMarketingBudget: null,
        salesRevenueGoal: null,
        promoterProfit: null,
        venueDealType: null,
        thirdPartyPartnerDealStructure: null,
        venueDealTypeId: null,
        venueDealTypeName: null,
        venueTerms: null,
        confirmationPacketApproved: null,
        iaeWaiverApplicationConfirmationNumber: null,
        iaeWaiverApplicationSubmissionDate: null,
        iaeApplicationWaiverStatus: null,
        dateFundsReceived: null,
        fundsDue: null,
        fundsWithheld: null,
        fundsOwed: null,
        receivableBankAccount: null,
        requiredNonResidentWithholdingId: null,
        isCanadaEngagement: null,
        artistFinanceId: null,
        settlementFinanceId: null,
        artistDealType,
        artistGuarantee,
        artistMiddleMoney,
        artistRoyaltyVariableFee,
        artistBackEndTerms,
        artistVersusPercent,
        overagePercent: null,
        artistPromoterProfitPercent: promoterProfitPercent,
        artistBackendPercent,
        artistRoyaltyRatePercent: artistRow ? this.mapFinanceNumber(artistRow.royaltyRate) : null,
        artistRoyaltyBasedOn: artistRow?.royaltyBasis ?? null,
        ...this.settlementFinanceResponseSlice(settlementRow),
        finalAcceptedOfferLink: null,
        settlementFileSharePointLink: null,
        tourSplitPoint: null,
        announcementDate: null,
        promoterPartnerCompanyId: null,
        promoterPartnerCompanyName: null,
        promoterPartnerContactId: null,
        promoterPartnerContactName: null,
        tourManagerContactId: null,
        tourManagerContactName: null,
        attractionContractSharePointLink: null,
        partiallyExecutedAttractionContractSharePointLink: null,
        fullyExecutedAttractionContractSharePointLink: null,
        eventBusinessManagerContactId: null,
        eventBusinessManagerContactName: null,
        eventBusinessAssistantManagerContactId: null,
        eventBusinessAssistantManagerContactName: null,
        venueSettlementContactId: null,
        venueSettlementContactName: null,
        venueSettlementFileSharePointLink: null,
        partnerSettlementFileSharePointLink: null,
        salesTaxRemittedBy: null,
        fexVenueAgreementLink: null,
        venueDepositRequired: null,
        withholdingPayee: null,
        withholdingPaymentMethod: null,
        withholdingFormToAttractionLink: null,
        withholdingFormToMunicipalityLink: null,
        withholdingQuickbooksNumber: null,
        withholdingWaiver: null,
        withholdingCompletedWaiverLink: null,
        tourWaiverLink: null,
        withholdingExceptions: null,
        compensationRoyaltyAmount: null,
        compensationOverageAmount: null,
        compensationBuyouts: null,
        compensationDirectCharges: null,
        compensationReimbursibles: null,
        financeJob: null,
        financeCustomer: null,
        tourAscap: null,
        tourBmi: null,
        tourSesac: null,
        tourGmr: null,
        artistDepositRequired: null,
        artistPartOfCollateralizedDeal: artistRow?.isCollateralizedDeal ?? null,
        artistFexPerformanceAgreementLink: null,
        artistTourOfferLink: null,
        artistOverageAmount: null,
        artistBuyouts: artistRow ? this.mapFinanceNumber(artistRow.buyoutAmount) : null,
      };
    }
    return {
      financeId: row.financeId,
      engagementId: row.engagementId,
      payableEntityCompanyId: payableEntity?.companyId ?? null,
      payableEntityCompanyName: payableEntity?.companyName ?? null,
      estimatedBreakeven: this.mapFinanceNumber(row.estimatedBreakeven),
      grossPotential,
      sellableCapacity,
      grossMarketingBudget: null,
      netMarketingBudget: null,
      salesRevenueGoal: null,
      promoterProfit: this.mapFinanceNumber(row.promoterProfit),
      venueDealType: null,
      thirdPartyPartnerDealStructure: null,
      venueDealTypeId: null,
      venueDealTypeName: null,
      venueTerms: row.venueTerms,
      confirmationPacketApproved: this.mapBit(row.confirmationPacketApproved),
      iaeWaiverApplicationConfirmationNumber:
        row.iaeWaiverApplicationConfirmationNumber,
      iaeWaiverApplicationSubmissionDate: this.mapFinanceYmd(
        row.iaeWaiverApplicationSubmissionDate as string | Date | null,
      ),
      iaeApplicationWaiverStatus: row.iaeApplicationWaiverStatus,
      dateFundsReceived: this.mapFinanceYmd(
        row.dateFundsReceived as string | Date | null,
      ),
      fundsDue: this.mapFinanceNumber(row.fundsDue),
      fundsWithheld: this.mapFinanceNumber(row.fundsWithheld),
      fundsOwed: this.mapFinanceNumber(row.fundsOwed),
      receivableBankAccount: row.receivableBankAccount,
      requiredNonResidentWithholdingId: row.requiredNonResidentWithholdingId,
      isCanadaEngagement: row.isCanadaEngagement ?? null,
      artistFinanceId: row.artistFinanceId,
      settlementFinanceId: row.settlementFinanceId,
      artistDealType,
      artistGuarantee,
      artistMiddleMoney,
      artistRoyaltyVariableFee,
      artistBackEndTerms,
      artistVersusPercent,
      overagePercent,
      artistPromoterProfitPercent: promoterProfitPercent,
      artistBackendPercent,
      artistRoyaltyRatePercent: artistRow ? this.mapFinanceNumber(artistRow.royaltyRate) : null,
      artistRoyaltyBasedOn: artistRow?.royaltyBasis ?? null,
      ...this.settlementFinanceResponseSlice(settlementRow),
      finalAcceptedOfferLink: null,
      settlementFileSharePointLink: null,
      tourSplitPoint: null,
      announcementDate: null,
      promoterPartnerCompanyId: null,
      promoterPartnerCompanyName: null,
      promoterPartnerContactId: null,
      promoterPartnerContactName: null,
      tourManagerContactId: null,
      tourManagerContactName: null,
      attractionContractSharePointLink: null,
      partiallyExecutedAttractionContractSharePointLink: null,
      fullyExecutedAttractionContractSharePointLink: null,
      eventBusinessManagerContactId: null,
      eventBusinessManagerContactName: null,
      eventBusinessAssistantManagerContactId: null,
      eventBusinessAssistantManagerContactName: null,
      venueSettlementContactId: null,
      venueSettlementContactName: null,
      venueSettlementFileSharePointLink: row.venueSettlementFileSharePointLink ?? null,
      partnerSettlementFileSharePointLink: row.partnerSettlementFileSharePointLink ?? null,
      salesTaxRemittedBy: row.salesTaxRemittedBy ?? null,
      fexVenueAgreementLink: null,
      venueDepositRequired: null,
      withholdingPayee: null,
      withholdingPaymentMethod: null,
      withholdingFormToAttractionLink: null,
      withholdingFormToMunicipalityLink: null,
      withholdingQuickbooksNumber: null,
      withholdingWaiver: null,
      withholdingCompletedWaiverLink: null,
      tourWaiverLink: null,
      withholdingExceptions: null,
      compensationRoyaltyAmount: null,
      compensationOverageAmount: null,
      compensationBuyouts: null,
      compensationDirectCharges: null,
      compensationReimbursibles: null,
      financeJob: null,
      financeCustomer: null,
      tourAscap: null,
      tourBmi: null,
      tourSesac: null,
      tourGmr: null,
      artistDepositRequired: null,
      artistPartOfCollateralizedDeal: artistRow?.isCollateralizedDeal ?? null,
      artistFexPerformanceAgreementLink: null,
      artistTourOfferLink: null,
      artistOverageAmount: null,
      artistBuyouts: artistRow ? this.mapFinanceNumber(artistRow.buyoutAmount) : null,
    };
  }

  /**
   *   Engagement → Tour → Attraction (attraction name/id)
   *             → EngagementVenue (primary) → Venue → Company → Address + DMA
   */
  private buildEngagementQuery(whereId?: number) {
    const entertainmentComplexSubquery = `(
          SELECT STRING_AGG(LTRIM(RTRIM(ccx.CompanyName)), N', ') WITHIN GROUP (ORDER BY LTRIM(RTRIM(ccx.CompanyName)))
          FROM dbo.EngagementVenue evx
          INNER JOIN dbo.VenueComplexMember vcmx ON vcmx.VenueCompanyID = evx.VenueCompanyID
          INNER JOIN dbo.Company ccx ON ccx.CompanyID = vcmx.ComplexCompanyID
          WHERE evx.EngagementID = e.engagementId AND evx.IsPrimary = 1
        )`;

    const qb = this.engagementRepo
      .createQueryBuilder('e')
      .innerJoin(Tour, 't', 't.tourId = e.tourId')
      .leftJoin(Attraction, 'a', 'a.attractionId = t.attractionId')
      .leftJoin(Link, 'tourBanner', 'tourBanner.linkId = t.bannerLinkId')
      .leftJoin(
        EngagementVenue,
        'ev',
        'ev.engagementId = e.engagementId AND ev.isPrimary = :prim',
        { prim: true },
      )
      .leftJoin(Venue, 'v', 'v.companyId = ev.venueCompanyId')
      .leftJoin(Company, 'vc', 'vc.companyId = ev.venueCompanyId')
      .leftJoin(Address, 'addr', 'addr.addressId = vc.physicalAddressId')
      .leftJoin(Dma, 'dma', 'dma.dmaid = vc.dmaid')
      .leftJoin(EngagementFinances, 'ef', 'ef.engagementId = e.engagementId')
      .select([
        'e.engagementId         AS engagementId',
        'e.engagementStatus     AS engagementStatus',
        'e.engagementScaling    AS engagementScaling',
        'e.sellableCapacity     AS sellableCapacity',
        'e.grossPotential       AS grossPotential',
        'e.tourId               AS tourId',
        't.tourName             AS tourName',
        't.attractionId         AS attractionId',
        'a.attractionName       AS attractionName',
        'ev.venueCompanyId      AS primaryVenueCompanyId',
        'vc.companyName         AS venueCompanyName',
        'v.venueName            AS venueName',
        'addr.city              AS city',
        'addr.stateProvince     AS stateProvince',
        'dma.marketName         AS dmaMarketName',
        'tourBanner.linkUrl     AS tourBannerImageUrl',
      ])
      .addSelect(entertainmentComplexSubquery, 'entertainmentComplexNames')
      .addSelect(
        this.openingPerformanceDateSubquery(),
        'openingPerformanceDate',
      )
      .addSelect(
        this.openingPerformanceTimeSubquery(),
        'openingPerformanceTime',
      )
      .addSelect(
        `CASE WHEN ${this.openingPerformanceDateSubquery()} IS NULL THEN 1 ELSE 0 END`,
        'openingPerformanceSortNull',
      )
      .addSelect(this.engagementRehearsalDateSubquery(), 'rehearsalDate')
      .addSelect(this.engagementLoadInDateSubquery(), 'loadInDate')
      .addSelect('e.tourManagerContactId', 'tourManagerContactId')
      .addSelect('ef.isCanadaEngagement', 'isCanadaEngagement');

    if (whereId !== undefined) {
      qb.where('e.engagementId = :id', { id: whereId });
    }
    return qb;
  }

  /**
   * Normalize opening date to `yyyy-MM-dd` (never pass driver Date through JSON).
   * Drops `1970-01-01` (epoch placeholder from bad/missing data).
   */
  private parseOpeningDateOnly(raw: unknown): string | null {
    if (raw == null || raw === '') return null;
    if (raw instanceof Date) {
      if (Number.isNaN(raw.getTime())) return null;
      const y = raw.getUTCFullYear();
      const m = String(raw.getUTCMonth() + 1).padStart(2, '0');
      const d = String(raw.getUTCDate()).padStart(2, '0');
      const ymd = `${y}-${m}-${d}`;
      return ymd === '1970-01-01' ? null : ymd;
    }
    const s = String(raw).trim();
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!m) return null;
    return m[1] === '1970-01-01' ? null : m[1];
  }

  /**
   * Normalize opening time to `HH:mm:ss` (wall clock, no long locale strings).
   */
  private parseOpeningTimeOnly(raw: unknown): string | null {
    if (raw == null || raw === '') return null;
    if (raw instanceof Date) {
      if (Number.isNaN(raw.getTime())) return null;
      const h = String(raw.getUTCHours()).padStart(2, '0');
      const min = String(raw.getUTCMinutes()).padStart(2, '0');
      const sec = String(raw.getUTCSeconds()).padStart(2, '0');
      return `${h}:${min}:${sec}`;
    }
    const s = String(raw).trim();
    const t = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (t) {
      const h = String(Math.min(23, Math.max(0, parseInt(t[1], 10)))).padStart(
        2,
        '0',
      );
      const min = t[2].padStart(2, '0');
      const sec = (t[3] ?? '00').padStart(2, '0');
      return `${h}:${min}:${sec}`;
    }
    if (s.length > 20 && (s.includes('GMT') || s.includes('1970'))) return null;
    return null;
  }

  private mapRaw(r: Record<string, unknown>): EngagementListRow {
    const g = (k: string) => pickRaw(r, k);
    const attractionName =
      g('attractionName') != null ? String(g('attractionName')) : null;
    const tourName = String(g('tourName') ?? '');
    const venueCompanyName =
      g('venueCompanyName') != null ? String(g('venueCompanyName')) : null;
    const venueName = g('venueName') != null ? String(g('venueName')) : null;
    const venueLabel = venueCompanyName ?? venueName ?? 'TBD';
    const engagementId = Number(g('engagementId'));

    const openingDate = this.parseOpeningDateOnly(g('openingPerformanceDate'));
    const openingTime = this.parseOpeningTimeOnly(g('openingPerformanceTime'));

    return {
      engagementId,
      engagementStatus: normalizeEngagementStatus(
        String(g('engagementStatus') ?? ''),
      ),
      engagementScaling:
        g('engagementScaling') != null &&
        String(g('engagementScaling')).trim() !== ''
          ? String(g('engagementScaling')).trim()
          : null,
      sellableCapacity:
        g('sellableCapacity') != null ? Number(g('sellableCapacity')) : null,
      grossPotential:
        g('grossPotential') != null ? Number(g('grossPotential')) : null,
      openingPerformanceDate: openingDate,
      openingPerformanceTime: openingTime,
      attractionId:
        g('attractionId') != null ? Number(g('attractionId')) : null,
      attractionName,
      tourId: Number(g('tourId')),
      tourName,
      primaryVenueCompanyId:
        g('primaryVenueCompanyId') != null
          ? Number(g('primaryVenueCompanyId'))
          : null,
      venueCompanyName,
      venueName,
      city: g('city') != null ? String(g('city')) : null,
      stateProvince:
        g('stateProvince') != null ? String(g('stateProvince')) : null,
      dmaMarketName:
        g('dmaMarketName') != null ? String(g('dmaMarketName')) : null,
      tourBannerImageUrl: (() => {
        const u = g('tourBannerImageUrl');
        if (u == null || u === '') return null;
        const s = String(u).trim();
        return s || null;
      })(),
      entertainmentComplexNames: (() => {
        const x = g('entertainmentComplexNames');
        if (x == null || x === '') return null;
        const s = String(x).trim();
        return s || null;
      })(),
      rehearsalDate: this.parseOpeningDateOnly(g('rehearsalDate')),
      rehearsalTime: null,
      loadInDate: this.parseOpeningDateOnly(g('loadInDate')),
      loadInTime: null,
      tourManagerContactId:
        g('tourManagerContactId') != null ? Number(g('tourManagerContactId')) : null,
      displayTitle: buildEngagementDisplayTitle(
        attractionName,
        tourName,
        venueLabel,
      ),
      appCreated: this.emsCreated.canDeleteEngagement(engagementId),
      isCanadaEngagement: this.mapBit(g('isCanadaEngagement') as boolean | number | Buffer | null | undefined),
    };
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async list(): Promise<EngagementListRow[]> {
    const raw = await this.buildEngagementQuery()
      .orderBy('e.engagementId', 'DESC')
      .getRawMany();
    return (raw as Record<string, unknown>[]).map((r) => this.mapRaw(r));
  }

  async listByCompany(companyId: number): Promise<EngagementListRow[]> {
    const safe = Math.floor(Number(companyId));
    if (!Number.isInteger(safe) || safe < 1) {
      throw new BadRequestException({
        message: 'Company ID must be a positive integer.',
      });
    }

    const raw = await this.buildEngagementQuery()
      .innerJoin(
        EngagementVenue,
        'ev2',
        'ev2.engagementId = e.engagementId AND ev2.venueCompanyId = :cid',
        { cid: safe },
      )
      .distinct(true)
      .getRawMany();
    return (raw as Record<string, unknown>[]).map((r) => this.mapRaw(r));
  }

  async listByTour(tourId: number): Promise<EngagementListRow[]> {
    const safeTourId = Math.floor(Number(tourId));
    if (!Number.isInteger(safeTourId) || safeTourId < 1) {
      throw new BadRequestException({
        message: 'Tour ID must be a positive integer.',
      });
    }

    const raw = await this.buildEngagementQuery()
      .where('e.tourId = :tourId', { tourId: safeTourId })
      .orderBy('openingPerformanceSortNull', 'ASC')
      .addOrderBy('openingPerformanceDate', 'ASC')
      .addOrderBy('openingPerformanceTime', 'ASC')
      .addOrderBy('e.engagementId', 'DESC')
      .getRawMany();
    return (raw as Record<string, unknown>[]).map((r) => this.mapRaw(r));
  }

  /**
   * Earliest performance date as `yyyy-MM-dd` string (avoids driver `Date` objects
   * serializing to long GMT strings in the API).
   */
  private openingPerformanceDateSubquery(): string {
    return `(
          SELECT TOP 1 CONVERT(varchar(10), op.PerformanceDate, 23)
          FROM dbo.[Performance] op
          WHERE op.EngagementID = e.engagementId
          ORDER BY op.PerformanceDate ASC, op.PerformanceTime ASC
        )`;
  }

  /** Earliest performance time as `HH:mm:ss` string (see {@link openingPerformanceDateSubquery}). */
  private openingPerformanceTimeSubquery(): string {
    return `(
          SELECT TOP 1 CONVERT(varchar(8), op.PerformanceTime, 108)
          FROM dbo.[Performance] op
          WHERE op.EngagementID = e.engagementId
          ORDER BY op.PerformanceDate ASC, op.PerformanceTime ASC
        )`;
  }

  /** Latest production row's rehearsal date as `yyyy-MM-dd`. */
  private engagementRehearsalDateSubquery(): string {
    return `(
          SELECT TOP 1 CONVERT(varchar(10), ep.RehearsalDate, 23)
          FROM dbo.EngagementProduction ep
          WHERE ep.EngagementID = e.EngagementID
          ORDER BY ep.ProductionID DESC
        )`;
  }

  /** Latest production row's load-in date as `yyyy-MM-dd`. */
  private engagementLoadInDateSubquery(): string {
    return `(
          SELECT TOP 1 CONVERT(varchar(10), ep.LoadInDate, 23)
          FROM dbo.EngagementProduction ep
          WHERE ep.EngagementID = e.EngagementID
          ORDER BY ep.ProductionID DESC
        )`;
  }

  private applyEngagementListFilters(
    qb: SelectQueryBuilder<Engagement>,
    f: EngagementListFilters,
  ): void {
    const engagementId = Math.floor(Number(f.engagementId));
    if (Number.isInteger(engagementId) && engagementId > 0) {
      qb.andWhere('e.engagementId = :searchEngagementId', {
        searchEngagementId: engagementId,
      });
    }

    const q = (f.q ?? '').trim();
    if (q) {
      this.searchTokens(q).forEach((token, index) => {
        const param = `engagementSearch${index}`;
        const like = `%${this.escapeLikePattern(token)}%`;
        qb.andWhere(
          `(LOWER(CAST(e.engagementId AS VARCHAR(20))) LIKE LOWER(:${param}) ESCAPE '\\' OR LOWER(ISNULL(a.attractionName, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR LOWER(t.tourName) LIKE LOWER(:${param}) ESCAPE '\\' OR LOWER(ISNULL(vc.companyName, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR LOWER(ISNULL(v.venueName, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR LOWER(ISNULL(dma.marketName, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR LOWER(ISNULL(e.engagementStatus, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR LOWER(ISNULL(addr.city, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR LOWER(ISNULL(addr.stateProvince, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR LOWER(ISNULL(tourBanner.linkUrl, '')) LIKE LOWER(:${param}) ESCAPE '\\' OR LOWER(ISNULL((
          SELECT STRING_AGG(LTRIM(RTRIM(ccq.CompanyName)), N', ') WITHIN GROUP (ORDER BY LTRIM(RTRIM(ccq.CompanyName)))
          FROM dbo.EngagementVenue evq
          INNER JOIN dbo.VenueComplexMember vcmq ON vcmq.VenueCompanyID = evq.VenueCompanyID
          INNER JOIN dbo.Company ccq ON ccq.CompanyID = vcmq.ComplexCompanyID
          WHERE evq.EngagementID = e.engagementId AND evq.IsPrimary = 1
        ), '')) LIKE LOWER(:${param}) ESCAPE '\\')`,
          { [param]: like },
        );
      });
    }

    const st = (f.status ?? '').trim();
    if (st && st !== 'All') {
      if (st === 'Unknown') {
        qb.andWhere(
          `(e.engagementStatus IS NULL OR LTRIM(RTRIM(e.engagementStatus)) NOT IN ('Private', 'Public'))`,
        );
      } else if (st === 'Private' || st === 'Public') {
        qb.andWhere('LTRIM(RTRIM(e.engagementStatus)) = :stExact', {
          stExact: st,
        });
      }
    }

    const an = (f.attractionName ?? '').trim();
    if (an) {
      qb.andWhere(
        "LOWER(LTRIM(RTRIM(ISNULL(a.attractionName, '')))) = LOWER(:an)",
        {
          an,
        },
      );
    }

    const dma = (f.dmaMarketName ?? '').trim();
    if (dma) {
      qb.andWhere(
        "LOWER(LTRIM(RTRIM(ISNULL(dma.marketName, '')))) = LOWER(:dma)",
        {
          dma,
        },
      );
    }

    const vl = (f.venueLabel ?? '').trim();
    if (vl) {
      qb.andWhere(
        `(LOWER(LTRIM(RTRIM(ISNULL(vc.companyName, '')))) = LOWER(:vl) OR LOWER(LTRIM(RTRIM(ISNULL(v.venueName, '')))) = LOWER(:vl))`,
        { vl },
      );
    }

    const openingSub = this.openingPerformanceDateSubquery();
    if (f.timing === 'upcoming') {
      qb.andWhere(
        `(${openingSub} IS NULL OR CAST(${openingSub} AS DATE) >= CAST(GETDATE() AS DATE))`,
      );
    } else if (f.timing === 'past') {
      qb.andWhere(
        `(${openingSub} IS NOT NULL AND CAST(${openingSub} AS DATE) < CAST(GETDATE() AS DATE))`,
      );
    }
  }

  private applyEngagementListSort(
    qb: SelectQueryBuilder<Engagement>,
    sortByRaw?: string,
    sortDirRaw?: string,
  ): void {
    const sortBy = (sortByRaw ?? '').trim().toLowerCase();
    const sortDir =
      (sortDirRaw ?? '').trim().toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    if (sortBy === 'attraction') {
      qb.orderBy('a.attractionName', sortDir).addOrderBy(
        'e.engagementId',
        'DESC',
      );
    } else if (sortBy === 'tour') {
      qb.orderBy('t.tourName', sortDir).addOrderBy('e.engagementId', 'DESC');
    } else if (sortBy === 'venue') {
      qb.orderBy('vc.companyName', sortDir)
        .addOrderBy('v.venueName', sortDir)
        .addOrderBy('e.engagementId', 'DESC');
    } else if (sortBy === 'market') {
      qb.orderBy('dma.marketName', sortDir).addOrderBy(
        'e.engagementId',
        'DESC',
      );
    } else if (sortBy === 'date') {
      // Must use SELECT list aliases, not raw subqueries in ORDER BY: with skip/take and
      // joins, TypeORM builds a DISTINCT pagination wrapper and only preserves order keys
      // that resolve to selected columns. Expressions containing "." were misparsed as
      // alias.property (see createOrderByCombinedWithSelectExpression).
      qb.orderBy('openingPerformanceSortNull', 'ASC')
        .addOrderBy('openingPerformanceDate', sortDir)
        .addOrderBy('openingPerformanceTime', sortDir)
        .addOrderBy('e.engagementId', 'DESC');
    } else {
      qb.orderBy('e.engagementId', 'DESC');
    }
  }

  /**
   * Company Hub schedule: engagements created by the signed-in user (dbo.Engagement.created_by)
   * with at least one performance in [startDate, endDate].
   */
  async listHubSchedule(
    startDateRaw?: string,
    endDateRaw?: string,
  ): Promise<EngagementListRow[]> {
    const userOid = this.auditContext.getUserOid()?.trim();
    if (!userOid) {
      throw new BadRequestException({
        message: 'Sign in required to load your engagements.',
      });
    }

    const startDate = this.normalizeHubScheduleYmd(startDateRaw);
    const endDate = this.normalizeHubScheduleYmd(endDateRaw);
    if (!startDate || !endDate) {
      throw new BadRequestException({
        message:
          'Query parameters startDate and endDate are required (YYYY-MM-DD).',
      });
    }
    if (endDate < startDate) {
      throw new BadRequestException({
        message: 'endDate cannot be before startDate.',
      });
    }

    const openingSub = this.openingPerformanceDateSubquery();
    const qb = this.buildEngagementQuery();
    qb.andWhere(
      `LOWER(LTRIM(RTRIM(ISNULL(e.createdBy, '')))) = LOWER(LTRIM(RTRIM(:userOid)))`,
      { userOid },
    );
    qb.andWhere(
      `EXISTS (
        SELECT 1
        FROM dbo.[Performance] hubPerf
        WHERE hubPerf.EngagementID = e.engagementId
          AND CAST(hubPerf.PerformanceDate AS DATE) >= CAST(:startDate AS DATE)
          AND CAST(hubPerf.PerformanceDate AS DATE) <= CAST(:endDate AS DATE)
      )`,
      { startDate, endDate },
    );
    qb.orderBy(openingSub, 'ASC').addOrderBy('e.engagementId', 'ASC');

    const raw = await qb.getRawMany();
    return (raw as Record<string, unknown>[]).map((r) => this.mapRaw(r));
  }

  private normalizeHubScheduleYmd(raw?: string): string | null {
    const s = (raw ?? '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }

  async listPaginated(
    offset: number,
    limit: number,
    filters: EngagementListFilters = {},
  ): Promise<{ data: EngagementListRow[]; total: number }> {
    const safeLimit = Math.min(10_000, Math.max(1, limit));
    const off = Math.max(0, offset);

    const qb = this.buildEngagementQuery();
    this.applyEngagementListFilters(qb, filters);
    this.applyEngagementListSort(qb, filters.sortBy, filters.sortDir);
    const total = await qb.clone().getCount();
    const raw = await qb.skip(off).take(safeLimit).getRawMany();
    return {
      data: (raw as Record<string, unknown>[]).map((r) => this.mapRaw(r)),
      total,
    };
  }

  /** Distinct filter values for engagements list UI (not tied to current page). */
  async filterOptions(): Promise<{
    attractionNames: string[];
    dmaMarketNames: string[];
    venueLabels: string[];
  }> {
    const attractionNames = (
      await this.engagementRepo
        .createQueryBuilder('e')
        .innerJoin(Tour, 't', 't.tourId = e.tourId')
        .leftJoin(Attraction, 'a', 'a.attractionId = t.attractionId')
        .select('a.attractionName', 'name')
        .where('a.attractionName IS NOT NULL')
        .distinct(true)
        .orderBy('a.attractionName', 'ASC')
        .getRawMany<{ name: string }>()
    ).map((r) => String(r.name ?? ''));

    const dmaMarketNames = (
      await this.engagementRepo
        .createQueryBuilder('e')
        .innerJoin(Tour, 't', 't.tourId = e.tourId')
        .leftJoin(
          EngagementVenue,
          'ev',
          'ev.engagementId = e.engagementId AND ev.isPrimary = :prim',
          { prim: true },
        )
        .leftJoin(Company, 'vc', 'vc.companyId = ev.venueCompanyId')
        .leftJoin(Dma, 'dma', 'dma.dmaid = vc.dmaid')
        .select('dma.marketName', 'name')
        .where('dma.marketName IS NOT NULL')
        .distinct(true)
        .orderBy('dma.marketName', 'ASC')
        .getRawMany<{ name: string }>()
    ).map((r) => String(r.name ?? ''));

    const venueRows = await this.engagementRepo
      .createQueryBuilder('e')
      .innerJoin(Tour, 't', 't.tourId = e.tourId')
      .leftJoin(
        EngagementVenue,
        'ev',
        'ev.engagementId = e.engagementId AND ev.isPrimary = :prim',
        { prim: true },
      )
      .leftJoin(Venue, 'v', 'v.companyId = ev.venueCompanyId')
      .leftJoin(Company, 'vc', 'vc.companyId = ev.venueCompanyId')
      .select(['vc.companyName AS cn', 'v.venueName AS vn'])
      .getRawMany<{ cn: string | null; vn: string | null }>();

    const venueSet = new Set<string>();
    for (const r of venueRows) {
      const label = (r.cn?.trim() || r.vn?.trim() || '').trim();
      if (label) venueSet.add(label);
    }
    const venueLabels = [...venueSet].sort((a, b) => a.localeCompare(b));

    return { attractionNames, dmaMarketNames, venueLabels };
  }

  async getOne(id: number): Promise<EngagementListRow> {
    const raw = await this.buildEngagementQuery(id).getRawOne();
    if (!raw)
      throw new NotFoundException({ message: `Engagement #${id} not found.` });
    const base = this.mapRaw(raw as Record<string, unknown>);
    return this.mergeEngagementProductionTimesFromDb(id, base);
  }

  async getFinance(engagementId: number): Promise<EngagementFinanceRow> {
    const engagement = await this.assertEngagementExists(engagementId);
    const payableEntity = await this.tourRepo
      .createQueryBuilder('t')
      .leftJoin(Company, 'pmc', 'pmc.companyId = t.tourManagementCompanyId')
      .select('pmc.companyId', 'companyId')
      .addSelect('pmc.companyName', 'companyName')
      .where('t.tourId = :tourId', { tourId: engagement.tourId })
      .getRawOne<{ companyId: number | null; companyName: string | null }>()
      .then((raw) => {
        const id = Number(raw?.companyId);
        const name = String(raw?.companyName ?? '').trim();
        return Number.isInteger(id) && id > 0 && name
          ? { companyId: id, companyName: name }
          : null;
      });
    const row = await this.engagementFinancesRepo.findOne({
      where: { engagementId },
    });
    let artistRow: ArtistFinance | null = null;
    const afId = row?.artistFinanceId ?? null;
    if (afId != null) {
      artistRow = await this.artistFinanceRepo.findOne({
        where: { artistFinanceId: afId },
      });
    }
    // Resolve tour offer link URL from Link table
    let artistTourOfferLinkUrl: string | null = null;
    if (artistRow?.tourOfferLinkId) {
      const linkRow = await this.linkRepo.findOne({ where: { linkId: artistRow.tourOfferLinkId } });
      artistTourOfferLinkUrl = linkRow?.linkUrl ?? null;
    }
    let settlementRow: SettlementFinance | null = null;
    const sfId = row?.settlementFinanceId ?? null;
    if (sfId != null) {
      settlementRow = await this.settlementFinanceRepo.findOne({
        where: { settlementFinanceId: sfId },
      });
    }
    const base = this.toFinanceResponse(
      engagementId,
      row,
      engagement,
      artistRow,
      settlementRow,
      payableEntity,
    );
    base.artistTourOfferLink = artistTourOfferLinkUrl;
    if (!row?.financeId) return this.mergeAnnouncementDateFromProduction(engagementId, base);
    const withMarketingBudget = await this.mergeFinanceMarketingBudgetFromDb(
      row.financeId,
      base,
    );
    const withDealStructures = await this.mergeFinanceDealStructuresFromDb(
      row.financeId,
      withMarketingBudget,
    );
    const withSharePointLinks = await this.mergeFinanceSharePointLinksFromDb(
      row.financeId,
      withDealStructures,
    );
    const withBooking = await this.mergeFinanceBookingFieldsFromDb(row.financeId, withSharePointLinks);
    const withEventBusiness = await this.mergeFinanceEventBusinessFieldsFromDb(row.financeId, withBooking);
    const withCustomer = await this.mergeFinanceCustomerFromDb(row.financeId, withEventBusiness);
    const withPromoterCompany = await this.mergeFinancePromoterPartnerCompanyFromDb(row.financeId, withCustomer);
    const withTourLicensing = await this.mergeFinanceTourLicensingFromDb(engagementId, withPromoterCompany);
    return this.mergeAnnouncementDateFromProduction(engagementId, withTourLicensing);
  }

  private async mergeFinanceTourLicensingFromDb(
    engagementId: number,
    base: EngagementFinanceRow,
  ): Promise<EngagementFinanceRow> {
    try {
      const eid = Math.floor(Number(engagementId));
      if (!Number.isFinite(eid) || eid < 1) return base;
      const r = await this.dataSource.query(`
        SELECT t.[ASCAP] AS ascap, t.[BMI] AS bmi, t.[SESAC] AS sesac, t.[GMR] AS gmr
        FROM dbo.Engagement e
        INNER JOIN dbo.Tour t ON t.TourID = e.TourID
        WHERE e.EngagementID = ${eid}
      `);
      const row0 = (r as Record<string, unknown>[])?.[0];
      if (!row0) return base;
      return {
        ...base,
        tourAscap: this.mapBit(pickRaw(row0, 'ascap') as boolean | number | Buffer | null | undefined),
        tourBmi: this.mapBit(pickRaw(row0, 'bmi') as boolean | number | Buffer | null | undefined),
        tourSesac: this.mapBit(pickRaw(row0, 'sesac') as boolean | number | Buffer | null | undefined),
        tourGmr: this.mapBit(pickRaw(row0, 'gmr') as boolean | number | Buffer | null | undefined),
      };
    } catch {
      return base;
    }
  }

  /**
   * Master data for engagement finance form: FK dropdowns and IAE waiver status list.
   */
  async getFinanceLookups(): Promise<EngagementFinanceLookups> {
    const allow = getIaeWaiverStatusAllowlist();
    const iaeApplicationWaiverStatuses = allow.map((v) => ({
      value: v,
      label: v,
    }));

    const nrRows = await this.listNonResidentWithholdingRowsSafe();
    const linkIds = Array.from(
      new Set(
        nrRows
          .flatMap((r) => [
            r.withholdingLinkId ?? null,
            r.artistWaiverInstructionsId ?? null,
            r.iaeWaiverInstructionsId ?? null,
          ])
          .filter(
            (id): id is number => id != null && Number.isInteger(id) && id > 0,
          ),
      ),
    );
    const links =
      linkIds.length > 0
        ? await this.linkRepo.find({ where: { linkId: In(linkIds) } })
        : [];
    const linksById = new Map(links.map((link) => [link.linkId, link]));
    // Load DMA market names for area display
    const dmaIds = Array.from(new Set(nrRows.map((r) => r.dmaid).filter((id): id is number => id != null && id > 0)));
    let dmaAreaById = new Map<number, string>();
    if (dmaIds.length > 0) {
      try {
        const dmaRows = await this.dataSource.query(
          `SELECT DMAID AS id, MIN(MarketName) AS marketName FROM dbo.DMA WHERE DMAID IN (${dmaIds.join(',')}) GROUP BY DMAID`,
        );
        dmaAreaById = new Map(
          (dmaRows as Record<string, unknown>[]).map((d) => [Number(d['id']), String(d['marketName'] ?? '')]),
        );
      } catch { /* DMA table unavailable — skip area */ }
    }
    const nonResidentWithholdings: FinanceMasterOption[] = nrRows.map((r) => ({
      id: r.withholdingId,
      label: `Withholding #${r.withholdingId} (rate ${r.withholdingTaxRate})`,
      withholdingTaxRate: String(r.withholdingTaxRate ?? ''),
      withholdingArea: r.withholdingArea ?? (r.dmaid != null ? (dmaAreaById.get(r.dmaid) ?? null) : null),
      dmaid: r.dmaid ?? null,
      taxAgencyId: r.taxAgencyId ?? null,
      withholdingAgencyName: r.withholdingAgencyName ?? null,
      withholdingPayee: r.withholdingPayee ?? null,
      paymentMethod: r.paymentMethod ?? null,
      formToAttractionUrl: r.formToAttractionUrl ?? null,
      formToMunicipalityUrl: r.formToMunicipalityUrl ?? null,
      quickBooksNumber: r.quickBooksNumber ?? null,
      canApplyForWaiver: r.canApplyForWaiver ?? null,
      iaeWaiverInstructionsText: r.iaeWaiverInstructionsText ?? null,
      completedWaiverUrl: r.completedWaiverUrl ?? null,
      iaeWaiverSubmissionDate: r.iaeWaiverSubmissionDate ?? null,
      iaeWaiverAppNumber: r.iaeWaiverAppNumber ?? null,
      iaeWaiverUrl: r.iaeWaiverUrl ?? null,
      tourWaiverUrl: r.tourWaiverUrl ?? null,
      exceptionsNotes: r.exceptionsNotes ?? null,
      withholdingLink: this.mapFinanceLink(
        r.withholdingLinkId ? linksById.get(r.withholdingLinkId) : null,
      ),
      artistWaiverInstructions: this.mapFinanceLink(
        r.artistWaiverInstructionsId
          ? linksById.get(r.artistWaiverInstructionsId)
          : null,
      ),
      iaeWaiverInstructions: this.mapFinanceLink(
        r.iaeWaiverInstructionsId
          ? linksById.get(r.iaeWaiverInstructionsId)
          : null,
      ),
    }));

    let artistFinances: FinanceMasterOption[] = [];
    try {
      const ar = await this.artistFinanceRepo.find({
        order: { artistFinanceId: 'ASC' },
        take: 5000,
      });
      artistFinances = ar.map((r) => ({
        id: r.artistFinanceId,
        label:
          (r.artistDealType?.trim() || '').slice(0, 80) ||
          `Artist finance #${r.artistFinanceId}`,
      }));
    } catch {
      try {
        const raw = await this.dataSource.query(
          `SELECT ArtistFinanceID AS id FROM dbo.ArtistFinance ORDER BY ArtistFinanceID`,
        );
        artistFinances = (raw ?? []).map((r) => ({
          id: Number(r.id),
          label: `Artist finance #${Number(r.id)}`,
        }));
      } catch {
        artistFinances = [];
      }
    }

    let settlementFinances: FinanceMasterOption[] = [];
    try {
      const sf = await this.settlementFinanceRepo.find({
        order: { settlementFinanceId: 'ASC' },
        take: 5000,
      });
      settlementFinances = sf.map((r) => {
        const parts = [r.artistSettlementStatus, r.venueSettlementStatus]
          .map((x) => (x ?? '').trim())
          .filter(Boolean);
        const hint = parts.join(' / ').slice(0, 80);
        return {
          id: r.settlementFinanceId,
          label: hint || `Settlement finance #${r.settlementFinanceId}`,
        };
      });
    } catch {
      try {
        const raw = await this.dataSource.query(
          `SELECT SettlementFinanceID AS id FROM dbo.SettlementFinance ORDER BY SettlementFinanceID`,
        );
        settlementFinances = (raw ?? []).map((r) => ({
          id: Number(r.id),
          label: `Settlement finance #${Number(r.id)}`,
        }));
      } catch {
        settlementFinances = [];
      }
    }

    let venueDealTypes: { id: number; label: string }[] = [];
    try {
      const raw = await this.dataSource.query(
        `SELECT VenueDealTypeID AS id, VenueDealTypeName AS label FROM dbo.VenueDealType ORDER BY VenueDealTypeName`,
      );
      venueDealTypes = (raw as Record<string, unknown>[] ?? [])
        .map((r) => ({
          id: Number(r['id']),
          label: String(r['label'] ?? '').trim(),
        }))
        .filter((o) => Number.isInteger(o.id) && o.id > 0 && o.label);
    } catch {
      venueDealTypes = [];
    }

    return {
      nonResidentWithholdings,
      artistFinances,
      settlementFinances,
      iaeApplicationWaiverStatuses,
      venueDealTypes,
    };
  }

  async updateNonResidentWithholdingLinks(
    withholdingId: number,
    dto: UpdateNonResidentWithholdingLinksDto,
  ): Promise<void> {
    const id = Math.floor(Number(withholdingId));
    if (!Number.isInteger(id) || id < 1) {
      throw new BadRequestException({ message: 'Invalid withholding id.' });
    }

    const row = await this.findNonResidentWithholdingByIdSafe(id);
    if (!row) {
      throw new NotFoundException({
        message: `Non-resident withholding #${id} was not found.`,
      });
    }

    let nextIaeWaiverInstructionsId = row.iaeWaiverInstructionsId;
    let nextArtistWaiverInstructionsId = row.artistWaiverInstructionsId;

    if (dto.iaeWaiverInstructionsUrl !== undefined) {
      nextIaeWaiverInstructionsId = await this.upsertUrlLink(
        dto.iaeWaiverInstructionsUrl,
        row.iaeWaiverInstructionsId,
        'IAE waiver instructions',
      );
    }
    if (dto.artistWaiverInstructionsUrl !== undefined) {
      nextArtistWaiverInstructionsId = await this.upsertUrlLink(
        dto.artistWaiverInstructionsUrl,
        row.artistWaiverInstructionsId,
        'Artist waiver instructions',
      );
    }

    await this.dataSource.query(
      `
        UPDATE [dbo].[NonResidentWithholding]
        SET
          [IAEWaiverInstructionsID] = @0,
          [ArtistWaiverInstructionsID] = @1
        WHERE [WithholdingID] = @2
      `,
      [nextIaeWaiverInstructionsId, nextArtistWaiverInstructionsId, id],
    );
  }

  async createWithholdingForEngagement(
    engagementId: number,
  ): Promise<{ withholdingId: number }> {
    const id = Math.floor(Number(engagementId));
    if (!Number.isInteger(id) || id < 1) {
      throw new BadRequestException({ message: 'Invalid engagement id.' });
    }
    await this.assertEngagementExists(id);

    return this.dataSource.transaction(async (em) => {
      const existingFinance = await em.findOne(EngagementFinances, {
        where: { engagementId: id },
      });
      const existingFinanceWithholdingId =
        existingFinance?.requiredNonResidentWithholdingId ?? null;
      const primaryEngagementVenue = await em.findOne(EngagementVenue, {
        where: { engagementId: id, isPrimary: true },
      });
      const venueCompanyId = primaryEngagementVenue?.venueCompanyId ?? null;
      const venue =
        venueCompanyId != null
          ? await em.findOne(Venue, { where: { companyId: venueCompanyId } })
          : null;

      if (existingFinanceWithholdingId != null) {
        const existingWithholding =
          await this.findNonResidentWithholdingByIdSafe(
            existingFinanceWithholdingId,
            em,
          );
        if (existingWithholding) {
          if (venue && venue.nonResidentWithholdingId == null) {
            venue.nonResidentWithholdingId = existingWithholding.withholdingId;
            await em.save(Venue, venue);
          }
          return { withholdingId: existingWithholding.withholdingId };
        }
      }

      const venueWithholdingId = venue?.nonResidentWithholdingId ?? null;
      let venueWithholdingMissing = false;
      if (venueWithholdingId != null) {
        const venueWithholding = await this.findNonResidentWithholdingByIdSafe(
          venueWithholdingId,
          em,
        );
        if (venueWithholding) {
          const finance =
            existingFinance ??
            em.create(EngagementFinances, { engagementId: id });
          finance.requiredNonResidentWithholdingId =
            venueWithholding.withholdingId;
          await em.save(EngagementFinances, finance);
          return { withholdingId: venueWithholding.withholdingId };
        }
        venueWithholdingMissing = true;
      }

      const venueCompany =
        venueCompanyId != null
          ? await em.findOne(Company, { where: { companyId: venueCompanyId } })
          : null;
      const hasDmaId = await this.nonResidentWithholdingHasDmaId();
      let savedWithholdingId: number | null = null;
      if (hasDmaId) {
        const withholding = em.create(NonResidentWithholding, {
          withholdingTaxRate: '0',
          dmaid: venueCompany?.dmaid ?? null,
          taxAgencyId: null,
          withholdingLinkId: null,
          artistWaiverInstructionsId: null,
          iaeWaiverInstructionsId: null,
        });
        const savedWithholding = await em.save(
          NonResidentWithholding,
          withholding,
        );
        savedWithholdingId = savedWithholding.withholdingId;
      } else {
        const inserted = await em.query(
          `
            INSERT INTO [dbo].[NonResidentWithholding]
              ([WithholdingTaxRate], [TaxAgencyID], [WithholdingLinkID], [ArtistWaiverInstructionsID], [IAEWaiverInstructionsID])
            VALUES (@0, @1, @2, @3, @4);
            SELECT CAST(SCOPE_IDENTITY() AS int) AS withholdingId;
          `,
          ['0', null, null, null, null],
        );
        savedWithholdingId = Number(inserted?.[0]?.withholdingId ?? NaN);
      }
      if (!Number.isInteger(savedWithholdingId) || savedWithholdingId < 1) {
        throw new BadRequestException({
          message: 'Could not create a withholding record.',
        });
      }

      const finance =
        existingFinance ?? em.create(EngagementFinances, { engagementId: id });
      finance.requiredNonResidentWithholdingId = savedWithholdingId;
      await em.save(EngagementFinances, finance);

      if (
        venue &&
        (venue.nonResidentWithholdingId == null || venueWithholdingMissing)
      ) {
        venue.nonResidentWithholdingId = savedWithholdingId;
        await em.save(Venue, venue);
      }

      return { withholdingId: savedWithholdingId };
    });
  }

  private async assertFinanceFks(
    dto: UpdateEngagementFinanceDto,
  ): Promise<void> {
    if (dto.requiredNonResidentWithholdingId !== undefined) {
      const id = dto.requiredNonResidentWithholdingId;
      if (id != null) {
        await this.assertNonResidentWithholdingExists(id);
      }
    }
    if (dto.artistFinanceId !== undefined) {
      const id = dto.artistFinanceId;
      if (id != null) {
        const found = await this.artistFinanceRepo.findOne({
          where: { artistFinanceId: id },
        });
        if (!found) {
          throw new BadRequestException({
            message: `Artist finance #${id} was not found.`,
          });
        }
      }
    }
    if (dto.settlementFinanceId !== undefined) {
      const id = dto.settlementFinanceId;
      if (id != null) {
        const found = await this.settlementFinanceRepo.findOne({
          where: { settlementFinanceId: id },
        });
        if (!found) {
          throw new BadRequestException({
            message: `Settlement finance #${id} was not found.`,
          });
        }
      }
    }
  }

  async upsertFinance(
    engagementId: number,
    dto: UpdateEngagementFinanceDto,
  ): Promise<void> {
    const engagementRow = await this.assertEngagementExists(engagementId);
    await this.assertFinanceFks(dto);

    let engagementDirty = false;
    if (dto.sellableCapacity !== undefined) {
      engagementRow.sellableCapacity =
        dto.sellableCapacity == null ? null : dto.sellableCapacity;
      engagementDirty = true;
    }
    if (dto.grossPotential !== undefined) {
      engagementRow.grossPotential =
        dto.grossPotential == null ? null : dto.grossPotential;
      engagementDirty = true;
    }
    if (engagementDirty) {
      await this.engagementRepo.save(engagementRow);
    }

    const existing = await this.engagementFinancesRepo.findOne({
      where: { engagementId },
    });
    const row =
      existing ?? this.engagementFinancesRepo.create({ engagementId });

    if (dto.artistFinanceId !== undefined) {
      row.artistFinanceId = dto.artistFinanceId;
    }

    if (dto.estimatedBreakeven !== undefined) {
      row.estimatedBreakeven =
        dto.estimatedBreakeven == null ? null : dto.estimatedBreakeven;
    }
    const promoterProfitPercentToPersist =
      dto.promoterProfit !== undefined
        ? dto.promoterProfit
        : dto.artistPromoterProfitPercent;
    if (promoterProfitPercentToPersist !== undefined) {
      row.promoterProfit =
        promoterProfitPercentToPersist == null
          ? null
          : promoterProfitPercentToPersist;
    }
    if (dto.venueTerms !== undefined) {
      const t = dto.venueTerms;
      row.venueTerms = t == null || t === '' ? null : t;
    }
    if (dto.confirmationPacketApproved !== undefined) {
      row.confirmationPacketApproved = dto.confirmationPacketApproved;
    }
    if (dto.iaeWaiverApplicationConfirmationNumber !== undefined) {
      const t = dto.iaeWaiverApplicationConfirmationNumber;
      row.iaeWaiverApplicationConfirmationNumber =
        t == null || t.trim() === '' ? null : t.trim().slice(0, 100);
    }
    if (dto.iaeWaiverApplicationSubmissionDate !== undefined) {
      row.iaeWaiverApplicationSubmissionDate = this.assertYmdOrNull(
        dto.iaeWaiverApplicationSubmissionDate,
      );
    }
    if (dto.iaeApplicationWaiverStatus !== undefined) {
      const t = dto.iaeApplicationWaiverStatus;
      row.iaeApplicationWaiverStatus =
        t == null || t.trim() === '' ? null : t.trim();
    }
    if (dto.dateFundsReceived !== undefined) {
      row.dateFundsReceived = this.assertYmdOrNull(dto.dateFundsReceived);
    }
    if (dto.fundsDue !== undefined) {
      row.fundsDue = dto.fundsDue == null ? null : dto.fundsDue;
    }
    if (dto.fundsWithheld !== undefined) {
      row.fundsWithheld = dto.fundsWithheld == null ? null : dto.fundsWithheld;
    }
    if (dto.fundsOwed !== undefined) {
      row.fundsOwed = dto.fundsOwed == null ? null : dto.fundsOwed;
    }
    if (dto.receivableBankAccount !== undefined) {
      const t = dto.receivableBankAccount;
      row.receivableBankAccount =
        t == null || t.trim() === '' ? null : t.trim();
    }
    if (dto.requiredNonResidentWithholdingId !== undefined) {
      row.requiredNonResidentWithholdingId =
        dto.requiredNonResidentWithholdingId;
    }
    if (dto.settlementFinanceId !== undefined) {
      row.settlementFinanceId = dto.settlementFinanceId;
    }
    if (dto.salesTaxRemittedBy !== undefined) {
      const t = dto.salesTaxRemittedBy;
      row.salesTaxRemittedBy = t == null || t.trim() === '' ? null : t.trim().slice(0, 100);
    }
    if (dto.venueSettlementFileSharePointLink !== undefined) {
      const t = dto.venueSettlementFileSharePointLink;
      row.venueSettlementFileSharePointLink = t == null || t.trim() === '' ? null : t.trim().slice(0, 2048);
    }
    if (dto.partnerSettlementFileSharePointLink !== undefined) {
      const t = dto.partnerSettlementFileSharePointLink;
      row.partnerSettlementFileSharePointLink = t == null || t.trim() === '' ? null : t.trim().slice(0, 2048);
    }

    const touchesArtistMaster =
      dto.artistDealType !== undefined ||
      dto.artistGuarantee !== undefined ||
      dto.artistMiddleMoney !== undefined ||
      dto.artistRoyaltyVariableFee !== undefined ||
      dto.artistBackEndTerms !== undefined ||
      dto.artistRoyaltyRatePercent !== undefined ||
      dto.artistRoyaltyBasedOn !== undefined ||
      dto.artistVersusPercent !== undefined ||
      dto.artistPromoterProfitPercent !== undefined ||
      dto.artistBackendPercent !== undefined ||
      dto.artistPartOfCollateralizedDeal !== undefined ||
      dto.artistBuyouts !== undefined ||
      dto.artistTourOfferLink !== undefined;

    if (touchesArtistMaster) {
      let afId = row.artistFinanceId;
      if (afId == null) {
        const created = this.artistFinanceRepo.create({
          artistDealType:
            dto.artistDealType === undefined
              ? null
              : dto.artistDealType == null || dto.artistDealType.trim() === ''
                ? null
                : dto.artistDealType.trim().slice(0, 100),
          artistGuarantee:
            dto.artistGuarantee === undefined
              ? null
              : dto.artistGuarantee == null
                ? null
                : dto.artistGuarantee,
          artistMiddleMoney:
            dto.artistMiddleMoney === undefined
              ? null
              : dto.artistMiddleMoney == null
                ? null
                : dto.artistMiddleMoney,
          artistRoyaltyVariableFee: dto.artistVersusPercent !== undefined
            ? (dto.artistVersusPercent != null ? String(dto.artistVersusPercent) : null)
            : null,
          overagePercent: dto.overagePercent !== undefined
            ? (dto.overagePercent == null ? null : dto.overagePercent)
            : null,
          artistBackEndTerms: dto.artistBackendPercent !== undefined
            ? (dto.artistBackendPercent != null ? String(dto.artistBackendPercent) : null)
            : null,
          royaltyRate: dto.artistRoyaltyRatePercent !== undefined ? dto.artistRoyaltyRatePercent : null,
          royaltyBasis: dto.artistRoyaltyBasedOn !== undefined ? (dto.artistRoyaltyBasedOn?.trim() || null) : null,
          isCollateralizedDeal: dto.artistPartOfCollateralizedDeal !== undefined
            ? (dto.artistPartOfCollateralizedDeal ?? null)
            : null,
          buyoutAmount: dto.artistBuyouts !== undefined
            ? (dto.artistBuyouts == null ? null : dto.artistBuyouts)
            : null,
          tourOfferLinkId: null,
        });
        // Handle tour offer link via Link table
        if (dto.artistTourOfferLink !== undefined) {
          const linkId = await this.upsertUrlLink(dto.artistTourOfferLink, null, 'Tour Offer');
          created.tourOfferLinkId = linkId;
        }
        const savedAf = await this.artistFinanceRepo.save(created);
        afId = savedAf.artistFinanceId;
        row.artistFinanceId = afId;
      } else {
        const af = await this.artistFinanceRepo.findOne({
          where: { artistFinanceId: afId },
        });
        if (!af) {
          throw new BadRequestException({
            message: `Artist finance #${afId} was not found.`,
          });
        }
        if (dto.artistDealType !== undefined) {
          const t = dto.artistDealType;
          af.artistDealType =
            t == null || t.trim() === '' ? null : t.trim().slice(0, 100);
        }
        if (dto.artistGuarantee !== undefined) {
          af.artistGuarantee =
            dto.artistGuarantee == null ? null : dto.artistGuarantee;
        }
        if (dto.artistMiddleMoney !== undefined) {
          af.artistMiddleMoney =
            dto.artistMiddleMoney == null ? null : dto.artistMiddleMoney;
        }
        if (dto.artistVersusPercent !== undefined) {
          af.artistRoyaltyVariableFee =
            dto.artistVersusPercent != null ? String(dto.artistVersusPercent) : null;
        }
        if (dto.overagePercent !== undefined) {
          af.overagePercent =
            dto.overagePercent == null ? null : dto.overagePercent;
        }
        if (dto.artistBackendPercent !== undefined) {
          af.artistBackEndTerms =
            dto.artistBackendPercent != null ? String(dto.artistBackendPercent) : null;
        }
        if (dto.artistRoyaltyRatePercent !== undefined) {
          af.royaltyRate = dto.artistRoyaltyRatePercent;
        }
        if (dto.artistRoyaltyBasedOn !== undefined) {
          af.royaltyBasis = dto.artistRoyaltyBasedOn?.trim() || null;
        }
        if (dto.artistPartOfCollateralizedDeal !== undefined) {
          af.isCollateralizedDeal = dto.artistPartOfCollateralizedDeal ?? null;
        }
        if (dto.artistBuyouts !== undefined) {
          af.buyoutAmount = dto.artistBuyouts == null ? null : dto.artistBuyouts;
        }
        if (dto.artistTourOfferLink !== undefined) {
          const linkId = await this.upsertUrlLink(dto.artistTourOfferLink, af.tourOfferLinkId, 'Tour Offer');
          af.tourOfferLinkId = linkId;
        }
        await this.artistFinanceRepo.save(af);
      }
    }

    const touchesSettlementMaster =
      dto.artistSettlementStatus !== undefined ||
      dto.venueSettlementStatus !== undefined ||
      dto.subscriptionSalesRevenueTotal !== undefined ||
      dto.seasonTicketSalesByIae !== undefined ||
      dto.seasonTicketFundsTransferred !== undefined ||
      dto.netBoxOfficeFundsDepositedAccount !== undefined ||
      dto.hstCollectedFromTicketSales !== undefined ||
      dto.hstPaidOnTourPayments !== undefined ||
      dto.hstPaidOnShowExpenses !== undefined ||
      dto.hstPaidOnVenueExpenses !== undefined ||
      dto.artistGrossTaxableCompensation !== undefined ||
      dto.amountDueToDeptOfRevenue !== undefined ||
      dto.checkNumberOrConfOfWithholdingPayment !== undefined ||
      dto.finalGuaranteeAmount !== undefined ||
      dto.finalRoyaltyAmount !== undefined ||
      dto.finalOverageAmount !== undefined ||
      dto.finalBuyoutAmount !== undefined ||
      dto.finalDirectCompanyCharges !== undefined ||
      dto.finalReimbursables !== undefined;

    if (touchesSettlementMaster) {
      let sfId = row.settlementFinanceId;
      if (sfId == null) {
        const created = this.settlementFinanceRepo.create({
          artistSettlementStatus:
            dto.artistSettlementStatus === undefined
              ? null
              : dto.artistSettlementStatus == null ||
                  String(dto.artistSettlementStatus).trim() === ''
                ? null
                : String(dto.artistSettlementStatus).trim().slice(0, 50),
          venueSettlementStatus:
            dto.venueSettlementStatus === undefined
              ? null
              : dto.venueSettlementStatus == null ||
                  String(dto.venueSettlementStatus).trim() === ''
                ? null
                : String(dto.venueSettlementStatus).trim().slice(0, 50),
          subscriptionSalesRevenueTotal:
            dto.subscriptionSalesRevenueTotal === undefined
              ? null
              : dto.subscriptionSalesRevenueTotal == null
                ? null
                : dto.subscriptionSalesRevenueTotal,
          seasonTicketSalesByIae:
            dto.seasonTicketSalesByIae === undefined
              ? null
              : dto.seasonTicketSalesByIae == null
                ? null
                : dto.seasonTicketSalesByIae,
          seasonTicketFundsTransferred:
            dto.seasonTicketFundsTransferred === undefined
              ? null
              : dto.seasonTicketFundsTransferred == null
                ? null
                : dto.seasonTicketFundsTransferred,
          netBoxOfficeFundsDepositedAccount:
            dto.netBoxOfficeFundsDepositedAccount === undefined
              ? null
              : dto.netBoxOfficeFundsDepositedAccount == null ||
                  String(dto.netBoxOfficeFundsDepositedAccount).trim() === ''
                ? null
                : String(dto.netBoxOfficeFundsDepositedAccount)
                    .trim()
                    .slice(0, 255),
          hstCollectedFromTicketSales:
            dto.hstCollectedFromTicketSales === undefined
              ? null
              : dto.hstCollectedFromTicketSales == null
                ? null
                : dto.hstCollectedFromTicketSales,
          hstPaidOnTourPayments:
            dto.hstPaidOnTourPayments === undefined
              ? null
              : dto.hstPaidOnTourPayments == null
                ? null
                : dto.hstPaidOnTourPayments,
          hstPaidOnShowExpenses:
            dto.hstPaidOnShowExpenses === undefined
              ? null
              : dto.hstPaidOnShowExpenses == null
                ? null
                : dto.hstPaidOnShowExpenses,
          hstPaidOnVenueExpenses:
            dto.hstPaidOnVenueExpenses === undefined
              ? null
              : dto.hstPaidOnVenueExpenses == null
                ? null
                : dto.hstPaidOnVenueExpenses,
          artistGrossTaxableCompensation:
            dto.artistGrossTaxableCompensation === undefined
              ? null
              : dto.artistGrossTaxableCompensation == null
                ? null
                : dto.artistGrossTaxableCompensation,
          amountDueToDeptOfRevenue:
            dto.amountDueToDeptOfRevenue === undefined
              ? null
              : dto.amountDueToDeptOfRevenue == null
                ? null
                : dto.amountDueToDeptOfRevenue,
          checkNumberOrConfOfWithholdingPayment:
            dto.checkNumberOrConfOfWithholdingPayment === undefined
              ? null
              : dto.checkNumberOrConfOfWithholdingPayment == null ||
                  String(dto.checkNumberOrConfOfWithholdingPayment).trim() ===
                    ''
                ? null
                : String(dto.checkNumberOrConfOfWithholdingPayment)
                    .trim()
                    .slice(0, 100),
          finalGuaranteeAmount:
            dto.finalGuaranteeAmount === undefined ? null : dto.finalGuaranteeAmount ?? null,
          finalRoyaltyAmount:
            dto.finalRoyaltyAmount === undefined ? null : dto.finalRoyaltyAmount ?? null,
          finalOverageAmount:
            dto.finalOverageAmount === undefined ? null : dto.finalOverageAmount ?? null,
          finalBuyoutAmount:
            dto.finalBuyoutAmount === undefined ? null : dto.finalBuyoutAmount ?? null,
          directCompanyCharges:
            dto.finalDirectCompanyCharges === undefined ? null : dto.finalDirectCompanyCharges ?? null,
          reimbursables:
            dto.finalReimbursables === undefined ? null : dto.finalReimbursables ?? null,
        });
        const savedSf = await this.settlementFinanceRepo.save(created);
        sfId = savedSf.settlementFinanceId;
        row.settlementFinanceId = sfId;
      } else {
        const sf = await this.settlementFinanceRepo.findOne({
          where: { settlementFinanceId: sfId },
        });
        if (!sf) {
          throw new BadRequestException({
            message: `Settlement finance #${sfId} was not found.`,
          });
        }
        if (dto.artistSettlementStatus !== undefined) {
          const t = dto.artistSettlementStatus;
          sf.artistSettlementStatus =
            t == null || String(t).trim() === ''
              ? null
              : String(t).trim().slice(0, 50);
        }
        if (dto.venueSettlementStatus !== undefined) {
          const t = dto.venueSettlementStatus;
          sf.venueSettlementStatus =
            t == null || String(t).trim() === ''
              ? null
              : String(t).trim().slice(0, 50);
        }
        if (dto.subscriptionSalesRevenueTotal !== undefined) {
          sf.subscriptionSalesRevenueTotal =
            dto.subscriptionSalesRevenueTotal == null
              ? null
              : dto.subscriptionSalesRevenueTotal;
        }
        if (dto.seasonTicketSalesByIae !== undefined) {
          sf.seasonTicketSalesByIae =
            dto.seasonTicketSalesByIae == null
              ? null
              : dto.seasonTicketSalesByIae;
        }
        if (dto.seasonTicketFundsTransferred !== undefined) {
          sf.seasonTicketFundsTransferred =
            dto.seasonTicketFundsTransferred == null
              ? null
              : dto.seasonTicketFundsTransferred;
        }
        if (dto.netBoxOfficeFundsDepositedAccount !== undefined) {
          const t = dto.netBoxOfficeFundsDepositedAccount;
          sf.netBoxOfficeFundsDepositedAccount =
            t == null || String(t).trim() === ''
              ? null
              : String(t).trim().slice(0, 255);
        }
        if (dto.hstCollectedFromTicketSales !== undefined) {
          sf.hstCollectedFromTicketSales =
            dto.hstCollectedFromTicketSales == null
              ? null
              : dto.hstCollectedFromTicketSales;
        }
        if (dto.hstPaidOnTourPayments !== undefined) {
          sf.hstPaidOnTourPayments =
            dto.hstPaidOnTourPayments == null
              ? null
              : dto.hstPaidOnTourPayments;
        }
        if (dto.hstPaidOnShowExpenses !== undefined) {
          sf.hstPaidOnShowExpenses =
            dto.hstPaidOnShowExpenses == null
              ? null
              : dto.hstPaidOnShowExpenses;
        }
        if (dto.hstPaidOnVenueExpenses !== undefined) {
          sf.hstPaidOnVenueExpenses =
            dto.hstPaidOnVenueExpenses == null
              ? null
              : dto.hstPaidOnVenueExpenses;
        }
        if (dto.artistGrossTaxableCompensation !== undefined) {
          sf.artistGrossTaxableCompensation =
            dto.artistGrossTaxableCompensation == null
              ? null
              : dto.artistGrossTaxableCompensation;
        }
        if (dto.amountDueToDeptOfRevenue !== undefined) {
          sf.amountDueToDeptOfRevenue =
            dto.amountDueToDeptOfRevenue == null
              ? null
              : dto.amountDueToDeptOfRevenue;
        }
        if (dto.checkNumberOrConfOfWithholdingPayment !== undefined) {
          const t = dto.checkNumberOrConfOfWithholdingPayment;
          sf.checkNumberOrConfOfWithholdingPayment =
            t == null || String(t).trim() === ''
              ? null
              : String(t).trim().slice(0, 100);
        }
        if (dto.finalGuaranteeAmount !== undefined) {
          sf.finalGuaranteeAmount = dto.finalGuaranteeAmount ?? null;
        }
        if (dto.finalRoyaltyAmount !== undefined) {
          sf.finalRoyaltyAmount = dto.finalRoyaltyAmount ?? null;
        }
        if (dto.finalOverageAmount !== undefined) {
          sf.finalOverageAmount = dto.finalOverageAmount ?? null;
        }
        if (dto.finalBuyoutAmount !== undefined) {
          sf.finalBuyoutAmount = dto.finalBuyoutAmount ?? null;
        }
        if (dto.finalDirectCompanyCharges !== undefined) {
          sf.directCompanyCharges = dto.finalDirectCompanyCharges ?? null;
        }
        if (dto.finalReimbursables !== undefined) {
          sf.reimbursables = dto.finalReimbursables ?? null;
        }
        await this.settlementFinanceRepo.save(sf);
      }
    }

    await this.engagementFinancesRepo.save(row);
    await this.tryPersistFinanceMarketingBudget(row.financeId, dto);
    await this.tryPersistFinanceDealStructures(row.financeId, dto);
    await this.tryPersistFinanceSharePointLinks(row.financeId, dto);
    await this.tryPersistFinanceBookingFields(row.financeId, dto);
    await this.tryPersistFinanceEventBusinessFields(row.financeId, dto);
    await this.tryPersistAnnouncementDateToProduction(engagementId, dto);
  }

  async create(dto: CreateEngagementDto): Promise<{ engagementId: number }> {
    // Validate tour — load attraction name for later folder naming
    const tour = await this.tourRepo.findOne({
      where: { tourId: dto.tourId },
      relations: ['attraction'],
    });
    if (!tour) {
      throw new BadRequestException({
        message: `Tour #${dto.tourId} does not exist.`,
      });
    }

    // Validate venues before transaction
    await this.assertVenueCompany(dto.primaryVenueCompanyId);
    if (dto.secondaryVenueCompanyIds?.length) {
      for (const secId of dto.secondaryVenueCompanyIds) {
        if (secId === dto.primaryVenueCompanyId) {
          throw new BadRequestException({
            message: `Secondary venue #${secId} is the same as the primary venue.`,
          });
        }
        await this.assertVenueCompany(secId);
      }
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const row = manager.create(Engagement, {
        engagementStatus: dto.engagementStatus.trim(),
        engagementScaling: null,
        tourId: dto.tourId,
      });
      const saved = await manager.save(Engagement, row);

      await manager.save(
        EngagementVenue,
        manager.create(EngagementVenue, {
          engagementId: saved.engagementId,
          venueCompanyId: dto.primaryVenueCompanyId,
          isPrimary: true,
        }),
      );

      for (const secId of dto.secondaryVenueCompanyIds ?? []) {
        await manager.save(
          EngagementVenue,
          manager.create(EngagementVenue, {
            engagementId: saved.engagementId,
            venueCompanyId: secId,
            isPrimary: false,
          }),
        );
      }

      const perfStatus =
        dto.engagementStatus === 'Private' || dto.engagementStatus === 'Public'
          ? dto.engagementStatus
          : 'Public';
      await manager.save(
        Performance,
        manager.create(Performance, {
          engagementId: saved.engagementId,
          performanceDate: dto.openingShowDate,
          performanceTime: this.normalizeTime(dto.openingShowTime),
          performanceStatus: perfStatus,
        }),
      );

      this.emsCreated.recordEngagement(saved.engagementId);

      // Auto-set IsCanadaEngagement based on primary venue country
      try {
        const venueCompany = await manager.findOne(Company, {
          where: { companyId: dto.primaryVenueCompanyId },
          relations: ['physicalAddress'],
        });
        const country = venueCompany?.physicalAddress?.country?.trim().toLowerCase() ?? '';
        const finance = manager.create(EngagementFinances, {
          engagementId: saved.engagementId,
          isCanadaEngagement: country === 'canada' || country === 'ca' || country === 'can' || country === 'cdn',
        });
        await manager.save(EngagementFinances, finance);
      } catch { /* non-critical — finance row will be created later if needed */ }

      return { engagementId: saved.engagementId };
    });

    // If status is Confirmed, create SharePoint folder structure
    if (dto.engagementStatus === 'Confirmed') {
      const engagementId = result.engagementId;
      try {
        const primaryVenue = await this.companyRepo.findOne({
          where: { companyId: dto.primaryVenueCompanyId },
          relations: ['dma'],
        });
        const year = (dto.openingShowDate || new Date().toISOString().slice(0, 10)).slice(0, 4);
        const marketName = primaryVenue?.dma?.marketName ?? null;
        const attractionName = tour.attraction?.attractionName ?? null;

        const hierarchies = buildEngagementFolderHierarchies(year, marketName, attractionName);

        let rootWebUrl = '';
        for (const hierarchy of hierarchies) {
          const folder = await this.documentLibrary.ensureFolderHierarchy(hierarchy);
          if (!rootWebUrl) {
            rootWebUrl = folder.webUrl;
          }
        }

        // Store the root folder link
        if (rootWebUrl) {
          const rootSegments = hierarchies[0]?.slice(0, -1) ?? [];
          const folderPath = rootSegments.length > 0 ? rootSegments.join('/') : 'Engagements';
          await this.upsertEngagementLink(engagementId, {
            linkUrl: rootWebUrl,
            linkName: `Engagement #${engagementId} Files`,
            linkPurpose: 'EngagementFolder',
            linkPath: folderPath,
          });
        }

        this.logger.log(`[SharePoint] Created folder structure for engagement ${engagementId}: ${rootWebUrl}`);
      } catch (err) {
        this.logger.error(
          `[SharePoint] Failed to create folders for engagement ${engagementId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return result;
  }

  /**
   * Returns the SharePoint folder link for an engagement, if one exists.
   */
  async getSharePointFolderLink(engagementId: number): Promise<{ linkUrl: string | null; linkName: string | null }> {
    const el = await this.engagementLinkRepo.findOne({
      where: { engagementId, linkPurpose: 'EngagementFolder' },
      relations: ['link'],
    });
    if (!el?.link) return { linkUrl: null, linkName: null };
    return { linkUrl: el.link.linkUrl, linkName: el.link.linkName };
  }

  /**
   * Ensures the SharePoint folder structure exists for a given engagement.
   * Can be called manually to retry if folder creation failed during initial creation.
   */
  async ensureSharePointFolders(engagementId: number): Promise<{ rootWebUrl: string }> {
    const engagement = await this.assertEngagementExists(engagementId);
    const tour = await this.tourRepo.findOne({
      where: { tourId: engagement.tourId },
      relations: ['attraction'],
    });
    if (!tour) {
      throw new BadRequestException({ message: `Tour #${engagement.tourId} for engagement ${engagementId} not found.` });
    }

    const primaryVenue = await this.engagementVenueRepo.findOne({
      where: { engagementId, isPrimary: true },
    });
    let marketName: string | null = null;
    if (primaryVenue) {
      const company = await this.companyRepo.findOne({
        where: { companyId: primaryVenue.venueCompanyId },
        relations: ['dma'],
      });
      marketName = company?.dma?.marketName ?? null;
    }

    // Get the opening performance date for the year
    const openingPerf = await this.performanceRepo.findOne({
      where: { engagementId },
      order: { performanceDate: 'ASC' },
    });
    const year = openingPerf?.performanceDate
      ? String(openingPerf.performanceDate).slice(0, 4)
      : new Date().getFullYear().toString();

    const attractionName = tour.attraction?.attractionName ?? null;
    const hierarchies = buildEngagementFolderHierarchies(year, marketName, attractionName);

    let rootWebUrl = '';
    for (const hierarchy of hierarchies) {
      const folder = await this.documentLibrary.ensureFolderHierarchy(hierarchy);
      if (!rootWebUrl) {
        rootWebUrl = folder.webUrl;
      }
    }

    // Upsert the root folder link
    if (rootWebUrl) {
      await this.upsertEngagementLink(engagementId, {
        linkUrl: rootWebUrl,
        linkName: `Engagement #${engagementId} Files`,
        linkPurpose: 'EngagementFolder',
      });
    }

    this.logger.log(`[SharePoint] Folder structure for engagement ${engagementId}: ${rootWebUrl}`);
    return { rootWebUrl };
  }

  async update(id: number, dto: UpdateEngagementDto): Promise<void> {
    const existing = await this.assertEngagementExists(id);

    if (dto.tourId !== undefined) {
      const tour = await this.tourRepo.findOne({
        where: { tourId: dto.tourId },
      });
      if (!tour) {
        throw new BadRequestException({
          message: `Tour #${dto.tourId} does not exist.`,
        });
      }
      existing.tourId = dto.tourId;
    }

    if (dto.engagementStatus !== undefined) {
      existing.engagementStatus = dto.engagementStatus.trim();
    }

    if (dto.engagementScaling !== undefined) {
      const t = dto.engagementScaling;
      existing.engagementScaling =
        t == null || String(t).trim() === ''
          ? null
          : String(t).trim().slice(0, 50);
    }

    if (dto.sellableCapacity !== undefined) {
      existing.sellableCapacity =
        dto.sellableCapacity == null ? null : dto.sellableCapacity;
    }
    if (dto.grossPotential !== undefined) {
      existing.grossPotential =
        dto.grossPotential == null ? null : dto.grossPotential;
    }

    if (dto.tourManagerContactId !== undefined) {
      existing.tourManagerContactId =
        dto.tourManagerContactId == null ? null : dto.tourManagerContactId;
    }

    await this.engagementRepo.save(existing);

    // Update primary venue if requested
    if (dto.primaryVenueCompanyId != null) {
      await this.assertVenueCompany(dto.primaryVenueCompanyId);

      await this.dataSource.transaction(async (manager) => {
        // Demote existing primary
        const current = await manager.findOne(EngagementVenue, {
          where: { engagementId: id, isPrimary: true },
        });
        if (current && current.venueCompanyId !== dto.primaryVenueCompanyId) {
          current.isPrimary = false;
          await manager.save(EngagementVenue, current);
        }

        // Promote or insert new primary
        const targetRow = await manager.findOne(EngagementVenue, {
          where: {
            engagementId: id,
            venueCompanyId: dto.primaryVenueCompanyId,
          },
        });
        if (targetRow) {
          targetRow.isPrimary = true;
          await manager.save(EngagementVenue, targetRow);
        } else {
          await manager.save(
            EngagementVenue,
            manager.create(EngagementVenue, {
              engagementId: id,
              venueCompanyId: dto.primaryVenueCompanyId,
              isPrimary: true,
            }),
          );
        }
      });
    }

    // Sync IsCanadaEngagement based on primary venue country
    try {
      const primaryVenueId = dto.primaryVenueCompanyId
        ?? (await this.dataSource.getRepository(EngagementVenue).findOne({
            where: { engagementId: id, isPrimary: true },
          }))?.venueCompanyId
        ?? null;
      if (primaryVenueId != null) {
        const venueCompany = await this.dataSource.getRepository(Company).findOne({
          where: { companyId: primaryVenueId },
          relations: ['physicalAddress'],
        });
        const country = venueCompany?.physicalAddress?.country?.trim().toLowerCase() ?? '';
        const isCanada = country === 'canada' || country === 'ca' || country === 'can' || country === 'cdn';
        const existingFinance = await this.engagementFinancesRepo.findOne({ where: { engagementId: id } });
        if (existingFinance) {
          existingFinance.isCanadaEngagement = isCanada;
          await this.engagementFinancesRepo.save(existingFinance);
        } else {
          await this.engagementFinancesRepo.save(
            this.engagementFinancesRepo.create({ engagementId: id, isCanadaEngagement: isCanada }),
          );
        }
      }
    } catch { /* non-critical */ }

    if (
      dto.rehearsalDate !== undefined ||
      dto.loadInDate !== undefined ||
      dto.rehearsalTime !== undefined ||
      dto.loadInTime !== undefined
    ) {
      const rows = await this.engagementProductionRepo.find({
        where: { engagementId: id },
        order: { productionId: 'DESC' },
        take: 1,
      });
      let prod = rows[0] ?? null;
      if (!prod) {
        prod = this.engagementProductionRepo.create({
          engagementId: id,
          rehearsalDate: null,
          loadInDate: null,
        });
      }
      if (dto.rehearsalDate !== undefined) {
        prod.rehearsalDate =
          dto.rehearsalDate == null || dto.rehearsalDate === ''
            ? null
            : this.assertYmdOrNull(dto.rehearsalDate);
      }
      if (dto.loadInDate !== undefined) {
        prod.loadInDate =
          dto.loadInDate == null || dto.loadInDate === ''
            ? null
            : this.assertYmdOrNull(dto.loadInDate);
      }
      const savedProd = await this.engagementProductionRepo.save(prod);
      await this.tryPersistEngagementProductionTimes(savedProd.productionId, dto);
    }

    // Trigger SharePoint folder creation when status transitions to Confirmed
    if (
      dto.engagementStatus === 'Confirmed' &&
      existing.engagementStatus !== 'Confirmed'
    ) {
      void this.ensureSharePointFolders(id).catch((err) => {
        this.logger.error(
          `[SharePoint] Failed to create folders on status update for engagement ${id}: ${err.message}`,
        );
      });
    }
  }

  /**
   * Engagements are created with one show. Whole-engagement delete is allowed only while
   * that single show remains; remove extra performances on the Performances tab first.
   */
  private async assertEngagementDeletableForDelete(
    engagementId: number,
  ): Promise<void> {
    await this.assertEngagementExists(engagementId);

    const sourceLink = await this.dataSource.manager.findOne(EngagementXref, {
      where: { engagementId },
    });
    if (sourceLink) {
      throw new BadRequestException({
        message: sourceLink.sourceEngagementId.startsWith('EngagementProject:')
          ? 'This engagement was created from a finalized project and cannot be deleted because its source project is view-only.'
          : 'This engagement is linked to an originating record and cannot be deleted.',
      });
    }

    const performanceCount = await this.performanceRepo.count({
      where: { engagementId },
    });
    if (performanceCount > 1) {
      throw new BadRequestException({
        message:
          'This engagement has more than one show date. Remove the extra performances on the Performances tab, then delete the engagement.',
      });
    }
  }

  async remove(id: number): Promise<void> {
    await this.assertEngagementDeletableForDelete(id);

    await this.dataSource.transaction(async (manager) => {
      const pids = (
        await manager.find(Performance, {
          where: { engagementId: id },
          select: { performanceId: true },
        })
      ).map((p) => p.performanceId);
      if (pids.length > 0) {
        await manager
          .createQueryBuilder()
          .delete()
          .from(TicketingSales)
          .where('performanceId IN (:...pids)', { pids })
          .execute();
        await manager
          .createQueryBuilder()
          .delete()
          .from(PerformanceTicketing)
          .where('performanceId IN (:...pids)', { pids })
          .execute();
      }
      await manager.delete(Performance, { engagementId: id });
      await manager.delete(EngagementFinances, { engagementId: id });
      await manager.delete(EngagementProduction, { engagementId: id });
      await manager.delete(EngagementVenue, { engagementId: id });
      await manager.delete(EngagementIAEContact, { engagementId: id });
      await manager.delete(Engagement, { engagementId: id });
    });

    this.emsCreated.removeEngagement(id);
  }

  // ─── Venues ───────────────────────────────────────────────────────────────

  // ── Optional-column probing (EngagementVenue extra fields) ────────────────

  private async engagementVenueHasOptionalCols(): Promise<boolean> {
    if (this.engagementVenueOptionalColsPresent !== null)
      return this.engagementVenueOptionalColsPresent;
    try {
      const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id=t.object_id
            INNER JOIN sys.schemas s ON t.schema_id=s.schema_id
            WHERE s.name=N'dbo' AND t.name=N'EngagementVenue' AND c.name=N'AttractionTechDirectorContactID')
        THEN 1 ELSE 0 END AS ok`);
      const raw = pickRaw((r as Record<string, unknown>[])?.[0] ?? {}, 'ok');
      this.engagementVenueOptionalColsPresent =
        raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
      return this.engagementVenueOptionalColsPresent;
    } catch {
      this.engagementVenueOptionalColsPresent = false;
      return false;
    }
  }

  private async engagementVenueHasMarketingCols(): Promise<boolean> {
    if (this.engagementVenueMarketingColsPresent !== null)
      return this.engagementVenueMarketingColsPresent;
    try {
      const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id=t.object_id
            INNER JOIN sys.schemas s ON t.schema_id=s.schema_id
            WHERE s.name=N'dbo' AND t.name=N'EngagementVenue' AND c.name=N'VenueMarketingDirectorContactID')
        THEN 1 ELSE 0 END AS ok`);
      const raw = pickRaw((r as Record<string, unknown>[])?.[0] ?? {}, 'ok');
      this.engagementVenueMarketingColsPresent =
        raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
      return this.engagementVenueMarketingColsPresent;
    } catch {
      this.engagementVenueMarketingColsPresent = false;
      return false;
    }
  }

  private async engagementHasIaeMarketingCols(): Promise<boolean> {
    if (this.engagementIaeMarketingColsPresent !== null)
      return this.engagementIaeMarketingColsPresent;
    try {
      const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id=t.object_id
            INNER JOIN sys.schemas s ON t.schema_id=s.schema_id
            WHERE s.name=N'dbo' AND t.name=N'Engagement' AND c.name=N'IAEMarketingDirectorContactID')
        THEN 1 ELSE 0 END AS ok`);
      const raw = pickRaw((r as Record<string, unknown>[])?.[0] ?? {}, 'ok');
      this.engagementIaeMarketingColsPresent =
        raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
      return this.engagementIaeMarketingColsPresent;
    } catch {
      this.engagementIaeMarketingColsPresent = false;
      return false;
    }
  }

  private async tourHasMarketingCols(): Promise<boolean> {
    if (this.tourMarketingColsPresent !== null)
      return this.tourMarketingColsPresent;
    try {
      const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id=t.object_id
            INNER JOIN sys.schemas s ON t.schema_id=s.schema_id
            WHERE s.name=N'dbo' AND t.name=N'Tour' AND c.name=N'TourMarketingDirectorContactID')
        THEN 1 ELSE 0 END AS ok`);
      const raw = pickRaw((r as Record<string, unknown>[])?.[0] ?? {}, 'ok');
      this.tourMarketingColsPresent =
        raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
      return this.tourMarketingColsPresent;
    } catch {
      this.tourMarketingColsPresent = false;
      return false;
    }
  }

  private async engagementVenueHasProductionManagerCol(): Promise<boolean> {
    if (this.engagementVenueProductionManagerColPresent !== null)
      return this.engagementVenueProductionManagerColPresent;
    try {
      const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id=t.object_id
            INNER JOIN sys.schemas s ON t.schema_id=s.schema_id
            WHERE s.name=N'dbo' AND t.name=N'EngagementVenue' AND c.name=N'IaeProductionManagerContactID')
        THEN 1 ELSE 0 END AS ok`);
      const raw = pickRaw((r as Record<string, unknown>[])?.[0] ?? {}, 'ok');
      this.engagementVenueProductionManagerColPresent =
        raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
      return this.engagementVenueProductionManagerColPresent;
    } catch {
      this.engagementVenueProductionManagerColPresent = false;
      return false;
    }
  }


  private async engagementVenueHasVenueProductionManagerCol(): Promise<boolean> {
    if (this.engagementVenueVenueProductionManagerColPresent !== null)
      return this.engagementVenueVenueProductionManagerColPresent;
    try {
      const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id=t.object_id
            INNER JOIN sys.schemas s ON t.schema_id=s.schema_id
            WHERE s.name=N'dbo' AND t.name=N'EngagementVenue' AND c.name=N'VenueProductionManagerContactID')
        THEN 1 ELSE 0 END AS ok`);
      const raw = pickRaw((r as Record<string, unknown>[])?.[0] ?? {}, 'ok');
      this.engagementVenueVenueProductionManagerColPresent =
        raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
      return this.engagementVenueVenueProductionManagerColPresent;
    } catch {
      this.engagementVenueVenueProductionManagerColPresent = false;
      return false;
    }
  }

  private async readEngagementVenueVenueProductionManagerCol(
    engagementId: number,
    venueCompanyId: number,
  ): Promise<number | null> {
    if (!(await this.engagementVenueHasVenueProductionManagerCol())) return null;
    try {
      const r = await this.dataSource.query(
        `SELECT [VenueProductionManagerContactID] AS vpm
         FROM dbo.EngagementVenue
         WHERE [EngagementID]=@0 AND [VenueCompanyID]=@1`,
        [engagementId, venueCompanyId],
      );
      const row = (r as Record<string, unknown>[])?.[0];
      if (!row) return null;
      const v = pickRaw(row, 'vpm');
      const n = Number(v);
      return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  }

  private async engagementVenueHasStagehandContactCol(): Promise<boolean> {
    if (this.engagementVenueStagehandContactColPresent !== null)
      return this.engagementVenueStagehandContactColPresent;
    try {
      const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id=t.object_id
            INNER JOIN sys.schemas s ON t.schema_id=s.schema_id
            WHERE s.name=N'dbo' AND t.name=N'EngagementVenue' AND c.name=N'StagehandContactID')
        THEN 1 ELSE 0 END AS ok`);
      const raw = pickRaw((r as Record<string, unknown>[])?.[0] ?? {}, 'ok');
      this.engagementVenueStagehandContactColPresent =
        raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
      return this.engagementVenueStagehandContactColPresent;
    } catch {
      this.engagementVenueStagehandContactColPresent = false;
      return false;
    }
  }

  private async readEngagementVenueStagehandContactCol(
    engagementId: number,
    venueCompanyId: number,
  ): Promise<number | null> {
    if (!(await this.engagementVenueHasStagehandContactCol())) return null;
    try {
      const r = await this.dataSource.query(
        `SELECT [StagehandContactID] AS shc
         FROM dbo.EngagementVenue
         WHERE [EngagementID]=@0 AND [VenueCompanyID]=@1`,
        [engagementId, venueCompanyId],
      );
      const row = (r as Record<string, unknown>[])?.[0];
      if (!row) return null;
      const v = pickRaw(row, 'shc');
      const n = Number(v);
      return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  }

  private async engagementVenueHasTicketingAdminCol(): Promise<boolean> {
    if (this.engagementVenueTicketingAdminColPresent !== null)
      return this.engagementVenueTicketingAdminColPresent;
    try {
      const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id=t.object_id
            INNER JOIN sys.schemas s ON t.schema_id=s.schema_id
            WHERE s.name=N'dbo' AND t.name=N'EngagementVenue' AND c.name=N'TicketingAdminContactID')
        THEN 1 ELSE 0 END AS ok`);
      const raw = pickRaw((r as Record<string, unknown>[])?.[0] ?? {}, 'ok');
      this.engagementVenueTicketingAdminColPresent =
        raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
      return this.engagementVenueTicketingAdminColPresent;
    } catch {
      this.engagementVenueTicketingAdminColPresent = false;
      return false;
    }
  }

  private async readEngagementVenueTicketingAdminCol(
    engagementId: number,
    venueCompanyId: number,
  ): Promise<number | null> {
    if (!(await this.engagementVenueHasTicketingAdminCol())) return null;
    try {
      const r = await this.dataSource.query(
        `SELECT [TicketingAdminContactID] AS tac
         FROM dbo.EngagementVenue
         WHERE [EngagementID]=@0 AND [VenueCompanyID]=@1`,
        [engagementId, venueCompanyId],
      );
      const row = (r as Record<string, unknown>[])?.[0];
      if (!row) return null;
      const v = pickRaw(row, 'tac');
      const n = Number(v);
      return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  }

  private async venueHasSeatingChartUrlCol(): Promise<boolean> {
    if (this.venueSeatingChartUrlColPresent !== null)
      return this.venueSeatingChartUrlColPresent;
    try {
      const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id=t.object_id
            INNER JOIN sys.schemas s ON t.schema_id=s.schema_id
            WHERE s.name=N'dbo' AND t.name=N'Venue' AND c.name=N'SeatingChartUrl')
        THEN 1 ELSE 0 END AS ok`);
      const raw = pickRaw((r as Record<string, unknown>[])?.[0] ?? {}, 'ok');
      this.venueSeatingChartUrlColPresent =
        raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
      return this.venueSeatingChartUrlColPresent;
    } catch {
      this.venueSeatingChartUrlColPresent = false;
      return false;
    }
  }

  private async readVenueSeatingChartUrl(
    venueCompanyId: number,
  ): Promise<string | null> {
    if (!(await this.venueHasSeatingChartUrlCol())) return null;
    try {
      const r = await this.dataSource.query(
        `SELECT [SeatingChartUrl] AS url FROM dbo.Venue WHERE [CompanyID]=@0`,
        [venueCompanyId],
      );
      const v = pickRaw((r as Record<string, unknown>[])?.[0] ?? {}, 'url');
      return v == null || v === '' ? null : String(v);
    } catch {
      return null;
    }
  }

  private async venueHasTechPackCol(): Promise<boolean> {
    if (this.venueOptionalTechPackColPresent !== null)
      return this.venueOptionalTechPackColPresent;
    try {
      const r = await this.dataSource.query(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id=t.object_id
            INNER JOIN sys.schemas s ON t.schema_id=s.schema_id
            WHERE s.name=N'dbo' AND t.name=N'Venue' AND c.name=N'TechPackPdfUrl')
        THEN 1 ELSE 0 END AS ok`);
      const raw = pickRaw((r as Record<string, unknown>[])?.[0] ?? {}, 'ok');
      this.venueOptionalTechPackColPresent =
        raw === 1 || raw === true || raw === '1' || Number(raw) === 1;
      return this.venueOptionalTechPackColPresent;
    } catch {
      this.venueOptionalTechPackColPresent = false;
      return false;
    }
  }

  private async readEngagementVenueOptionalCols(
    engagementId: number,
    venueCompanyId: number,
  ): Promise<{
    attractionTechDirectorContactId: number | null;
    venueContractSharePointLink: string | null;
    partiallyExecutedContractSharePointLink: string | null;
    fullyExecutedContractSharePointLink: string | null;
    venueForecastSharePointLink: string | null;
  }> {
    const empty = {
      attractionTechDirectorContactId: null,
      venueContractSharePointLink: null,
      partiallyExecutedContractSharePointLink: null,
      fullyExecutedContractSharePointLink: null,
      venueForecastSharePointLink: null,
    };
    if (!(await this.engagementVenueHasOptionalCols())) return empty;
    try {
      const r = await this.dataSource.query(
        `SELECT [AttractionTechDirectorContactID] AS atd,
                [VenueContractSharePointLink] AS vc,
                [PartiallyExecutedContractSharePointLink] AS pec,
                [FullyExecutedContractSharePointLink] AS fec,
                [VenueForecastSharePointLink] AS vf
         FROM dbo.EngagementVenue
         WHERE [EngagementID]=@0 AND [VenueCompanyID]=@1`,
        [engagementId, venueCompanyId],
      );
      const row = (r as Record<string, unknown>[])?.[0];
      if (!row) return empty;
      const toInt = (v: unknown) => {
        const n = Number(v);
        return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null;
      };
      const toStr = (v: unknown) =>
        v == null || v === '' ? null : String(v).slice(0, 2048);
      return {
        attractionTechDirectorContactId: toInt(pickRaw(row, 'atd')),
        venueContractSharePointLink: toStr(pickRaw(row, 'vc')),
        partiallyExecutedContractSharePointLink: toStr(pickRaw(row, 'pec')),
        fullyExecutedContractSharePointLink: toStr(pickRaw(row, 'fec')),
        venueForecastSharePointLink: toStr(pickRaw(row, 'vf')),
      };
    } catch {
      return empty;
    }
  }

  private async readEngagementVenueMarketingCols(
    engagementId: number,
    venueCompanyId: number,
  ): Promise<{
    venueMarketingDirectorContactId: number | null;
    venueMarketingManagerContactId: number | null;
    venueDigitalMarketingManagerContactId: number | null;
  }> {
    const empty = {
      venueMarketingDirectorContactId: null,
      venueMarketingManagerContactId: null,
      venueDigitalMarketingManagerContactId: null,
    };
    if (!(await this.engagementVenueHasMarketingCols())) return empty;
    try {
      const r = await this.dataSource.query(
        `SELECT [VenueMarketingDirectorContactID] AS vmd,
                [VenueMarketingManagerContactID] AS vmm,
                [VenueDigitalMarketingManagerContactID] AS vdmm
         FROM dbo.EngagementVenue
         WHERE [EngagementID]=@0 AND [VenueCompanyID]=@1`,
        [engagementId, venueCompanyId],
      );
      const row = (r as Record<string, unknown>[])?.[0];
      if (!row) return empty;
      const toInt = (v: unknown) => {
        const n = Number(v);
        return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null;
      };
      return {
        venueMarketingDirectorContactId: toInt(pickRaw(row, 'vmd')),
        venueMarketingManagerContactId: toInt(pickRaw(row, 'vmm')),
        venueDigitalMarketingManagerContactId: toInt(pickRaw(row, 'vdmm')),
      };
    } catch {
      return empty;
    }
  }

  private async readEngagementVenueProductionManagerCol(
    engagementId: number,
    venueCompanyId: number,
  ): Promise<number | null> {
    if (!(await this.engagementVenueHasProductionManagerCol())) return null;
    try {
      const r = await this.dataSource.query(
        `SELECT [IaeProductionManagerContactID] AS ipm
         FROM dbo.EngagementVenue
         WHERE [EngagementID]=@0 AND [VenueCompanyID]=@1`,
        [engagementId, venueCompanyId],
      );
      const row = (r as Record<string, unknown>[])?.[0];
      if (!row) return null;
      const v = pickRaw(row, 'ipm');
      const n = Number(v);
      return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  }


  private async readVenueTechPackUrl(venueCompanyId: number): Promise<string | null> {
    if (!(await this.venueHasTechPackCol())) return null;
    try {
      const r = await this.dataSource.query(
        `SELECT [TechPackPdfUrl] AS url FROM dbo.Venue WHERE [CompanyID]=@0`,
        [venueCompanyId],
      );
      const v = pickRaw((r as Record<string, unknown>[])?.[0] ?? {}, 'url');
      return v == null || v === '' ? null : String(v).slice(0, 2048);
    } catch {
      return null;
    }
  }

  private async lookupContactName(contactId: number | null): Promise<string | null> {
    if (contactId == null || contactId < 1) return null;
    try {
      const r = await this.dataSource.query(
        `SELECT ci.FirstName + ' ' + ci.LastName AS fullName
         FROM dbo.Contact c
         INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
         WHERE c.ContactID = @0`,
        [contactId],
      );
      const v = pickRaw((r as Record<string, unknown>[])?.[0] ?? {}, 'fullName');
      return v == null || v === '' ? null : String(v).trim();
    } catch {
      return null;
    }
  }

  private async lookupCompanyName(companyId: number | null): Promise<string | null> {
    if (companyId == null || companyId < 1) return null;
    try {
      const company = await this.companyRepo.findOne({ where: { companyId } });
      return company?.companyName?.trim() || null;
    } catch {
      return null;
    }
  }

  async getPerformancesWithTicketingSummary(
    engagementId: number,
  ): Promise<PerformanceTicketingSummaryRow[]> {
    await this.assertEngagementExists(engagementId);
    const hasAdv = await this.performanceTicketingHasAdvancedColumns();
    const selectAdv = hasAdv
      ? ', pt.[SellableCapacity] AS sc, pt.[GrossPotentialRevenue] AS gpr'
      : '';
    const joinAdv = hasAdv
      ? 'LEFT JOIN dbo.PerformanceTicketing pt ON pt.[PerformanceID] = p.[PerformanceID]'
      : '';
    const rows = await this.dataSource.query(
      `SELECT
        p.[PerformanceID] AS pid,
        CONVERT(varchar(10), p.[PerformanceDate], 120) AS pdate,
        p.[PerformanceTime] AS ptime,
        p.[PerformanceStatus] AS pstatus
        ${selectAdv}
       FROM dbo.Performance p
       ${joinAdv}
       WHERE p.[EngagementID] = ${engagementId}
       ORDER BY p.[PerformanceDate], p.[PerformanceTime]`,
    ) as Record<string, unknown>[];
    return rows.map((r) => {
      const sc = pickRaw(r, 'sc');
      const gpr = pickRaw(r, 'gpr');
      return {
        performanceId: Number(pickRaw(r, 'pid')),
        performanceDate: String(pickRaw(r, 'pdate') ?? '').slice(0, 10),
        performanceTime: String(pickRaw(r, 'ptime') ?? ''),
        performanceStatus: String(pickRaw(r, 'pstatus') ?? ''),
        sellableCapacity: sc != null && sc !== '' ? Math.trunc(Number(sc)) : null,
        grossPotentialRevenue: gpr != null && gpr !== '' ? Number(gpr) : null,
      };
    });
  }

  async getIaeTicketingManager(
    engagementId: number,
  ): Promise<EngagementIaeTicketingManager> {
    await this.assertEngagementExists(engagementId);
    const blank: EngagementIaeTicketingManager = {
      iaeTicketingManagerContactId: null,
      iaeTicketingManagerContactName: null,
    };
    if (!(await this.engagementFinancesHasIaeTicketingManagerCol())) return blank;
    try {
      const r = await this.dataSource.query(
        `SELECT [IAETicketingManagerContactID] AS cid FROM dbo.EngagementFinances WHERE [EngagementID] = ${engagementId}`,
      );
      const row0 = (r as Record<string, unknown>[])?.[0];
      if (!row0) return blank;
      const cidRaw = pickRaw(row0, 'cid');
      const cid = cidRaw != null && cidRaw !== '' && Number.isFinite(Number(cidRaw)) ? Math.trunc(Number(cidRaw)) : null;
      const name = await this.lookupContactName(cid);
      return { iaeTicketingManagerContactId: cid, iaeTicketingManagerContactName: name };
    } catch {
      return blank;
    }
  }

  async updateIaeTicketingManager(
    engagementId: number,
    iaeTicketingManagerContactId: number | null,
  ): Promise<void> {
    await this.assertEngagementExists(engagementId);
    if (!(await this.engagementFinancesHasIaeTicketingManagerCol())) return;
    const cidSql = iaeTicketingManagerContactId == null ? 'NULL' : Math.trunc(Number(iaeTicketingManagerContactId));
    // Upsert EngagementFinances row
    await this.dataSource.query(
      `IF EXISTS (SELECT 1 FROM dbo.EngagementFinances WHERE [EngagementID] = ${engagementId})
         UPDATE dbo.EngagementFinances SET [IAETicketingManagerContactID] = ${cidSql} WHERE [EngagementID] = ${engagementId}
       ELSE
         INSERT INTO dbo.EngagementFinances ([EngagementID],[IAETicketingManagerContactID]) VALUES (${engagementId}, ${cidSql})`,
    );
  }

  async listVenues(engagementId: number): Promise<EngagementVenueRow[]> {
    await this.assertEngagementExists(engagementId);

    const evRows = await this.engagementVenueRepo.find({
      where: { engagementId },
      order: { isPrimary: 'DESC' },
    });

    if (evRows.length === 0) return [];

    const venueCompanyIds = evRows.map((ev) => ev.venueCompanyId);

    // Batch-load companies + venues (avoids N+1)
    const [companies, venues] = await Promise.all([
      this.companyRepo.find({
        where: { companyId: In(venueCompanyIds) },
        relations: ['physicalAddress', 'dma'],
      }),
      this.venueRepo.find({
        where: { companyId: In(venueCompanyIds) },
        relations: ['venueType'],
      }),
    ]);

    const companyMap = new Map(companies.map((c) => [c.companyId, c]));
    const venueMap = new Map(venues.map((v) => [v.companyId, v]));

    // Ticketing system column names (resolved once)
    const [hasOptional, hasTechPack, hasMarketing, hasProdMgr, hasVenueProdMgr, hasStagehand, hasTicketingAdmin, hasSeatingChartUrl] = await Promise.all([
      this.engagementVenueHasOptionalCols(),
      this.venueHasTechPackCol(),
      this.engagementVenueHasMarketingCols(),
      this.engagementVenueHasProductionManagerCol(),
      this.engagementVenueHasVenueProductionManagerCol(),
      this.engagementVenueHasStagehandContactCol(),
      this.engagementVenueHasTicketingAdminCol(),
      this.venueHasSeatingChartUrlCol(),
    ]);

    // Load seating chart link IDs → URLs in batch
    const seatingChartIds = venues
      .map((v) => v.seatingChartLinkId)
      .filter((id): id is number => id != null && id > 0);
    const seatingChartLinks =
      seatingChartIds.length > 0
        ? await this.linkRepo.find({ where: { linkId: In(seatingChartIds) } })
        : [];
    const seatingChartLinkMap = new Map(seatingChartLinks.map((l) => [l.linkId, l.linkUrl]));

    // Load ticketing admin from first performance for this engagement
    const firstPerf = await this.performanceRepo.findOne({
      where: { engagementId },
      order: { performanceDate: 'ASC', performanceTime: 'ASC' },
    });
    let ticketingAdminContactId: number | null = null;
    let ticketingAdminContactName: string | null = null;
    if (firstPerf) {
      const pt = await this.performanceTicketingRepo.findOne({
        where: { performanceId: firstPerf.performanceId },
      });
      if (pt) {
        const raw = (pt as unknown as Record<string, unknown>)['TicketingAdminContactID'] ??
          (pt as unknown as Record<string, unknown>)['ticketingAdminContactId'];
        const id = raw != null && raw !== '' ? Number(raw) : NaN;
        if (Number.isFinite(id) && id > 0) {
          ticketingAdminContactId = id;
          ticketingAdminContactName = await this.lookupContactName(id);
        }
      }
    }

    // Load ticketing system column (already resolved in company service; use raw SQL)
    // key: venueCompanyId → ticketing system string
    const ticketingSystemMap = new Map<number, string | null>();
    for (const vid of venueCompanyIds) {
      try {
        const r = await this.dataSource.query(
          `SELECT [TicketingSystem] AS ts FROM dbo.Venue WHERE [CompanyID]=@0`,
          [vid],
        );
        const v = pickRaw((r as Record<string, unknown>[])?.[0] ?? {}, 'ts');
        ticketingSystemMap.set(vid, v == null || v === '' ? null : String(v));
      } catch {
        ticketingSystemMap.set(vid, null);
      }
    }

    const results: EngagementVenueRow[] = [];
    for (const ev of evRows) {
      const company = companyMap.get(ev.venueCompanyId);
      const venue = venueMap.get(ev.venueCompanyId);

      // Booking manager contact name
      const bmName = await this.lookupContactName(ev.venueBookingManagerContactId ?? null);

      // Optional cols (per-row)
      const optCols = hasOptional
        ? await this.readEngagementVenueOptionalCols(engagementId, ev.venueCompanyId)
        : {
            attractionTechDirectorContactId: null,
            venueContractSharePointLink: null,
            partiallyExecutedContractSharePointLink: null,
            fullyExecutedContractSharePointLink: null,
            venueForecastSharePointLink: null,
          };
      const attractionTechName = await this.lookupContactName(optCols.attractionTechDirectorContactId);
      const techPackUrl = hasTechPack ? await this.readVenueTechPackUrl(ev.venueCompanyId) : null;

      // Venue marketing contacts (optional cols)
      const mktCols = hasMarketing
        ? await this.readEngagementVenueMarketingCols(engagementId, ev.venueCompanyId)
        : {
            venueMarketingDirectorContactId: null,
            venueMarketingManagerContactId: null,
            venueDigitalMarketingManagerContactId: null,
          };
      const [mktDirName, mktMgrName, digitalMktMgrName] = await Promise.all([
        this.lookupContactName(mktCols.venueMarketingDirectorContactId),
        this.lookupContactName(mktCols.venueMarketingManagerContactId),
        this.lookupContactName(mktCols.venueDigitalMarketingManagerContactId),
      ]);

      // IAE Production Manager (optional col)
      const iaeProdMgrId = hasProdMgr
        ? await this.readEngagementVenueProductionManagerCol(engagementId, ev.venueCompanyId)
        : null;
      const iaeProdMgrName = await this.lookupContactName(iaeProdMgrId);

      // Venue Production Manager (optional col)
      const venueProdMgrId = hasVenueProdMgr
        ? await this.readEngagementVenueVenueProductionManagerCol(engagementId, ev.venueCompanyId)
        : null;
      const venueProdMgrName = await this.lookupContactName(venueProdMgrId);

      // Stagehand / Stage Labor Contact (optional col)
      const stagehandId = hasStagehand
        ? await this.readEngagementVenueStagehandContactCol(engagementId, ev.venueCompanyId)
        : null;
      const stagehandName = await this.lookupContactName(stagehandId);

      // Seating chart URL (optional col on dbo.Venue)
      const seatingChartUrl = hasSeatingChartUrl
        ? await this.readVenueSeatingChartUrl(ev.venueCompanyId)
        : null;

      // Per-venue ticketing administrator (optional col) overrides the
      // performance-derived value when set.
      const venueTicketingAdminId = hasTicketingAdmin
        ? await this.readEngagementVenueTicketingAdminCol(engagementId, ev.venueCompanyId)
        : null;
      const rowTicketingAdminId = venueTicketingAdminId ?? ticketingAdminContactId;
      const rowTicketingAdminName =
        venueTicketingAdminId != null
          ? await this.lookupContactName(venueTicketingAdminId)
          : ticketingAdminContactName;

      results.push({
        engagementId: ev.engagementId,
        venueCompanyId: ev.venueCompanyId,
        venueCompanyName: company?.companyName ?? null,
        venueName: venue?.venueName ?? null,
        city: company?.physicalAddress?.city ?? null,
        stateProvince: company?.physicalAddress?.stateProvince ?? null,
        dmaMarketName: company?.dma?.marketName ?? null,
        isPrimary: Boolean(ev.isPrimary),
        venueBookingManagerContactId: ev.venueBookingManagerContactId ?? null,
        venueBookingManagerName: bmName,
        venueTypeId: venue?.venueTypeId ?? null,
        venueTypeName: venue?.venueType?.venueTypeName ?? null,
        stageDimensions: venue?.stageDimensions ?? null,
        flySystemSpecs: venue?.flySystemSpecs ?? null,
        stageType: venue?.stageType ?? null,
        seatingChartLinkId: venue?.seatingChartLinkId ?? null,
        seatingChartLinkUrl: venue?.seatingChartLinkId
          ? (seatingChartLinkMap.get(venue.seatingChartLinkId) ?? null)
          : null,
        seatingChartUrl,
        ticketingSystem: ticketingSystemMap.get(ev.venueCompanyId) ?? null,
        ticketingAdminContactId: rowTicketingAdminId,
        ticketingAdminContactName: rowTicketingAdminName,
        techPackPdfUrl: techPackUrl,
        attractionTechDirectorContactId: optCols.attractionTechDirectorContactId,
        attractionTechDirectorName: attractionTechName,
        venueContractSharePointLink: optCols.venueContractSharePointLink,
        partiallyExecutedContractSharePointLink: optCols.partiallyExecutedContractSharePointLink,
        fullyExecutedContractSharePointLink: optCols.fullyExecutedContractSharePointLink,
        venueForecastSharePointLink: optCols.venueForecastSharePointLink,
        venueMarketingDirectorContactId: mktCols.venueMarketingDirectorContactId,
        venueMarketingDirectorName: mktDirName,
        venueMarketingManagerContactId: mktCols.venueMarketingManagerContactId,
        venueMarketingManagerName: mktMgrName,
        venueDigitalMarketingManagerContactId: mktCols.venueDigitalMarketingManagerContactId,
        venueDigitalMarketingManagerName: digitalMktMgrName,
        iaeProductionManagerContactId: iaeProdMgrId,
        iaeProductionManagerContactName: iaeProdMgrName,
        venueProductionManagerContactId: venueProdMgrId,
        venueProductionManagerContactName: venueProdMgrName,
        stagehandContactId: stagehandId,
        stagehandContactName: stagehandName,
      });
    }
    return results;
  }

  async getVenueTabData(engagementId: number): Promise<EngagementVenueTabData> {
    const [venues, finance, engagement] = await Promise.all([
      this.listVenues(engagementId),
      this.engagementFinancesRepo.findOne({ where: { engagementId } }),
      this.engagementRepo.findOne({ where: { engagementId } }),
    ]);

    // venueDealType text (legacy) — read via raw SQL when available
    let venueDealType: string | null = null;
    let venueDealTypeId: number | null = null;
    if (finance) {
      const cols = await this.engagementFinancesGetDealStructureColumns();
      if (cols.venueDealType) {
        try {
          const r = await this.dataSource.query(
            `SELECT [VenueDealType] AS vdt FROM dbo.EngagementFinances WHERE [FinanceID] = ${finance.financeId}`,
          );
          venueDealType = this.normalizeVenueDealType(pickRaw((r as Record<string, unknown>[])?.[0] ?? {}, 'vdt'));
        } catch { /* ignore */ }
      }
      // VenueDealTypeID (FK to dbo.VenueDealType)
      if (cols.venueDealTypeId) {
        try {
          const r = await this.dataSource.query(
            `SELECT [VenueDealTypeID] AS vdtid FROM dbo.EngagementFinances WHERE [FinanceID] = ${finance.financeId}`,
          );
          const raw = pickRaw((r as Record<string, unknown>[])?.[0] ?? {}, 'vdtid');
          const parsed = raw != null ? Number(raw) : NaN;
          venueDealTypeId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        } catch { /* ignore */ }
      }
    }

    // Tech rider link from Tour
    let techRiderLinkUrl: string | null = null;
    if (engagement?.tourId) {
      const tour = await this.tourRepo.findOne({ where: { tourId: engagement.tourId } });
      if (tour?.techRiderLinkId) {
        const link = await this.linkRepo.findOne({ where: { linkId: tour.techRiderLinkId } });
        techRiderLinkUrl = link?.linkUrl ?? null;
      }
    }

    // Engagement links (contracts/forecast via dbo.EngagementLink)
    let engagementLinks: EngagementLinkRow[] = [];
    try {
      const elRows = await this.engagementLinkRepo.find({ where: { engagementId }, relations: ['link'] });
      engagementLinks = elRows.map((el) => ({
        engagementLinkId: el.engagementLinkId,
        linkId: el.linkId,
        linkPurpose: el.linkPurpose,
        linkUrl: el.link?.linkUrl ?? '',
        linkName: el.link?.linkName ?? '',
      }));
    } catch { /* table may not exist yet */ }

    // Role-based contacts per venue for read-only display sections
    const venueCompanyIds = venues.map((v) => v.venueCompanyId);
    const venueRoleContacts: Record<number, VenueRoleContacts> = {};
    const roleNames = [
      'Venue Ticketing Software',
      'Venue Ticketing Administrator',
      'Venue Production Manager',
      'Venue Stage Labor',
      'Attraction Tech Director',
      'Marketing Director',
      'Marketing Manager',
      'Digital Marketing Manager',
    ];
    for (const vid of venueCompanyIds) {
      const contacts: VenueRoleContacts = {
        venueTicketingSoftware: [],
        venueTicketingAdministrator: [],
        venueProductionManager: [],
        venueStageLaborCompany: [],
        attractionTechDirector: [],
        marketingDirector: [],
        marketingManager: [],
        digitalMarketingManager: [],
      };
      try {
        // Include contacts from the venue company AND any parent complex companies
        const rows = await this.dataSource.query(
          `SELECT ca.ContactID AS contactId, ci.FirstName AS firstName, ci.LastName AS lastName, r.RoleName AS roleName
           FROM dbo.ContactAssignment ca
           INNER JOIN dbo.Contact ct ON ct.ContactID = ca.ContactID
           INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = ct.ContactInfoID
           INNER JOIN dbo.Role r ON r.RoleID = ca.RoleID
           WHERE ca.CompanyID IN (
             SELECT @0
             UNION
             SELECT vcm.ComplexCompanyID FROM dbo.VenueComplexMember vcm WHERE vcm.VenueCompanyID = @0
           )
             AND LOWER(LTRIM(RTRIM(r.RoleName))) IN (@1, @2, @3, @4, @5, @6, @7, @8)`,
          [vid, ...roleNames.map((n) => n.toLowerCase())],
        );
        for (const row of (rows ?? []) as Record<string, unknown>[]) {
          const contact: RoleContactDisplay = {
            contactId: Number(row['contactId'] ?? row['contactid'] ?? 0),
            firstName: String(row['firstName'] ?? row['firstname'] ?? ''),
            lastName: String(row['lastName'] ?? row['lastname'] ?? ''),
            roleName: String(row['roleName'] ?? row['rolename'] ?? ''),
          };
          const rn = contact.roleName.toLowerCase().trim();
          if (rn === 'venue ticketing software') contacts.venueTicketingSoftware.push(contact);
          else if (rn === 'venue ticketing administrator') contacts.venueTicketingAdministrator.push(contact);
          else if (rn === 'venue production manager') contacts.venueProductionManager.push(contact);
          else if (rn === 'venue stage labor') contacts.venueStageLaborCompany.push(contact);
          else if (rn === 'attraction tech director') contacts.attractionTechDirector.push(contact);
          else if (rn === 'marketing director') contacts.marketingDirector.push(contact);
          else if (rn === 'marketing manager') contacts.marketingManager.push(contact);
          else if (rn === 'digital marketing manager') contacts.digitalMarketingManager.push(contact);
        }
      } catch { /* ignore if tables unavailable */ }
      venueRoleContacts[vid] = contacts;
    }

    // IAE staff with role 'Production Manager' assigned to this engagement
    let iaeProductionManagers: RoleContactDisplay[] = [];
    try {
      const pmRows = await this.dataSource.query(
        `SELECT eic.[ContactID] AS contactId, ci.[FirstName] AS firstName, ci.[LastName] AS lastName, r.[RoleName] AS roleName
         FROM dbo.EngagementIAEContact eic
         INNER JOIN dbo.Contact c ON c.[ContactID] = eic.[ContactID]
         INNER JOIN dbo.ContactInfo ci ON ci.[ContactInfoID] = c.[ContactInfoID]
         INNER JOIN dbo.Role r ON r.[RoleID] = eic.[RoleID]
         WHERE eic.[EngagementID] = @0
           AND LOWER(LTRIM(RTRIM(r.[RoleName]))) = @1`,
        [engagementId, 'production manager'],
      ) as Record<string, unknown>[];
      iaeProductionManagers = (pmRows ?? []).map((row) => ({
        contactId: Number(row['contactId'] ?? row['contactid'] ?? 0),
        firstName: String(row['firstName'] ?? row['firstname'] ?? ''),
        lastName: String(row['lastName'] ?? row['lastname'] ?? ''),
        roleName: String(row['roleName'] ?? row['rolename'] ?? ''),
      }));
    } catch { /* ignore if table unavailable */ }

    return {
      venues,
      venueDealTypeId,
      venueDealType,
      venueTerms: finance?.venueTerms ?? null,
      techRiderLinkUrl,
      engagementLinks,
      venueRoleContacts,
      iaeProductionManagers,
    };
  }

  async updateVenueTabPerVenue(
    engagementId: number,
    venueCompanyId: number,
    dto: UpdateEngagementVenueTabDto,
  ): Promise<void> {
    await this.assertEngagementExists(engagementId);
    const ev = await this.engagementVenueRepo.findOne({
      where: { engagementId, venueCompanyId },
    });
    if (!ev) throw new NotFoundException({ message: 'Venue not linked to this engagement.' });

    // ── dbo.EngagementVenue ORM-backed fields ─────────────────────────────
    if (dto.venueBookingManagerContactId !== undefined) {
      ev.venueBookingManagerContactId = dto.venueBookingManagerContactId ?? null;
      await this.engagementVenueRepo.save(ev);
    }

    // ── dbo.Venue direct fields ────────────────────────────────────────────
    const venuePatch: Partial<Venue> = {};
    if (dto.venueTypeId !== undefined) venuePatch.venueTypeId = dto.venueTypeId ?? null;
    if (dto.stageDimensions !== undefined) venuePatch.stageDimensions = dto.stageDimensions ?? null;
    if (dto.flySystemSpecs !== undefined) venuePatch.flySystemSpecs = dto.flySystemSpecs ?? null;
    if (dto.stageType !== undefined) venuePatch.stageType = dto.stageType ?? null;

    if (Object.keys(venuePatch).length > 0) {
      await this.venueRepo.update({ companyId: venueCompanyId }, venuePatch);
    }

    // ── dbo.EngagementFinances.VenueDealTypeID ─────────────────────────────
    if (dto.venueDealTypeId !== undefined) {
      const cols = await this.engagementFinancesGetDealStructureColumns();
      if (cols.venueDealTypeId) {
        const val = dto.venueDealTypeId == null ? 'NULL' : Math.trunc(Number(dto.venueDealTypeId));
        await this.dataSource.query(
          `IF EXISTS (SELECT 1 FROM dbo.EngagementFinances WHERE [EngagementID] = ${engagementId})
             UPDATE dbo.EngagementFinances SET [VenueDealTypeID] = ${val} WHERE [EngagementID] = ${engagementId}
           ELSE
             INSERT INTO dbo.EngagementFinances ([EngagementID],[VenueDealTypeID]) VALUES (${engagementId}, ${val})`,
        );
      }
    }

    // ── Optional columns via raw SQL ──────────────────────────────────────
    const toSqlStr = (v: string | null | undefined, max = 2048) => {
      if (v === undefined) return undefined;
      if (v == null || v.trim() === '') return 'NULL';
      return this.escapeSqlNVarCharLiteral(v.trim().slice(0, max));
    };

    // TechPackPdfUrl on dbo.Venue
    if (dto.techPackPdfUrl !== undefined && (await this.venueHasTechPackCol())) {
      const sql = toSqlStr(dto.techPackPdfUrl);
      await this.dataSource.query(
        `UPDATE dbo.Venue SET [TechPackPdfUrl] = ${sql} WHERE [CompanyID] = ${venueCompanyId}`,
      );
    }

    // TicketingSystem on dbo.Venue (existing column)
    if (dto.ticketingSystem !== undefined) {
      const sql = toSqlStr(dto.ticketingSystem, 200);
      await this.dataSource.query(
        `UPDATE dbo.Venue SET [TicketingSystem] = ${sql} WHERE [CompanyID] = ${venueCompanyId}`,
      );
    }

    // SeatingChartUrl on dbo.Venue (optional column)
    if (dto.seatingChartUrl !== undefined && (await this.venueHasSeatingChartUrlCol())) {
      const sql = toSqlStr(dto.seatingChartUrl);
      await this.dataSource.query(
        `UPDATE dbo.Venue SET [SeatingChartUrl] = ${sql} WHERE [CompanyID] = ${venueCompanyId}`,
      );
    }

    // TicketingAdminContactID on dbo.EngagementVenue (optional column)
    if (
      dto.ticketingAdminContactId !== undefined &&
      (await this.engagementVenueHasTicketingAdminCol())
    ) {
      const val =
        dto.ticketingAdminContactId == null
          ? 'NULL'
          : Math.trunc(Number(dto.ticketingAdminContactId));
      await this.dataSource.query(
        `UPDATE dbo.EngagementVenue SET [TicketingAdminContactID] = ${val}
         WHERE [EngagementID] = ${engagementId} AND [VenueCompanyID] = ${venueCompanyId}`,
      );
    }

    // ── dbo.Tour.TechRiderLinkID → dbo.Link (tech rider PDF URL) ─────────
    if (dto.techRiderLinkUrl !== undefined) {
      const engagement = await this.engagementRepo.findOne({ where: { engagementId } });
      if (engagement?.tourId) {
        const tour = await this.tourRepo.findOne({ where: { tourId: engagement.tourId } });
        if (tour) {
          const urlVal = dto.techRiderLinkUrl?.trim() || null;
          if (urlVal) {
            if (tour.techRiderLinkId) {
              // Update existing Link row
              await this.linkRepo.update(tour.techRiderLinkId, { linkUrl: urlVal });
            } else {
              // Create a new Link row and assign to Tour
              const newLink = this.linkRepo.create({
                linkType: 'URL',
                linkUrl: urlVal,
                linkName: 'Tech Rider',
                linkPath: '',
              });
              const saved = await this.linkRepo.save(newLink);
              tour.techRiderLinkId = saved.linkId;
              await this.tourRepo.save(tour);
            }
          } else {
            // Clear: set Tour.TechRiderLinkID to NULL
            if (tour.techRiderLinkId) {
              tour.techRiderLinkId = null;
              await this.tourRepo.save(tour);
            }
          }
        }
      }
    }

    // Optional EngagementVenue fields
    if (await this.engagementVenueHasOptionalCols()) {
      const sets: string[] = [];
      const addSet = (col: string, val: string | number | null | undefined) => {
        if (val === undefined) return;
        if (val === null) { sets.push(`[${col}] = NULL`); return; }
        if (typeof val === 'number') { sets.push(`[${col}] = ${val}`); return; }
        sets.push(`[${col}] = ${this.escapeSqlNVarCharLiteral(String(val).slice(0, 2048))}`);
      };

      addSet('AttractionTechDirectorContactID', dto.attractionTechDirectorContactId);
      const vcStr = toSqlStr(dto.venueContractSharePointLink);
      if (vcStr !== undefined) sets.push(`[VenueContractSharePointLink] = ${vcStr}`);
      const pecStr = toSqlStr(dto.partiallyExecutedContractSharePointLink);
      if (pecStr !== undefined) sets.push(`[PartiallyExecutedContractSharePointLink] = ${pecStr}`);
      const fecStr = toSqlStr(dto.fullyExecutedContractSharePointLink);
      if (fecStr !== undefined) sets.push(`[FullyExecutedContractSharePointLink] = ${fecStr}`);
      const vfStr = toSqlStr(dto.venueForecastSharePointLink);
      if (vfStr !== undefined) sets.push(`[VenueForecastSharePointLink] = ${vfStr}`);

      if (sets.length > 0) {
        await this.dataSource.query(
          `UPDATE dbo.EngagementVenue SET ${sets.join(', ')}
           WHERE [EngagementID] = ${engagementId} AND [VenueCompanyID] = ${venueCompanyId}`,
        );
      }
    }

    // ── Venue marketing contacts (separate optional cols) ─────────────────
    if (await this.engagementVenueHasMarketingCols()) {
      const mktSets: string[] = [];
      if (dto.venueMarketingDirectorContactId !== undefined) {
        mktSets.push(
          `[VenueMarketingDirectorContactID] = ${dto.venueMarketingDirectorContactId == null ? 'NULL' : Math.trunc(Number(dto.venueMarketingDirectorContactId))}`,
        );
      }
      if (dto.venueMarketingManagerContactId !== undefined) {
        mktSets.push(
          `[VenueMarketingManagerContactID] = ${dto.venueMarketingManagerContactId == null ? 'NULL' : Math.trunc(Number(dto.venueMarketingManagerContactId))}`,
        );
      }
      if (dto.venueDigitalMarketingManagerContactId !== undefined) {
        mktSets.push(
          `[VenueDigitalMarketingManagerContactID] = ${dto.venueDigitalMarketingManagerContactId == null ? 'NULL' : Math.trunc(Number(dto.venueDigitalMarketingManagerContactId))}`,
        );
      }
      if (mktSets.length > 0) {
        await this.dataSource.query(
          `UPDATE dbo.EngagementVenue SET ${mktSets.join(', ')}
           WHERE [EngagementID] = ${engagementId} AND [VenueCompanyID] = ${venueCompanyId}`,
        );
      }
    }

    // ── IAE Production Manager (optional col) ─────────────────────────────
    if (
      dto.iaeProductionManagerContactId !== undefined &&
      (await this.engagementVenueHasProductionManagerCol())
    ) {
      const val =
        dto.iaeProductionManagerContactId == null
          ? 'NULL'
          : Math.trunc(Number(dto.iaeProductionManagerContactId));
      await this.dataSource.query(
        `UPDATE dbo.EngagementVenue SET [IaeProductionManagerContactID] = ${val}
         WHERE [EngagementID] = ${engagementId} AND [VenueCompanyID] = ${venueCompanyId}`,
      );
    }

    // ── Venue Production Manager (optional col) ────────────────────────────
    if (
      dto.venueProductionManagerContactId !== undefined &&
      (await this.engagementVenueHasVenueProductionManagerCol())
    ) {
      const val =
        dto.venueProductionManagerContactId == null
          ? 'NULL'
          : Math.trunc(Number(dto.venueProductionManagerContactId));
      await this.dataSource.query(
        `UPDATE dbo.EngagementVenue SET [VenueProductionManagerContactID] = ${val}
         WHERE [EngagementID] = ${engagementId} AND [VenueCompanyID] = ${venueCompanyId}`,
      );
    }

    // ── Stagehand / Stage Labor Contact (optional col) ─────────────────────
    if (
      dto.stagehandContactId !== undefined &&
      (await this.engagementVenueHasStagehandContactCol())
    ) {
      const val =
        dto.stagehandContactId == null
          ? 'NULL'
          : Math.trunc(Number(dto.stagehandContactId));
      await this.dataSource.query(
        `UPDATE dbo.EngagementVenue SET [StagehandContactID] = ${val}
         WHERE [EngagementID] = ${engagementId} AND [VenueCompanyID] = ${venueCompanyId}`,
      );
    }
  }

  // ── Seating Chart upload (Venue.SeatingChartLinkID → dbo.Link) ──────────────

  async uploadSeatingChart(
    engagementId: number,
    venueCompanyId: number,
    file: Express.Multer.File,
  ): Promise<{ seatingChartLinkId: number; seatingChartLinkUrl: string }> {
    await this.assertEngagementExists(engagementId);
    const ev = await this.engagementVenueRepo.findOne({
      where: { engagementId, venueCompanyId },
    });
    if (!ev) throw new NotFoundException({ message: 'Venue not linked to this engagement.' });

    if (!file?.filename?.trim()) {
      throw new BadRequestException({ message: 'Upload did not produce a filename.' });
    }

    const publicPath = `/uploads/seating-charts/${file.filename}`.slice(0, 2048);
    const safeName = (file.originalname || 'Seating Chart')
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1f]/g, '')
      .slice(0, 255);

    const venue = await this.venueRepo.findOne({ where: { companyId: venueCompanyId } });
    if (!venue) throw new NotFoundException({ message: 'Venue not found.' });

    if (venue.seatingChartLinkId) {
      // Update existing Link row
      await this.linkRepo.update(venue.seatingChartLinkId, {
        linkUrl: publicPath,
        linkPath: publicPath.slice(0, 1024),
        linkName: safeName || 'Seating Chart',
      });
      return { seatingChartLinkId: venue.seatingChartLinkId, seatingChartLinkUrl: publicPath };
    }

    // Create a new Link row and assign to Venue
    const newLink = this.linkRepo.create({
      linkType: 'Image',
      linkUrl: publicPath,
      linkPath: publicPath.slice(0, 1024),
      linkName: safeName || 'Seating Chart',
    });
    const savedLink = await this.linkRepo.save(newLink);
    venue.seatingChartLinkId = savedLink.linkId;
    await this.venueRepo.save(venue);
    return { seatingChartLinkId: savedLink.linkId, seatingChartLinkUrl: publicPath };
  }

  async removeSeatingChart(
    engagementId: number,
    venueCompanyId: number,
  ): Promise<void> {
    await this.assertEngagementExists(engagementId);
    const ev = await this.engagementVenueRepo.findOne({
      where: { engagementId, venueCompanyId },
    });
    if (!ev) throw new NotFoundException({ message: 'Venue not linked to this engagement.' });

    const venue = await this.venueRepo.findOne({ where: { companyId: venueCompanyId } });
    if (!venue) throw new NotFoundException({ message: 'Venue not found.' });

    if (venue.seatingChartLinkId) {
      venue.seatingChartLinkId = null;
      await this.venueRepo.save(venue);
    }
  }

  // ── Engagement Link management (contracts / forecast) ──────────────────────

  async upsertEngagementLink(
    engagementId: number,
    dto: { linkUrl: string; linkName?: string; linkPurpose: string; linkPath?: string },
  ): Promise<{ engagementLinkId: number; linkId: number }> {
    await this.assertEngagementExists(engagementId);
    const url = (dto.linkUrl ?? '').trim();
    const purpose = (dto.linkPurpose ?? '').trim();
    if (!url) throw new BadRequestException({ message: 'linkUrl is required.' });
    if (!purpose) throw new BadRequestException({ message: 'linkPurpose is required.' });

    // Check if an EngagementLink with this purpose already exists
    let existing: EngagementLink | null = null;
    try {
      existing = await this.engagementLinkRepo.findOne({
        where: { engagementId, linkPurpose: purpose },
      });
    } catch { /* table may not exist yet */ }

    if (existing) {
      // Update the existing Link row URL
      await this.linkRepo.update({ linkId: existing.linkId }, {
        linkUrl: url,
        linkName: dto.linkName?.trim() || purpose,
        linkPath: dto.linkPath?.trim() ?? '',
      });
      return { engagementLinkId: existing.engagementLinkId, linkId: existing.linkId };
    }

    // Create new Link + EngagementLink
    const link = this.linkRepo.create({
      linkType: 'SharePoint',
      linkUrl: url,
      linkName: dto.linkName?.trim() || purpose,
      linkPath: dto.linkPath?.trim() ?? '',
    });
    const savedLink = await this.linkRepo.save(link);

    const engagementLink = this.engagementLinkRepo.create({
      engagementId,
      linkId: savedLink.linkId,
      linkPurpose: purpose,
    });
    const savedEl = await this.engagementLinkRepo.save(engagementLink);
    return { engagementLinkId: savedEl.engagementLinkId, linkId: savedLink.linkId };
  }

  async removeEngagementLink(engagementId: number, engagementLinkId: number): Promise<void> {
    const el = await this.engagementLinkRepo.findOne({
      where: { engagementLinkId, engagementId },
    });
    if (!el) throw new NotFoundException({ message: 'Engagement link not found.' });
    await this.engagementLinkRepo.remove(el);
  }

  async addVenue(
    engagementId: number,
    dto: AddEngagementVenueDto,
  ): Promise<{ added: boolean }> {
    await this.assertEngagementExists(engagementId);
    await this.assertVenueCompany(dto.venueCompanyId);

    const existing = await this.engagementVenueRepo.findOne({
      where: { engagementId, venueCompanyId: dto.venueCompanyId },
    });
    if (existing) {
      throw new ConflictException({
        message: 'This venue is already linked to the engagement.',
      });
    }

    const isPrimary = dto.isPrimary === true;

    await this.dataSource.transaction(async (manager) => {
      if (isPrimary) {
        const cur = await manager.findOne(EngagementVenue, {
          where: { engagementId, isPrimary: true },
        });
        if (cur) {
          cur.isPrimary = false;
          await manager.save(EngagementVenue, cur);
        }
      }
      await manager.save(
        EngagementVenue,
        manager.create(EngagementVenue, {
          engagementId,
          venueCompanyId: dto.venueCompanyId,
          isPrimary,
        }),
      );
    });

    return { added: true };
  }

  async removeVenue(
    engagementId: number,
    venueCompanyId: number,
  ): Promise<void> {
    await this.assertEngagementExists(engagementId);

    const row = await this.engagementVenueRepo.findOne({
      where: { engagementId, venueCompanyId },
    });
    if (!row) {
      throw new NotFoundException({
        message: 'This venue is not linked to the engagement.',
      });
    }

    const allVenues = await this.engagementVenueRepo.find({
      where: { engagementId },
    });
    if (allVenues.length === 1) {
      throw new ConflictException({
        message:
          'Cannot remove the only venue. An engagement must have at least one venue.',
      });
    }

    if (row.isPrimary) {
      const secondaries = allVenues.filter((v) => !v.isPrimary);
      if (secondaries.length === 0) {
        throw new ConflictException({
          message:
            'Cannot remove the primary venue when no secondary venues exist. Reassign primary first.',
        });
      }
    }

    await this.engagementVenueRepo.delete({ engagementId, venueCompanyId });
  }

  // ─── Service Providers (VenueServiceProvider) ─────────────────────────────

  async listServiceProviders(engagementId: number): Promise<{
    venueCompanyId: number;
    providers: EngagementServiceProviderRow[];
  }> {
    await this.assertEngagementExists(engagementId);
    const venueCompanyId =
      await this.getPrimaryVenueCompanyIdForEngagement(engagementId);

    const rawProviderIds = await this.venueServiceProviderRepo
      .createQueryBuilder('vsp')
      .select('DISTINCT vsp.providerCompanyId', 'providerCompanyId')
      .where('vsp.venueCompanyId = :venueCompanyId', { venueCompanyId })
      .getRawMany<{
        providerCompanyId?: number | string;
        ProviderCompanyID?: number | string;
      }>();

    const providerCompanyIds = rawProviderIds
      .map((r) => Number(r.providerCompanyId ?? r.ProviderCompanyID))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (providerCompanyIds.length === 0) {
      return { venueCompanyId, providers: [] };
    }

    const companies = await this.companyRepo.find({
      where: { companyId: In(providerCompanyIds) },
    });
    const nameMap = new Map(companies.map((c) => [c.companyId, c.companyName]));

    const providers: EngagementServiceProviderRow[] = [];
    for (const providerCompanyId of providerCompanyIds) {
      const services = await this.loadCompanyServices(providerCompanyId);
      providers.push({
        providerCompanyId,
        providerCompanyName: nameMap.get(providerCompanyId) ?? null,
        serviceProvidedIds: services.map((s) => s.serviceProvidedId),
        serviceProvidedNames: services.map((s) => s.serviceName),
      });
    }
    providers.sort((a, b) =>
      (a.providerCompanyName ?? String(a.providerCompanyId)).localeCompare(
        b.providerCompanyName ?? String(b.providerCompanyId),
        undefined,
        { sensitivity: 'base' },
      ),
    );
    return { venueCompanyId, providers };
  }

  async addServiceProvider(
    engagementId: number,
    providerCompanyId: number,
  ): Promise<{ added: boolean }> {
    await this.assertEngagementExists(engagementId);
    const venueCompanyId =
      await this.getPrimaryVenueCompanyIdForEngagement(engagementId);

    const pid = Number(providerCompanyId);
    if (!Number.isInteger(pid) || pid < 1) {
      throw new BadRequestException({
        message: 'Invalid provider company id.',
      });
    }
    const company = await this.companyRepo.findOne({
      where: { companyId: pid },
    });
    if (!company) {
      throw new BadRequestException({ message: 'Provider company not found.' });
    }

    const services = await this.loadCompanyServices(pid);
    if (services.length === 0) {
      throw new BadRequestException({
        message:
          'This company has no Company Services assigned. Assign services on the company first, then add it here.',
      });
    }

    await this.dataSource.transaction(async (em) => {
      await em.delete(VenueServiceProvider, {
        venueCompanyId,
        providerCompanyId: pid,
      });
      const rows = services.map((s) =>
        em.create(VenueServiceProvider, {
          venueCompanyId,
          providerCompanyId: pid,
          serviceId: s.serviceProvidedId,
        }),
      );
      await em.save(VenueServiceProvider, rows);
    });

    return { added: true };
  }

  async removeServiceProvider(
    engagementId: number,
    providerCompanyId: number,
  ): Promise<void> {
    await this.assertEngagementExists(engagementId);
    const venueCompanyId =
      await this.getPrimaryVenueCompanyIdForEngagement(engagementId);
    const pid = Number(providerCompanyId);
    if (!Number.isInteger(pid) || pid < 1) {
      throw new BadRequestException({
        message: 'Invalid provider company id.',
      });
    }
    await this.venueServiceProviderRepo.delete({
      venueCompanyId,
      providerCompanyId: pid,
    });
  }

  // ─── Engagement IAE staff (dbo.EngagementIAEContact) ─────────────────────

  private mapIaeCreatedDate(d: Date | string | null | undefined): string {
    if (d == null || d === '') return '';
    if (d instanceof Date) {
      if (Number.isNaN(d.getTime())) return '';
      return d.toISOString();
    }
    const t = Date.parse(String(d));
    return Number.isNaN(t) ? String(d) : new Date(t).toISOString();
  }

  private contactDisplayLabel(
    first: string | null | undefined,
    last: string | null | undefined,
    email: string | null | undefined,
    contactId: number,
  ): string {
    const name = [first, last]
      .map((x) => (x ?? '').trim())
      .filter(Boolean)
      .join(' ')
      .trim();
    if (name) return name;
    const em = (email ?? '').trim();
    if (em) return em;
    return `Contact #${contactId}`;
  }

  private async assertNoDuplicateIaeAssignment(
    engagementId: number,
    contactId: number,
    roleId: number | null,
    excludeEicId?: number | null,
  ): Promise<void> {
    const qb = this.engagementIaeContactRepo
      .createQueryBuilder('e')
      .where('e.engagementId = :eid', { eid: engagementId })
      .andWhere('e.contactId = :cid', { cid: contactId });
    if (roleId == null) {
      qb.andWhere('e.roleId IS NULL');
    } else {
      qb.andWhere('e.roleId = :rid', { rid: roleId });
    }
    if (excludeEicId != null) {
      qb.andWhere('e.engagementIaeContactId <> :xid', { xid: excludeEicId });
    }
    const n = await qb.getCount();
    if (n > 0) {
      throw new ConflictException({
        message:
          'This person is already assigned for this role on this engagement (including “no role”). Edit or remove the existing row.',
      });
    }
  }

  private async clearOtherPrimaryIaeContacts(
    engagementId: number,
    keepEicId: number,
  ): Promise<void> {
    await this.engagementIaeContactRepo
      .createQueryBuilder()
      .update(EngagementIAEContact)
      .set({ isPrimary: false })
      .where('engagementId = :eid', { eid: engagementId })
      .andWhere('engagementIaeContactId <> :kid', { kid: keepEicId })
      .execute();
  }

  private async assertInternalContact(contactId: number): Promise<void> {
    const row = await this.contactRepo
      .createQueryBuilder('c')
      .innerJoin(ContactAssignment, 'ca', 'ca.contactId = c.contactId')
      .innerJoin(Company, 'company', 'company.companyId = ca.companyId')
      .where('c.contactId = :contactId', { contactId })
      .andWhere('company.isInternal = :isInternal', { isInternal: true })
      .select('c.contactId', 'contactId')
      .getRawOne<Record<string, unknown>>();

    if (!row) {
      throw new BadRequestException({
        message:
          'Select an internal contact. IAE staff must belong to a company marked Internal.',
      });
    }
  }

  private async loadInternalContactIdSet(contactIds: number[]): Promise<Set<number>> {
    const ids = [
      ...new Set(
        contactIds.filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];
    if (ids.length === 0) return new Set();

    const rows = await this.contactRepo
      .createQueryBuilder('c')
      .innerJoin(ContactAssignment, 'ca', 'ca.contactId = c.contactId')
      .innerJoin(Company, 'company', 'company.companyId = ca.companyId')
      .where('c.contactId IN (:...ids)', { ids })
      .andWhere('company.isInternal = :isInternal', { isInternal: true })
      .select('DISTINCT c.contactId', 'contactId')
      .getRawMany<Record<string, unknown>>();

    return new Set(
      rows
        .map((row) => Number(pickRaw(row, 'contactId')))
        .filter((id) => Number.isInteger(id) && id > 0),
    );
  }

  async getEngagementIaeContactLookups(): Promise<EngagementIaeContactLookups> {
    const [roles, departments, contactRows] = await Promise.all([
      this.roleRepo.find({
        order: { roleId: 'ASC' },
        take: 5000,
      }),
      this.departmentRepo.find({
        order: { departmentId: 'ASC' },
        take: 5000,
      }),
      this.contactRepo
        .createQueryBuilder('c')
        .innerJoin('c.contactInfo', 'ci')
        .innerJoin(ContactAssignment, 'ca', 'ca.contactId = c.contactId')
        .innerJoin(Company, 'company', 'company.companyId = ca.companyId')
        .where('company.isInternal = :isInternal', { isInternal: true })
        .select([
          'c.contactId AS contactId',
          'ci.firstName AS firstName',
          'ci.lastName AS lastName',
          'ci.email AS email',
        ])
        .distinct(true)
        .orderBy('c.contactId', 'ASC')
        .take(8000)
        .getRawMany<Record<string, unknown>>(),
    ]);

    // Find contactIds that have been assigned the "Ticketing Manager" role
    const ticketingManagerRole = roles.find((r) => (r.roleName ?? '').trim().toLowerCase() === 'ticketing manager');
    let ticketingManagerContactIds: number[] = [];
    if (ticketingManagerRole) {
      try {
        const tmRows = await this.dataSource.query(
          `SELECT DISTINCT [ContactID] AS cid FROM dbo.EngagementIAEContact WHERE [RoleID] = ${ticketingManagerRole.roleId}`,
        ) as Record<string, unknown>[];
        ticketingManagerContactIds = tmRows
          .map((r) => pickRaw(r, 'cid'))
          .filter((v): v is number => v != null && Number.isFinite(Number(v)))
          .map(Number);
      } catch { /* ignore */ }
    }

    return {
      roles: roles.map((r) => ({
        id: r.roleId,
        label: (r.roleName ?? '').trim() || `Role #${r.roleId}`,
      })),
      departments: departments.map((d) => ({
        id: d.departmentId,
        label: (d.departmentName ?? '').trim() || `Dept #${d.departmentId}`,
      })),
      contacts: contactRows.map((c) => ({
        id: Number(pickRaw(c, 'contactId')),
        label: this.contactDisplayLabel(
          String(pickRaw(c, 'firstName') ?? ''),
          String(pickRaw(c, 'lastName') ?? ''),
          String(pickRaw(c, 'email') ?? ''),
          Number(pickRaw(c, 'contactId')),
        ),
      })),
      ticketingManagerContactIds,
    };
  }

  async listEngagementIaeContacts(
    engagementId: number,
  ): Promise<EngagementIaeContactRow[]> {
    await this.assertEngagementExists(engagementId);
    const allRows = await this.engagementIaeContactRepo.find({
      where: { engagementId },
      order: { isPrimary: 'DESC', createdDate: 'DESC' },
    });
    if (allRows.length === 0) return [];

    const internalContactIds = await this.loadInternalContactIdSet(
      allRows.map((r) => r.contactId),
    );
    const rows = allRows.filter((row) => internalContactIds.has(row.contactId));
    if (rows.length === 0) return [];

    const contactIds = [...new Set(rows.map((r) => r.contactId))];
    const roleIds = [
      ...new Set(
        rows.map((r) => r.roleId).filter((x): x is number => x != null),
      ),
    ];
    const deptIds = [
      ...new Set(
        rows.map((r) => r.departmentId).filter((x): x is number => x != null),
      ),
    ];

    const [contacts, roles, depts] = await Promise.all([
      this.contactRepo.find({
        where: { contactId: In(contactIds) },
        relations: { contactInfo: true },
      }),
      roleIds.length
        ? this.roleRepo.find({ where: { roleId: In(roleIds) } })
        : [],
      deptIds.length
        ? this.departmentRepo.find({ where: { departmentId: In(deptIds) } })
        : [],
    ]);

    const cMap = new Map(contacts.map((c) => [c.contactId, c]));
    const rMap = new Map<number, string>(
      roles.map((r): [number, string] => [r.roleId, r.roleName]),
    );
    const dMap = new Map<number, string>(
      depts.map((d): [number, string] => [d.departmentId, d.departmentName]),
    );

    return rows.map((eic) => {
      const ci = cMap.get(eic.contactId)?.contactInfo;
      return {
        engagementIaeContactId: eic.engagementIaeContactId,
        engagementId: eic.engagementId,
        contactId: eic.contactId,
        contactLabel: this.contactDisplayLabel(
          ci?.firstName,
          ci?.lastName,
          ci?.email,
          eic.contactId,
        ),
        roleId: eic.roleId,
        roleName: eic.roleId != null ? (rMap.get(eic.roleId) ?? null) : null,
        departmentId: eic.departmentId,
        departmentName:
          eic.departmentId != null
            ? (dMap.get(eic.departmentId) ?? null)
            : null,
        isPrimary: this.mapBit(eic.isPrimary as never) === true,
        notes: eic.notes,
        createdDate: this.mapIaeCreatedDate(eic.createdDate),
      };
    });
  }

  async addEngagementIaeContact(
    engagementId: number,
    dto: CreateEngagementIaeContactDto,
  ): Promise<{ engagementIaeContactId: number }> {
    await this.assertEngagementExists(engagementId);

    const contact = await this.contactRepo.findOne({
      where: { contactId: dto.contactId },
    });
    if (!contact) {
      throw new BadRequestException({
        message: `Contact #${dto.contactId} was not found.`,
      });
    }
    await this.assertInternalContact(dto.contactId);

    if (dto.roleId != null && dto.roleId !== undefined) {
      const role = await this.roleRepo.findOne({
        where: { roleId: dto.roleId },
      });
      if (!role) {
        throw new BadRequestException({
          message: `Role #${dto.roleId} was not found.`,
        });
      }
    }

    if (dto.departmentId != null && dto.departmentId !== undefined) {
      const dept = await this.departmentRepo.findOne({
        where: { departmentId: dto.departmentId },
      });
      if (!dept) {
        throw new BadRequestException({
          message: `Department #${dto.departmentId} was not found.`,
        });
      }
    }

    const roleId = dto.roleId === undefined ? null : (dto.roleId ?? null);
    await this.assertNoDuplicateIaeAssignment(
      engagementId,
      dto.contactId,
      roleId,
      null,
    );

    const wantPrimary = dto.isPrimary === true;
    const row = this.engagementIaeContactRepo.create({
      engagementId,
      contactId: dto.contactId,
      roleId,
      departmentId:
        dto.departmentId === undefined ? null : (dto.departmentId ?? null),
      isPrimary: wantPrimary,
      notes:
        dto.notes === undefined ||
        dto.notes == null ||
        String(dto.notes).trim() === ''
          ? null
          : String(dto.notes).trim().slice(0, 500),
      createdDate: new Date(),
    });
    const saved = await this.engagementIaeContactRepo.save(row);

    if (wantPrimary) {
      await this.clearOtherPrimaryIaeContacts(
        engagementId,
        saved.engagementIaeContactId,
      );
    }

    return { engagementIaeContactId: saved.engagementIaeContactId };
  }

  async updateEngagementIaeContact(
    engagementId: number,
    eicId: number,
    dto: UpdateEngagementIaeContactDto,
  ): Promise<void> {
    await this.assertEngagementExists(engagementId);
    const row = await this.engagementIaeContactRepo.findOne({
      where: { engagementIaeContactId: eicId, engagementId },
    });
    if (!row) {
      throw new NotFoundException({
        message: `IAE assignment #${eicId} was not found for engagement #${engagementId}.`,
      });
    }

    const nextContactId =
      dto.contactId !== undefined ? dto.contactId : row.contactId;
    const nextRoleId =
      dto.roleId !== undefined ? (dto.roleId ?? null) : row.roleId;
    const nextDeptId =
      dto.departmentId !== undefined
        ? (dto.departmentId ?? null)
        : row.departmentId;

    if (dto.contactId !== undefined) {
      const c = await this.contactRepo.findOne({
        where: { contactId: dto.contactId },
      });
      if (!c) {
        throw new BadRequestException({
          message: `Contact #${dto.contactId} was not found.`,
        });
      }
      await this.assertInternalContact(dto.contactId);
    }
    if (dto.roleId !== undefined && dto.roleId != null) {
      const role = await this.roleRepo.findOne({
        where: { roleId: dto.roleId },
      });
      if (!role) {
        throw new BadRequestException({
          message: `Role #${dto.roleId} was not found.`,
        });
      }
    }
    if (dto.departmentId !== undefined && dto.departmentId != null) {
      const dept = await this.departmentRepo.findOne({
        where: { departmentId: dto.departmentId },
      });
      if (!dept) {
        throw new BadRequestException({
          message: `Department #${dto.departmentId} was not found.`,
        });
      }
    }

    if (dto.contactId !== undefined || dto.roleId !== undefined) {
      await this.assertNoDuplicateIaeAssignment(
        engagementId,
        nextContactId,
        nextRoleId,
        eicId,
      );
    }

    if (dto.contactId !== undefined) row.contactId = nextContactId;
    if (dto.roleId !== undefined) row.roleId = nextRoleId;
    if (dto.departmentId !== undefined) row.departmentId = nextDeptId;

    if (dto.notes !== undefined) {
      const t = dto.notes;
      row.notes =
        t == null || String(t).trim() === ''
          ? null
          : String(t).trim().slice(0, 500);
    }

    if (dto.isPrimary !== undefined) {
      row.isPrimary = dto.isPrimary === true;
    }

    await this.engagementIaeContactRepo.save(row);

    if (dto.isPrimary === true) {
      await this.clearOtherPrimaryIaeContacts(engagementId, eicId);
    }
  }

  async removeEngagementIaeContact(
    engagementId: number,
    eicId: number,
  ): Promise<void> {
    await this.assertEngagementExists(engagementId);
    const res = await this.engagementIaeContactRepo.delete({
      engagementIaeContactId: eicId,
      engagementId,
    });
    if (!res.affected) {
      throw new NotFoundException({
        message: `IAE assignment #${eicId} was not found for engagement #${engagementId}.`,
      });
    }
  }

  // ─── Performances ─────────────────────────────────────────────────────────

  async listPerformances(engagementId: number) {
    await this.assertEngagementExists(engagementId);
    const rows = await this.performanceRepo.find({
      where: { engagementId },
      order: { performanceDate: 'ASC', performanceTime: 'ASC' },
    });
    return rows.map((r) => ({
      performanceId: r.performanceId,
      engagementId: r.engagementId,
      performanceStatus: r.performanceStatus,
      performanceDate: r.performanceDate,
      performanceTime: r.performanceTime,
    }));
  }

  private async assertPerformanceForEngagement(
    engagementId: number,
    performanceId: number,
  ): Promise<Performance> {
    await this.assertEngagementExists(engagementId);
    const perf = await this.performanceRepo.findOne({
      where: { performanceId, engagementId },
    });
    if (!perf) {
      throw new NotFoundException({
        message: `Performance #${performanceId} was not found for engagement #${engagementId}.`,
      });
    }
    return perf;
  }

  async getPerformanceTicketing(
    engagementId: number,
    performanceId: number,
  ): Promise<PerformanceTicketingRow> {
    await this.assertPerformanceForEngagement(engagementId, performanceId);
    const row = await this.performanceTicketingRepo.findOne({
      where: { performanceId },
      order: { ticketingId: 'ASC' },
    });
    if (!row) {
      const blankRow: PerformanceTicketingRow = {
        ticketingId: null,
        performanceId,
        ticketingStatus: null,
        onSaleDate: null,
        preSaleDate: null,
        vipPackagedOffer: null,
        preSaleSpecialPrices: null,
        kidsTicketsPrices: null,
        ticketingLinkId: null,
        ticketingLinkUrl: null,
        grossTicketSales: null,
        totalComps: null,
        totalTickets: null,
        totalAdmissions: null,
        sellableCapacity: null,
        grossPotentialRevenue: null,
        ticketingSystemCompanyId: null,
        ticketingAdministrator: null,
        boxOfficeLaborStaffingRequired: null,
        facilityFeeType: null,
        facilityFeeAmount: null,
        dynamicPricingMode: null,
        serviceChargeRevenueShare: null,
        rebateAmount: null,
        bumpAmount: null,
        creditCardFeesType: null,
        creditCardFeesAmountPercent: null,
        salesTaxType: null,
        salesTaxAmountPercent: null,
        ticketingAdminContactId: null,
        ticketingAdminContactName: null,
        ticketingAdminCompanyId: null,
        ticketingAdminCompanyName: null,
        publicSaleLinkId: null,
        publicSaleLinkUrl: null,
        preSaleEndDate: null,
        preSaleRegistrationStartDate: null,
        preSaleRegistrationEndDate: null,
        isIAETMDeal: null,
        presalePassword: null,
        presalePasswordDateStart: null,
        presalePasswordDateEnd: null,
        presaleSpecialPricePassword: null,
        presaleSpecialPricePasswordDateStart: null,
        presaleSpecialPricePasswordDateEnd: null,
        presaleSpecialPriceDiscountType: null,
        presaleSpecialPriceDiscountAmount: null,
        publicSaleSpecialPricePassword: null,
        publicSaleSpecialPricePasswordDateStart: null,
        publicSaleSpecialPricePasswordDateEnd: null,
        publicSaleSpecialPriceDiscountType: null,
        publicSaleSpecialPriceDiscountAmount: null,
        vipPackageOffered: null,
        vipPackageName: null,
        vipPackageBenefits: null,
        compTicketForm: null,
        compTicketExcelSheet: null,
      };
      return this.mergeSalesTaxFromVenue(engagementId, blankRow);
    }
    const ticketingLink =
      row.ticketingLinkId != null
        ? await this.linkRepo.findOne({
            where: { linkId: row.ticketingLinkId },
          })
        : null;
    const base: PerformanceTicketingRow = {
      ticketingId: row.ticketingId,
      performanceId,
      ticketingStatus: row.ticketingStatus,
      onSaleDate: this.mapFinanceYmd(row.onSaleDate),
      preSaleDate: this.mapFinanceYmd(row.preSaleDate),
      vipPackagedOffer: row.vipPackagedOffer,
      preSaleSpecialPrices: row.preSaleSpecialPrices,
      kidsTicketsPrices: row.kidsTicketsPrices,
      ticketingLinkId: row.ticketingLinkId,
      ticketingLinkUrl: ticketingLink?.linkUrl ?? null,
      grossTicketSales: this.mapFinanceNumber(row.grossTicketSales),
      totalComps: row.totalComps,
      totalTickets: row.totalTickets,
      totalAdmissions: row.totalAdmissions,
      sellableCapacity: null,
      grossPotentialRevenue: null,
      ticketingSystemCompanyId: null,
      ticketingAdministrator: null,
      boxOfficeLaborStaffingRequired: null,
      facilityFeeType: null,
      facilityFeeAmount: null,
      dynamicPricingMode: null,
      serviceChargeRevenueShare: null,
      rebateAmount: null,
      bumpAmount: null,
      creditCardFeesType: null,
      creditCardFeesAmountPercent: null,
      salesTaxType: null,
      salesTaxAmountPercent: null,
      ticketingAdminContactId: null,
      ticketingAdminContactName: null,
      ticketingAdminCompanyId: null,
      ticketingAdminCompanyName: null,
      publicSaleLinkId: null,
      publicSaleLinkUrl: null,
      preSaleEndDate: null,
      preSaleRegistrationStartDate: null,
      preSaleRegistrationEndDate: null,
      isIAETMDeal: null,
      presalePassword: null,
      presalePasswordDateStart: null,
      presalePasswordDateEnd: null,
      presaleSpecialPricePassword: null,
      presaleSpecialPricePasswordDateStart: null,
      presaleSpecialPricePasswordDateEnd: null,
      presaleSpecialPriceDiscountType: null,
      presaleSpecialPriceDiscountAmount: null,
      publicSaleSpecialPricePassword: null,
      publicSaleSpecialPricePasswordDateStart: null,
      publicSaleSpecialPricePasswordDateEnd: null,
      publicSaleSpecialPriceDiscountType: null,
      publicSaleSpecialPriceDiscountAmount: null,
      vipPackageOffered: null,
      vipPackageName: null,
      vipPackageBenefits: null,
      compTicketForm: null,
      compTicketExcelSheet: null,
    };
    const merged = await this.mergePerformanceTicketingAdvancedFromDb(row.ticketingId, base);
    return this.mergeSalesTaxFromVenue(engagementId, merged);
  }

  private async mergeSalesTaxFromVenue(
    engagementId: number,
    base: PerformanceTicketingRow,
  ): Promise<PerformanceTicketingRow> {
    try {
      const r = await this.dataSource.query(
        `SELECT v.[SalesTaxType] AS stt, v.[SalesTaxRate] AS str
         FROM dbo.Venue v
         INNER JOIN dbo.EngagementVenue ev ON ev.[VenueCompanyID] = v.[CompanyID]
         WHERE ev.[EngagementID] = ${engagementId} AND ev.[IsPrimary] = 1`,
      );
      const row0 = (r as Record<string, unknown>[])?.[0];
      if (!row0) return base;
      const stt = pickRaw(row0, 'stt');
      const str = pickRaw(row0, 'str');
      return {
        ...base,
        salesTaxType: stt != null && stt !== '' ? String(stt).trim() : null,
        salesTaxAmountPercent: str != null && str !== '' && Number.isFinite(Number(str)) ? Number(str) : null,
      };
    } catch {
      return base;
    }
  }

  async upsertPerformanceTicketing(
    engagementId: number,
    performanceId: number,
    dto: UpdatePerformanceTicketingDto,
  ): Promise<void> {
    await this.assertPerformanceForEngagement(engagementId, performanceId);

    if (
      dto.ticketingLinkUrl === undefined &&
      dto.ticketingLinkId !== undefined &&
      dto.ticketingLinkId != null
    ) {
      const link = await this.linkRepo.findOne({
        where: { linkId: dto.ticketingLinkId },
      });
      if (!link) {
        throw new BadRequestException({
          message: `Link #${dto.ticketingLinkId} was not found.`,
        });
      }
    }

    let row = await this.performanceTicketingRepo.findOne({
      where: { performanceId },
      order: { ticketingId: 'ASC' },
    });

    if (!row) {
      row = this.performanceTicketingRepo.create({ performanceId });
    }

    if (dto.ticketingStatus !== undefined) {
      const t = dto.ticketingStatus;
      row.ticketingStatus =
        t == null || String(t).trim() === ''
          ? null
          : String(t).trim().slice(0, 50);
    }
    if (dto.onSaleDate !== undefined) {
      row.onSaleDate = this.assertYmdOrNull(dto.onSaleDate);
    }
    if (dto.preSaleDate !== undefined) {
      row.preSaleDate = this.assertYmdOrNull(dto.preSaleDate);
    }
    if (dto.vipPackagedOffer !== undefined) {
      const t = dto.vipPackagedOffer;
      row.vipPackagedOffer =
        t == null || String(t).trim() === ''
          ? null
          : String(t).trim().slice(0, 255);
    }
    if (dto.preSaleSpecialPrices !== undefined) {
      const t = dto.preSaleSpecialPrices;
      row.preSaleSpecialPrices =
        t == null || String(t).trim() === '' ? null : String(t).trim();
    }
    if (dto.kidsTicketsPrices !== undefined) {
      const t = dto.kidsTicketsPrices;
      row.kidsTicketsPrices =
        t == null || String(t).trim() === '' ? null : String(t).trim();
    }
    if (dto.ticketingLinkUrl !== undefined) {
      row.ticketingLinkId = await this.upsertTicketingUrlLink(
        dto.ticketingLinkUrl,
        row.ticketingLinkId,
      );
    } else if (dto.ticketingLinkId !== undefined) {
      row.ticketingLinkId = dto.ticketingLinkId;
    }
    if (dto.grossTicketSales !== undefined) {
      row.grossTicketSales =
        dto.grossTicketSales == null ? null : dto.grossTicketSales;
    }
    if (dto.totalComps !== undefined) {
      row.totalComps = dto.totalComps;
    }
    if (dto.totalTickets !== undefined) {
      row.totalTickets = dto.totalTickets;
    }
    if (dto.totalAdmissions !== undefined) {
      row.totalAdmissions = dto.totalAdmissions;
    }

    const saved = await this.performanceTicketingRepo.save(row);
    await Promise.all([
      this.tryPersistPerformanceTicketingAdvanced(saved.ticketingId, dto, performanceId),
      this.tryPersistSalesTaxToVenue(engagementId, dto),
      this.tryPersistEngagementScaling(engagementId, dto),
    ]);
  }

  private async tryPersistEngagementScaling(
    engagementId: number,
    dto: UpdatePerformanceTicketingDto,
  ): Promise<void> {
    if (dto.engagementScaling === undefined) return;
    const val =
      dto.engagementScaling == null || String(dto.engagementScaling).trim() === ''
        ? null
        : String(dto.engagementScaling).trim().slice(0, 50);
    await this.engagementRepo.update(
      { engagementId },
      { engagementScaling: val },
    );
  }

  private async tryPersistSalesTaxToVenue(
    engagementId: number,
    dto: UpdatePerformanceTicketingDto,
  ): Promise<void> {
    if (dto.salesTaxType === undefined && dto.salesTaxAmountPercent === undefined) return;
    const sets: string[] = [];
    if (dto.salesTaxType !== undefined) {
      sets.push(
        `[SalesTaxType] = ${dto.salesTaxType == null ? 'NULL' : this.escapeSqlNVarCharLiteral(String(dto.salesTaxType).trim().slice(0, 50))}`,
      );
    }
    if (dto.salesTaxAmountPercent !== undefined) {
      sets.push(
        `[SalesTaxRate] = ${dto.salesTaxAmountPercent == null ? 'NULL' : Number(dto.salesTaxAmountPercent)}`,
      );
    }
    if (!sets.length) return;
    try {
      await this.dataSource.query(
        `UPDATE dbo.Venue SET ${sets.join(', ')}
         WHERE [CompanyID] IN (
           SELECT ev.[VenueCompanyID] FROM dbo.EngagementVenue ev
           WHERE ev.[EngagementID] = ${Math.trunc(engagementId)} AND ev.[IsPrimary] = 1
         )`,
      );
    } catch { /* column may not exist */ }
  }

  async createPerformance(
    engagementId: number,
    dto: CreatePerformanceDto,
  ): Promise<{ performanceId: number }> {
    await this.assertEngagementExists(engagementId);

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.performanceDate)) {
      throw new BadRequestException({
        message: 'Invalid performance date. Expected format: YYYY-MM-DD.',
      });
    }

    const normalizedTime = this.normalizeTime(dto.performanceTime);

    await this.assertPerformanceSlotAvailable(
      engagementId,
      dto.performanceDate,
      normalizedTime,
    );

    const row = this.performanceRepo.create({
      engagementId,
      performanceDate: dto.performanceDate,
      performanceTime: normalizedTime,
      performanceStatus: dto.performanceStatus?.trim() || 'Public',
    });

    const saved = await this.performanceRepo.save(row);
    await this.enforceOpeningPerformancePublic(engagementId);
    return { performanceId: saved.performanceId };
  }

  async updatePerformance(
    engagementId: number,
    performanceId: number,
    dto: {
      performanceDate?: string;
      performanceTime?: string;
      performanceStatus?: string;
    },
  ): Promise<void> {
    await this.assertEngagementExists(engagementId);

    const perf = await this.performanceRepo.findOne({
      where: { performanceId, engagementId },
    });
    if (!perf) {
      throw new NotFoundException({
        message: `Performance #${performanceId} not found for engagement #${engagementId}.`,
      });
    }

    if (dto.performanceDate !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.performanceDate)) {
        throw new BadRequestException({
          message: 'Invalid performance date. Expected format: YYYY-MM-DD.',
        });
      }
      perf.performanceDate = dto.performanceDate;
    }

    if (dto.performanceTime !== undefined) {
      perf.performanceTime = this.normalizeTime(dto.performanceTime);
    }

    if (dto.performanceStatus !== undefined) {
      perf.performanceStatus = dto.performanceStatus.trim() || 'Public';
    }

    await this.assertPerformanceSlotAvailable(
      engagementId,
      perf.performanceDate,
      perf.performanceTime,
      performanceId,
    );

    await this.performanceRepo.save(perf);
    await this.enforceOpeningPerformancePublic(engagementId);
  }

  async deletePerformance(
    engagementId: number,
    performanceId: number,
  ): Promise<void> {
    await this.assertEngagementExists(engagementId);

    const perf = await this.performanceRepo.findOne({
      where: { performanceId, engagementId },
    });
    if (!perf) {
      throw new NotFoundException({
        message: `Performance #${performanceId} not found for engagement #${engagementId}.`,
      });
    }

    const performanceCount = await this.performanceRepo.count({
      where: { engagementId },
    });
    if (performanceCount <= 1) {
      throw new BadRequestException({
        message:
          'This is the only show for this engagement. Use Delete Engagement to remove the engagement and its show.',
      });
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(PerformanceTicketing, { performanceId });
      await manager.delete(TicketingSales, { performanceId });
      await manager.delete(Performance, { performanceId, engagementId });
    });
    await this.enforceOpeningPerformancePublic(engagementId);
  }

  // ─── Retail Partners (dbo.EngagementRetailPartner) ────────────────────────

  async listRetailPartners(engagementId: number): Promise<EngagementRetailPartnerRow[]> {
    await this.assertEngagementExists(engagementId);
    try {
      const rows = await this.dataSource.query(
        `SELECT
          erp.[EngagementRetailPartnerID] AS rpid,
          erp.[CompanyID] AS cid,
          c.[CompanyName] AS cname,
          erp.[CompanyTypeID] AS ctid,
          ct.[CompanyTypeName] AS ctname,
          erp.[ContactID] AS contid,
          ci.[FirstName] + N' ' + ci.[LastName] AS contname
         FROM dbo.EngagementRetailPartner erp
         LEFT JOIN dbo.Company c ON c.[CompanyID] = erp.[CompanyID]
         LEFT JOIN dbo.CompanyType ct ON ct.[CompanyTypeID] = erp.[CompanyTypeID]
         LEFT JOIN dbo.Contact con ON con.[ContactID] = erp.[ContactID]
         LEFT JOIN dbo.ContactInfo ci ON ci.[ContactInfoID] = con.[ContactInfoID]
         WHERE erp.[EngagementID] = ${engagementId}
         ORDER BY erp.[EngagementRetailPartnerID]`,
      ) as Record<string, unknown>[];
      const toInt = (v: unknown) => { const n = Number(v); return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null; };
      const toStr = (v: unknown) => (v == null || v === '' ? null : String(v).trim());
      return rows.map((r) => ({
        retailPartnerId: Number(pickRaw(r, 'rpid')),
        engagementId,
        companyId: toInt(pickRaw(r, 'cid')),
        companyName: toStr(pickRaw(r, 'cname')),
        companyTypeId: toInt(pickRaw(r, 'ctid')),
        companyTypeName: toStr(pickRaw(r, 'ctname')),
        contactId: toInt(pickRaw(r, 'contid')),
        contactName: toStr(pickRaw(r, 'contname')),
      }));
    } catch {
      return [];
    }
  }

  async addRetailPartner(
    engagementId: number,
    dto: CreateEngagementRetailPartnerDto,
  ): Promise<{ retailPartnerId: number }> {
    await this.assertEngagementExists(engagementId);
    const companyId = Math.trunc(Number(dto.companyId));
    const company = await this.companyRepo.findOne({ where: { companyId } });
    if (!company) {
      throw new BadRequestException({ message: `Company #${companyId} not found.` });
    }
    const companyTypeId = dto.companyTypeId != null ? Math.trunc(Number(dto.companyTypeId)) : null;
    const contactId = dto.contactId != null ? Math.trunc(Number(dto.contactId)) : null;
    const companyTypeIdSql = companyTypeId != null ? String(companyTypeId) : 'NULL';
    const contactIdSql = contactId != null ? String(contactId) : 'NULL';
    const r = await this.dataSource.query(
      `INSERT INTO dbo.EngagementRetailPartner ([EngagementID],[CompanyID],[CompanyTypeID],[ContactID],[created_by],[created_at],[modified_by],[modified_at])
       OUTPUT INSERTED.[EngagementRetailPartnerID] AS rpid
       VALUES (${engagementId}, ${companyId}, ${companyTypeIdSql}, ${contactIdSql}, N'app', GETDATE(), N'app', GETDATE())`,
    ) as Record<string, unknown>[];
    const rpid = Number(pickRaw((r as Record<string, unknown>[])?.[0] ?? {}, 'rpid'));
    return { retailPartnerId: rpid };
  }

  async removeRetailPartner(
    engagementId: number,
    retailPartnerId: number,
  ): Promise<void> {
    await this.assertEngagementExists(engagementId);
    const rid = Math.trunc(Number(retailPartnerId));
    if (!Number.isFinite(rid) || rid < 1) {
      throw new BadRequestException({ message: 'Invalid retail partner ID.' });
    }
    const r = await this.dataSource.query(
      `DELETE FROM dbo.EngagementRetailPartner
       WHERE [EngagementRetailPartnerID] = ${rid} AND [EngagementID] = ${engagementId}`,
    );
    const affected = (r as unknown as { rowsAffected?: number[] })?.[0] ?? 0;
    if ((typeof affected === 'number' ? affected : 0) === 0 && Array.isArray(r) && r.length === 0) {
      // DELETE succeeded with 0 rows - that's ok (idempotent)
    }
  }

  // ─── Marketing Meta (Tour contacts, demographics, media mix) ──────────────

  async getMarketingMeta(engagementId: number): Promise<EngagementMarketingMeta> {
    const engagement = await this.assertEngagementExists(engagementId);
    const tourId = engagement.tourId;

    // 1. Tour marketing contacts (from talent agency company's ContactAssignment,
    //    same source as the Tour screen "Contacts" tab)
    let tourMarketingContacts: TourMarketingContactRow[] = [];
    try {
      // Get the tour's talent agency company ID
      const tourRows = await this.dataSource.query(
        `SELECT [TalentAgencyCompanyID] AS agencyId FROM dbo.Tour WHERE [TourID] = @0`,
        [tourId],
      ) as Record<string, unknown>[];
      const agencyId = tourRows?.[0] ? Number(pickRaw(tourRows[0], 'agencyId')) || null : null;

      if (agencyId) {
        const rows = await this.dataSource.query(
          `SELECT
            ca.[ContactAssignmentID] AS tcid,
            ca.[ContactID] AS cid,
            ci.[FirstName] + N' ' + ci.[LastName] AS cname,
            ca.[RoleID] AS rid,
            r.[RoleName] AS rname
           FROM dbo.ContactAssignment ca
           INNER JOIN dbo.Contact con ON con.[ContactID] = ca.[ContactID]
           INNER JOIN dbo.ContactInfo ci ON ci.[ContactInfoID] = con.[ContactInfoID]
           INNER JOIN dbo.Role r ON r.[RoleID] = ca.[RoleID]
           WHERE ca.[CompanyID] = @0
             AND LOWER(r.[RoleName]) IN (N'marketing director', N'marketing manager')
           ORDER BY r.[RoleName]`,
          [agencyId],
        ) as Record<string, unknown>[];
        const toInt = (v: unknown) => { const n = Number(v); return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null; };
        const toStr = (v: unknown) => (v == null || v === '' ? null : String(v).trim());
        tourMarketingContacts = rows.map((r) => ({
          tourContactId: Number(pickRaw(r, 'tcid')),
          contactId: Number(pickRaw(r, 'cid')),
          contactName: toStr(pickRaw(r, 'cname')),
          roleId: toInt(pickRaw(r, 'rid')),
          roleName: toStr(pickRaw(r, 'rname')),
          isPrimary: false,
        }));
      }
    } catch { /* ignore */ }

    // 2. Tour general demographics (AudienceGender from dbo.Tour)
    let audienceGender: string | null = null;
    try {
      const genderRows = await this.dataSource.query(
        `SELECT [AudienceGender] AS g FROM dbo.Tour WHERE [TourID] = ${tourId}`,
      ) as Record<string, unknown>[];
      const raw = genderRows?.[0] ? pickRaw(genderRows[0], 'g') : null;
      audienceGender = raw != null && raw !== '' ? String(raw).trim() : null;
    } catch { /* ignore */ }

    // 3. Tour audience age-range demographics
    let tourAudienceDemographics: { ageRangeId: number; ageRangeLabel: string; sortOrder: number | null }[] = [];
    let tourAudienceAgeRange: string | null = null;
    try {
      const demoRows = await this.dataSource.query(
        `SELECT ar.[AgeRangeID] AS ageRangeId, ar.[AgeRangeLabel] AS label, ar.[SortOrder] AS sortOrder
         FROM dbo.TourAudienceAgeRange tar
         INNER JOIN dbo.AgeRange ar ON ar.[AgeRangeID] = tar.[AgeRangeID]
         WHERE tar.[TourID] = ${tourId}
         ORDER BY ar.[SortOrder], ar.[AgeRangeLabel]`,
      ) as Record<string, unknown>[];
      tourAudienceDemographics = demoRows.map((r) => ({
        ageRangeId: Number(pickRaw(r, 'ageRangeId') ?? 0),
        ageRangeLabel: String(pickRaw(r, 'label') ?? '').trim(),
        sortOrder: pickRaw(r, 'sortOrder') != null ? Number(pickRaw(r, 'sortOrder')) : null,
      })).filter((d) => d.ageRangeLabel);
      tourAudienceAgeRange = tourAudienceDemographics.length > 0 ? tourAudienceDemographics.map((d) => d.ageRangeLabel).join(', ') : null;
    } catch { /* ignore */ }

    // 4. Media Mix (from Tour)
    let mediaMix: TourMediaMixRow[] = [];
    try {
      const mmRows = await this.dataSource.query(
        `SELECT
          tmm.[TourMediaMixID] AS mmid,
          tmm.[AdvertisingSubTypeID] AS astid,
          ast.[SubTypeName] AS astn,
          ast.[ParentCategory] AS astpc,
          tmm.[CompanyID] AS cid,
          c.[CompanyName] AS cname
         FROM dbo.TourMediaMix tmm
         LEFT JOIN dbo.AdvertisingSubType ast ON ast.[AdvertisingSubTypeID] = tmm.[AdvertisingSubTypeID]
         LEFT JOIN dbo.Company c ON c.[CompanyID] = tmm.[CompanyID]
         WHERE tmm.[TourID] = ${tourId}
         ORDER BY ast.[ParentCategory], ast.[SubTypeName]`,
      ) as Record<string, unknown>[];
      const toInt2 = (v: unknown) => { const n = Number(v); return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null; };
      const toStr2 = (v: unknown) => (v == null || v === '' ? null : String(v).trim());
      mediaMix = mmRows.map((r) => ({
        tourMediaMixId: Number(pickRaw(r, 'mmid')),
        advertisingSubTypeId: Number(pickRaw(r, 'astid')),
        subTypeName: String(pickRaw(r, 'astn') ?? ''),
        parentCategory: toStr2(pickRaw(r, 'astpc')),
        companyId: toInt2(pickRaw(r, 'cid')),
        companyName: toStr2(pickRaw(r, 'cname')),
      }));
    } catch { /* ignore */ }

    // 5. All AdvertisingSubType reference rows (for Media Mix picker)
    let advertisingSubTypes: AdvertisingSubTypeRow[] = [];
    try {
      const astRows = await this.dataSource.query(
        `SELECT [AdvertisingSubTypeID] AS id, [SubTypeName] AS name, [ParentCategory] AS pc, [IsActive] AS ia
         FROM dbo.AdvertisingSubType WHERE [IsActive] = 1
         ORDER BY [ParentCategory], [SortOrder], [SubTypeName]`,
      ) as Record<string, unknown>[];
      advertisingSubTypes = astRows.map((r) => ({
        advertisingSubTypeId: Number(pickRaw(r, 'id')),
        subTypeName: String(pickRaw(r, 'name') ?? ''),
        parentCategory: (pickRaw(r, 'pc') == null || pickRaw(r, 'pc') === '') ? null : String(pickRaw(r, 'pc')).trim(),
        isActive: pickRaw(r, 'ia') === true || pickRaw(r, 'ia') === 1 || pickRaw(r, 'ia') === '1',
      }));
    } catch { /* ignore */ }

    // 6. IAE Marketing Team (optional columns on dbo.Engagement)
    let iaeMarketingDirectorContactId: number | null = null;
    let iaeMarketingDirectorContactName: string | null = null;
    let iaeMarketingManagerContactId: number | null = null;
    let iaeMarketingManagerContactName: string | null = null;
    let iaeMarketingCoordinatorContactId: number | null = null;
    let iaeMarketingCoordinatorContactName: string | null = null;
    if (await this.engagementHasIaeMarketingCols()) {
      try {
        const rows = await this.dataSource.query(`
          SELECT
            e.[IAEMarketingDirectorContactID] AS dirId,
            dirCI.[FirstName] + N' ' + dirCI.[LastName] AS dirName,
            e.[IAEMarketingManagerContactID] AS mgrId,
            mgrCI.[FirstName] + N' ' + mgrCI.[LastName] AS mgrName,
            e.[IAEMarketingCoordinatorContactID] AS coordId,
            coordCI.[FirstName] + N' ' + coordCI.[LastName] AS coordName
          FROM dbo.Engagement e
          LEFT JOIN dbo.Contact dirC ON dirC.[ContactID] = e.[IAEMarketingDirectorContactID]
          LEFT JOIN dbo.ContactInfo dirCI ON dirCI.[ContactInfoID] = dirC.[ContactInfoID]
          LEFT JOIN dbo.Contact mgrC ON mgrC.[ContactID] = e.[IAEMarketingManagerContactID]
          LEFT JOIN dbo.ContactInfo mgrCI ON mgrCI.[ContactInfoID] = mgrC.[ContactInfoID]
          LEFT JOIN dbo.Contact coordC ON coordC.[ContactID] = e.[IAEMarketingCoordinatorContactID]
          LEFT JOIN dbo.ContactInfo coordCI ON coordCI.[ContactInfoID] = coordC.[ContactInfoID]
          WHERE e.[EngagementID] = ${engagementId}
        `) as Record<string, unknown>[];
        const row = rows?.[0];
        if (row) {
          const toInt = (v: unknown) => { const n = Number(v); return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null; };
          const toStr = (v: unknown) => (v == null || v === '' ? null : String(v).trim());
          iaeMarketingDirectorContactId = toInt(pickRaw(row, 'dirId'));
          iaeMarketingDirectorContactName = toStr(pickRaw(row, 'dirName'));
          iaeMarketingManagerContactId = toInt(pickRaw(row, 'mgrId'));
          iaeMarketingManagerContactName = toStr(pickRaw(row, 'mgrName'));
          iaeMarketingCoordinatorContactId = toInt(pickRaw(row, 'coordId'));
          iaeMarketingCoordinatorContactName = toStr(pickRaw(row, 'coordName'));
        }
      } catch { /* ignore */ }
    }

    // 7. Tour Marketing Team (optional columns on dbo.Tour)
    let tourMarketingDirectorContactId: number | null = null;
    let tourMarketingDirectorContactName: string | null = null;
    let tourMarketingManagerContactId: number | null = null;
    let tourMarketingManagerContactName: string | null = null;
    if (await this.tourHasMarketingCols()) {
      try {
        const rows = await this.dataSource.query(`
          SELECT
            t.[TourMarketingDirectorContactID] AS dirId,
            dirCI.[FirstName] + N' ' + dirCI.[LastName] AS dirName,
            t.[TourMarketingManagerContactID] AS mgrId,
            mgrCI.[FirstName] + N' ' + mgrCI.[LastName] AS mgrName
          FROM dbo.Tour t
          LEFT JOIN dbo.Contact dirC ON dirC.[ContactID] = t.[TourMarketingDirectorContactID]
          LEFT JOIN dbo.ContactInfo dirCI ON dirCI.[ContactInfoID] = dirC.[ContactInfoID]
          LEFT JOIN dbo.Contact mgrC ON mgrC.[ContactID] = t.[TourMarketingManagerContactID]
          LEFT JOIN dbo.ContactInfo mgrCI ON mgrCI.[ContactInfoID] = mgrC.[ContactInfoID]
          WHERE t.[TourID] = ${tourId}
        `) as Record<string, unknown>[];
        const row = rows?.[0];
        if (row) {
          const toInt = (v: unknown) => { const n = Number(v); return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null; };
          const toStr = (v: unknown) => (v == null || v === '' ? null : String(v).trim());
          tourMarketingDirectorContactId = toInt(pickRaw(row, 'dirId'));
          tourMarketingDirectorContactName = toStr(pickRaw(row, 'dirName'));
          tourMarketingManagerContactId = toInt(pickRaw(row, 'mgrId'));
          tourMarketingManagerContactName = toStr(pickRaw(row, 'mgrName'));
        }
      } catch { /* ignore */ }
    }

    return {
      tourMarketingContacts,
      audienceGender,
      tourAudienceDemographics,
      tourAudienceAgeRange,
      mediaMix,
      advertisingSubTypes,
      iaeMarketingDirectorContactId,
      iaeMarketingDirectorContactName,
      iaeMarketingManagerContactId,
      iaeMarketingManagerContactName,
      iaeMarketingCoordinatorContactId,
      iaeMarketingCoordinatorContactName,
      tourMarketingDirectorContactId,
      tourMarketingDirectorContactName,
      tourMarketingManagerContactId,
      tourMarketingManagerContactName,
    };
  }

  async updateIaeMarketingTeam(
    engagementId: number,
    dto: {
      iaeMarketingDirectorContactId?: number | null;
      iaeMarketingManagerContactId?: number | null;
      iaeMarketingCoordinatorContactId?: number | null;
    },
  ): Promise<void> {
    await this.assertEngagementExists(engagementId);
    if (!(await this.engagementHasIaeMarketingCols())) return;

    const sets: string[] = [];
    if (dto.iaeMarketingDirectorContactId !== undefined) {
      sets.push(`[IAEMarketingDirectorContactID] = ${dto.iaeMarketingDirectorContactId ?? 'NULL'}`);
    }
    if (dto.iaeMarketingManagerContactId !== undefined) {
      sets.push(`[IAEMarketingManagerContactID] = ${dto.iaeMarketingManagerContactId ?? 'NULL'}`);
    }
    if (dto.iaeMarketingCoordinatorContactId !== undefined) {
      sets.push(`[IAEMarketingCoordinatorContactID] = ${dto.iaeMarketingCoordinatorContactId ?? 'NULL'}`);
    }
    if (sets.length === 0) return;
    await this.dataSource.query(
      `UPDATE dbo.Engagement SET ${sets.join(', ')} WHERE [EngagementID] = ${engagementId}`,
    );
  }

  async updateTourMarketingTeam(
    engagementId: number,
    dto: {
      tourMarketingDirectorContactId?: number | null;
      tourMarketingManagerContactId?: number | null;
    },
  ): Promise<void> {
    const engagement = await this.assertEngagementExists(engagementId);
    if (!(await this.tourHasMarketingCols())) return;

    const sets: string[] = [];
    if (dto.tourMarketingDirectorContactId !== undefined) {
      sets.push(`[TourMarketingDirectorContactID] = ${dto.tourMarketingDirectorContactId ?? 'NULL'}`);
    }
    if (dto.tourMarketingManagerContactId !== undefined) {
      sets.push(`[TourMarketingManagerContactID] = ${dto.tourMarketingManagerContactId ?? 'NULL'}`);
    }
    if (sets.length === 0) return;
    await this.dataSource.query(
      `UPDATE dbo.Tour SET ${sets.join(', ')} WHERE [TourID] = ${engagement.tourId}`,
    );
  }

  // ─── Attraction Travel (EngagementTravel / Hotel / CarService) ────────────

  private buildAddressLabel(row: Record<string, unknown> | null | undefined): string | null {
    if (!row) return null;
    const parts = [
      row['line1'],
      row['line2'],
      row['city'],
      row['state'],
      row['postal'],
      row['country'],
    ]
      .map((v) => (v == null || v === '' ? null : String(v).trim()))
      .filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }

  async listEngagementTravel(engagementId: number): Promise<EngagementTravelRow[]> {
    await this.assertEngagementExists(engagementId);

    const travels = await this.engagementTravelRepo.find({
      where: { engagementId },
      order: { engagementTravelId: 'ASC' },
    });
    if (travels.length === 0) return [];

    const results: EngagementTravelRow[] = [];

    for (const t of travels) {
      const travelType = String(t.travelType ?? '').trim();

      if (travelType === 'Hotel') {
        const hotel = await this.engagementTravelHotelRepo.findOne({
          where: { engagementTravelId: t.engagementTravelId },
        });
        const hotelCompanyName = await this.lookupCompanyName(hotel?.hotelCompanyId ?? null);
        const occupantName = await this.lookupContactName(hotel?.occupantContactId ?? null);
        // Hotel address: load from company's physical address
        let hotelAddressLine1: string | null = null;
        let hotelAddressCity: string | null = null;
        let hotelAddressStateProvince: string | null = null;
        let hotelAddressPostalCode: string | null = null;
        let hotelAddressCountry: string | null = null;
        if (hotel?.hotelCompanyId != null && hotel.hotelCompanyId > 0) {
          try {
            const addrRows = await this.dataSource.query(
              `SELECT a.[AddressLine1] AS l1, a.[City] AS city, a.[StateProvince] AS sp, a.[PostalCode] AS pc, a.[Country] AS ctry
               FROM dbo.Company c
               LEFT JOIN dbo.Address a ON a.[AddressID] = c.[PhysicalAddressID]
               WHERE c.[CompanyID] = @0`,
              [hotel.hotelCompanyId],
            );
            const ar = (addrRows as Record<string, unknown>[])?.[0];
            if (ar) {
              const ts = (k: string) => { const v = pickRaw(ar, k); return v == null || v === '' ? null : String(v).trim(); };
              hotelAddressLine1 = ts('l1');
              hotelAddressCity = ts('city');
              hotelAddressStateProvince = ts('sp');
              hotelAddressPostalCode = ts('pc');
              hotelAddressCountry = ts('ctry');
            }
          } catch { /* ignore */ }
        }
        results.push({
          engagementTravelId: t.engagementTravelId,
          travelType: 'Hotel',
          hotel: hotel
            ? {
                hotelTravelId: hotel.hotelTravelId,
                engagementTravelId: t.engagementTravelId,
                bookedBy: t.bookedBy,
                hotelCompanyId: hotel.hotelCompanyId,
                hotelCompanyName,
                hotelAddressLine1,
                hotelAddressCity,
                hotelAddressStateProvince,
                hotelAddressPostalCode,
                hotelAddressCountry,
                numberOfRooms: hotel.numberOfRooms,
                roomTypes: hotel.roomTypes,
                checkInDate: hotel.checkInDate,
                checkOutDate: hotel.checkOutDate,
                occupantContactId: hotel.occupantContactId,
                occupantContactName: occupantName,
              }
            : null,
          carServices: [],
        });
      } else if (travelType === 'Car') {
        const carServices = await this.engagementTravelCarServiceRepo.find({
          where: { engagementTravelId: t.engagementTravelId },
          order: { carServiceTravelId: 'ASC' },
        });

        const csRows: EngagementTravelCarServiceRow[] = [];
        for (const cs of carServices) {
          const [origRow, destRow] = await Promise.all([
            cs.originAddressId
              ? this.dataSource.query(
                  `SELECT [AddressLine1] AS line1, [AddressLine2] AS line2, [City] AS city, [StateProvince] AS state, [PostalCode] AS postal, [Country] AS country
                   FROM dbo.Address WHERE [AddressID]=@0`,
                  [cs.originAddressId],
                )
              : null,
            cs.destinationAddressId
              ? this.dataSource.query(
                  `SELECT [AddressLine1] AS line1, [AddressLine2] AS line2, [City] AS city, [StateProvince] AS state, [PostalCode] AS postal, [Country] AS country
                   FROM dbo.Address WHERE [AddressID]=@0`,
                  [cs.destinationAddressId],
                )
              : null,
          ]);
          csRows.push({
            carServiceTravelId: cs.carServiceTravelId,
            engagementTravelId: t.engagementTravelId,
            bookedBy: t.bookedBy,
            originAddressId: cs.originAddressId,
            originAddressLabel: this.buildAddressLabel(
              (origRow as Record<string, unknown>[])?.[0],
            ),
            destinationAddressId: cs.destinationAddressId,
            destinationAddressLabel: this.buildAddressLabel(
              (destRow as Record<string, unknown>[])?.[0],
            ),
            pickupDateTime:
              cs.pickupDateTime instanceof Date
                ? cs.pickupDateTime.toISOString()
                : (cs.pickupDateTime as string | null),
          });
        }
        results.push({
          engagementTravelId: t.engagementTravelId,
          travelType: 'Car',
          hotel: null,
          carServices: csRows,
        });
      }
    }

    return results;
  }

  async addEngagementTravelHotel(
    engagementId: number,
    dto: CreateEngagementTravelHotelDto,
  ): Promise<{ engagementTravelId: number; hotelTravelId: number }> {
    await this.assertEngagementExists(engagementId);

    return this.dataSource.transaction(async (manager) => {
      const travel = manager.create(EngagementTravel, {
        engagementId,
        travelType: 'Hotel',
        bookedBy: dto.bookedBy ?? null,
      });
      const savedTravel = await manager.save(EngagementTravel, travel);

      const hotel = manager.create(EngagementTravelHotel, {
        engagementTravelId: savedTravel.engagementTravelId,
        hotelCompanyId: dto.hotelCompanyId ?? null,
        numberOfRooms: dto.numberOfRooms ?? null,
        roomTypes: dto.roomTypes ?? null,
        checkInDate: dto.checkInDate ?? null,
        checkOutDate: dto.checkOutDate ?? null,
        occupantContactId: dto.occupantContactId ?? null,
      });
      const savedHotel = await manager.save(EngagementTravelHotel, hotel);

      return {
        engagementTravelId: savedTravel.engagementTravelId,
        hotelTravelId: savedHotel.hotelTravelId,
      };
    });
  }

  async updateEngagementTravelHotel(
    engagementId: number,
    engagementTravelId: number,
    dto: UpdateEngagementTravelHotelDto,
  ): Promise<void> {
    await this.assertEngagementExists(engagementId);

    const travel = await this.engagementTravelRepo.findOne({
      where: { engagementTravelId, engagementId },
    });
    if (!travel) throw new NotFoundException({ message: 'Travel record not found for this engagement.' });
    if (travel.travelType !== 'Hotel') throw new BadRequestException({ message: 'Travel record is not a Hotel type.' });

    if (dto.bookedBy !== undefined) travel.bookedBy = dto.bookedBy ?? null;
    await this.engagementTravelRepo.save(travel);

    const hotel = await this.engagementTravelHotelRepo.findOne({ where: { engagementTravelId } });
    if (!hotel) throw new NotFoundException({ message: 'Hotel detail record not found.' });

    if (dto.hotelCompanyId !== undefined) hotel.hotelCompanyId = dto.hotelCompanyId ?? null;
    if (dto.numberOfRooms !== undefined) hotel.numberOfRooms = dto.numberOfRooms ?? null;
    if (dto.roomTypes !== undefined) hotel.roomTypes = dto.roomTypes?.slice(0, 255) ?? null;
    if (dto.checkInDate !== undefined) hotel.checkInDate = dto.checkInDate ?? null;
    if (dto.checkOutDate !== undefined) hotel.checkOutDate = dto.checkOutDate ?? null;
    if (dto.occupantContactId !== undefined) hotel.occupantContactId = dto.occupantContactId ?? null;
    await this.engagementTravelHotelRepo.save(hotel);
  }

  async addEngagementTravelCarService(
    engagementId: number,
    dto: CreateEngagementTravelCarServiceDto,
  ): Promise<{ engagementTravelId: number; carServiceTravelId: number }> {
    await this.assertEngagementExists(engagementId);

    return this.dataSource.transaction(async (manager) => {
      // Resolve or create origin address
      let originAddressId = dto.originAddressId ?? null;
      if (originAddressId == null && dto.originAddress) {
        const addr = manager.create(Address, {
          addressLine1: dto.originAddress.addressLine1,
          addressLine2: dto.originAddress.addressLine2 ?? null,
          city: dto.originAddress.city,
          stateProvince: dto.originAddress.stateProvince,
          postalCode: dto.originAddress.postalCode,
          country: dto.originAddress.country,
        });
        const saved = await manager.save(Address, addr);
        originAddressId = saved.addressId;
      }

      // Resolve or create destination address
      let destinationAddressId = dto.destinationAddressId ?? null;
      if (destinationAddressId == null && dto.destinationAddress) {
        const addr = manager.create(Address, {
          addressLine1: dto.destinationAddress.addressLine1,
          addressLine2: dto.destinationAddress.addressLine2 ?? null,
          city: dto.destinationAddress.city,
          stateProvince: dto.destinationAddress.stateProvince,
          postalCode: dto.destinationAddress.postalCode,
          country: dto.destinationAddress.country,
        });
        const saved = await manager.save(Address, addr);
        destinationAddressId = saved.addressId;
      }

      const travel = manager.create(EngagementTravel, {
        engagementId,
        travelType: 'Car',
        bookedBy: dto.bookedBy ?? null,
      });
      const savedTravel = await manager.save(EngagementTravel, travel);

      const cs = manager.create(EngagementTravelCarService, {
        engagementTravelId: savedTravel.engagementTravelId,
        originAddressId,
        destinationAddressId,
        pickupDateTime: dto.pickupDateTime ? new Date(dto.pickupDateTime) : null,
      });
      const savedCs = await manager.save(EngagementTravelCarService, cs);

      return {
        engagementTravelId: savedTravel.engagementTravelId,
        carServiceTravelId: savedCs.carServiceTravelId,
      };
    });
  }

  async updateEngagementTravelCarService(
    engagementId: number,
    carServiceTravelId: number,
    dto: UpdateEngagementTravelCarServiceDto,
  ): Promise<void> {
    await this.assertEngagementExists(engagementId);

    const cs = await this.engagementTravelCarServiceRepo.findOne({
      where: { carServiceTravelId },
    });
    if (!cs) throw new NotFoundException({ message: 'Car service record not found.' });

    const travel = await this.engagementTravelRepo.findOne({
      where: { engagementTravelId: cs.engagementTravelId, engagementId },
    });
    if (!travel) throw new NotFoundException({ message: 'Travel record not found for this engagement.' });

    if (dto.bookedBy !== undefined) {
      travel.bookedBy = dto.bookedBy ?? null;
      await this.engagementTravelRepo.save(travel);
    }

    await this.dataSource.transaction(async (manager) => {
      if (dto.originAddressId !== undefined) {
        cs.originAddressId = dto.originAddressId ?? null;
      } else if (dto.originAddress) {
        const addr = manager.create(Address, {
          addressLine1: dto.originAddress.addressLine1,
          addressLine2: dto.originAddress.addressLine2 ?? null,
          city: dto.originAddress.city,
          stateProvince: dto.originAddress.stateProvince,
          postalCode: dto.originAddress.postalCode,
          country: dto.originAddress.country,
        });
        const saved = await manager.save(Address, addr);
        cs.originAddressId = saved.addressId;
      }

      if (dto.destinationAddressId !== undefined) {
        cs.destinationAddressId = dto.destinationAddressId ?? null;
      } else if (dto.destinationAddress) {
        const addr = manager.create(Address, {
          addressLine1: dto.destinationAddress.addressLine1,
          addressLine2: dto.destinationAddress.addressLine2 ?? null,
          city: dto.destinationAddress.city,
          stateProvince: dto.destinationAddress.stateProvince,
          postalCode: dto.destinationAddress.postalCode,
          country: dto.destinationAddress.country,
        });
        const saved = await manager.save(Address, addr);
        cs.destinationAddressId = saved.addressId;
      }

      if (dto.pickupDateTime !== undefined) {
        cs.pickupDateTime = dto.pickupDateTime ? new Date(dto.pickupDateTime) : null;
      }

      await manager.save(EngagementTravelCarService, cs);
    });
  }

  async deleteEngagementTravel(
    engagementId: number,
    engagementTravelId: number,
  ): Promise<void> {
    await this.assertEngagementExists(engagementId);
    const travel = await this.engagementTravelRepo.findOne({
      where: { engagementTravelId, engagementId },
    });
    if (!travel) throw new NotFoundException({ message: 'Travel record not found for this engagement.' });

    await this.dataSource.transaction(async (manager) => {
      if (travel.travelType === 'Hotel') {
        await manager.delete(EngagementTravelHotel, { engagementTravelId });
      } else if (travel.travelType === 'Car') {
        await manager.delete(EngagementTravelCarService, { engagementTravelId });
      }
      await manager.delete(EngagementTravel, { engagementTravelId });
    });
  }

  // ─── Engagement Partner (dbo.EngagementPartner) ─────────────────────────────

  async getEngagementPartner(
    engagementId: number,
  ): Promise<{ partnerCompanyId: number | null; partnerCompanyName: string | null; partnerContactId: number | null; partnerContactName: string | null }> {
    await this.assertEngagementExists(engagementId);
    try {
      const rows = await this.dataSource.query(
        `SELECT TOP 1
          ep.[PartnerCompanyID] AS compId,
          c.[CompanyName] AS compName,
          ep.[PartnerContactID] AS contId,
          ci.[FirstName] + N' ' + ci.[LastName] AS contName
         FROM dbo.EngagementPartner ep
         LEFT JOIN dbo.Company c ON c.[CompanyID] = ep.[PartnerCompanyID]
         LEFT JOIN dbo.Contact con ON con.[ContactID] = ep.[PartnerContactID]
         LEFT JOIN dbo.ContactInfo ci ON ci.[ContactInfoID] = con.[ContactInfoID]
         WHERE ep.[EngagementID] = ${Math.trunc(Number(engagementId))}
         ORDER BY ep.[EngagementPartnerID]`,
      ) as Record<string, unknown>[];
      const row = rows?.[0];
      if (!row) return { partnerCompanyId: null, partnerCompanyName: null, partnerContactId: null, partnerContactName: null };
      const toInt = (v: unknown) => { const n = Number(v); return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : null; };
      const toStr = (v: unknown) => (v == null || v === '' ? null : String(v).trim());
      return {
        partnerCompanyId: toInt(pickRaw(row, 'compId')),
        partnerCompanyName: toStr(pickRaw(row, 'compName')),
        partnerContactId: toInt(pickRaw(row, 'contId')),
        partnerContactName: toStr(pickRaw(row, 'contName')),
      };
    } catch {
      return { partnerCompanyId: null, partnerCompanyName: null, partnerContactId: null, partnerContactName: null };
    }
  }

  async upsertEngagementPartner(
    engagementId: number,
    dto: { partnerCompanyId: number; partnerContactId: number | null },
  ): Promise<void> {
    await this.assertEngagementExists(engagementId);
    const eid = Math.trunc(Number(engagementId));
    if (dto.partnerCompanyId == null || !Number.isFinite(Number(dto.partnerCompanyId)) || Number(dto.partnerCompanyId) < 1) {
      throw new BadRequestException({ message: 'partnerCompanyId is required.' });
    }
    const compSql = String(Math.trunc(Number(dto.partnerCompanyId)));
    const contSql = dto.partnerContactId != null ? String(Math.trunc(Number(dto.partnerContactId))) : 'NULL';

    // Check if a row already exists
    const existing = await this.dataSource.query(
      `SELECT [EngagementPartnerID] FROM dbo.EngagementPartner WHERE [EngagementID] = ${eid}`,
    ) as Record<string, unknown>[];

    if (existing.length > 0) {
      await this.dataSource.query(
        `UPDATE dbo.EngagementPartner
         SET [PartnerCompanyID] = ${compSql},
             [PartnerContactID] = ${contSql},
             [modified_by] = N'app',
             [modified_at] = GETDATE()
         WHERE [EngagementID] = ${eid}`,
      );
    } else {
      await this.dataSource.query(
        `INSERT INTO dbo.EngagementPartner ([EngagementID],[PartnerCompanyID],[PartnerContactID],[created_by],[created_at],[modified_by],[modified_at])
         VALUES (${eid}, ${compSql}, ${contSql}, N'app', GETDATE(), N'app', GETDATE())`,
      );
    }
  }

  // ── Deposit Terms (PerformanceContracts) ───────────────────────────────────

  async getDepositTerms(engagementId: number): Promise<{ depositAmount: number | null; depositDueDate: string | null }> {
    await this.assertEngagementExists(engagementId);
    try {
      const rows = await this.dataSource.query(
        `SELECT TOP 1 pc.[DepositAmount] AS depositAmount,
                CONVERT(varchar(10), pc.[DepositDueDate], 120) AS depositDueDate
         FROM dbo.PerformanceContracts pc
         WHERE pc.EngagementID = ${Math.trunc(engagementId)}
         ORDER BY pc.[ContractID] DESC`,
      );
      const row = (rows as Record<string, unknown>[])?.[0];
      if (!row) return { depositAmount: null, depositDueDate: null };
      const rawAmt = row.depositAmount ?? row.DepositAmount ?? null;
      const rawDate = row.depositDueDate ?? row.DepositDueDate ?? null;
      return {
        depositAmount: rawAmt != null && rawAmt !== '' ? Number(rawAmt) : null,
        depositDueDate: rawDate != null && rawDate !== '' ? String(rawDate).trim().slice(0, 10) : null,
      };
    } catch {
      return { depositAmount: null, depositDueDate: null };
    }
  }

  async updateDepositTerms(
    engagementId: number,
    dto: { depositAmount?: number | null; depositDueDate?: string | null },
  ): Promise<void> {
    await this.assertEngagementExists(engagementId);
    const eid = Math.trunc(engagementId);

    // Check if a PerformanceContracts row exists for this engagement
    const existing = await this.dataSource.query(
      `SELECT TOP 1 [ContractID] FROM dbo.PerformanceContracts WHERE [EngagementID] = ${eid}`,
    );
    const exists = (existing as unknown[])?.length > 0;

    const sets: string[] = [];
    if (dto.depositAmount !== undefined) {
      sets.push(`[DepositAmount] = ${dto.depositAmount == null ? 'NULL' : Number(dto.depositAmount)}`);
    }
    if (dto.depositDueDate !== undefined) {
      sets.push(`[DepositDueDate] = ${dto.depositDueDate == null || dto.depositDueDate.trim() === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(dto.depositDueDate.trim().slice(0, 10))}`);
    }
    if (!sets.length) return;

    if (exists) {
      await this.dataSource.query(
        `UPDATE dbo.PerformanceContracts SET ${sets.join(', ')} WHERE [EngagementID] = ${eid}`,
      );
    } else {
      const cols = ['[EngagementID]'];
      const vals = [String(eid)];
      if (dto.depositAmount !== undefined) {
        cols.push('[DepositAmount]');
        vals.push(dto.depositAmount == null ? 'NULL' : String(Number(dto.depositAmount)));
      }
      if (dto.depositDueDate !== undefined) {
        cols.push('[DepositDueDate]');
        vals.push(dto.depositDueDate == null || dto.depositDueDate.trim() === '' ? 'NULL' : this.escapeSqlNVarCharLiteral(dto.depositDueDate.trim().slice(0, 10)));
      }
      await this.dataSource.query(
        `INSERT INTO dbo.PerformanceContracts (${cols.join(', ')}) VALUES (${vals.join(', ')})`,
      );
    }
  }

  // ── Performance Contracts CRUD ─────────────────────────────────────────────

  async getPerformanceContracts(engagementId: number): Promise<Record<string, unknown>[]> {
    await this.assertEngagementExists(engagementId);
    const eid = Math.trunc(engagementId);
    const rows = await this.dataSource.query(
      `SELECT [ContractID] AS contractId,
              [CreatedAt] AS createdAt,
              [EngagementID] AS engagementId,
              [Agency] AS agency,
              [Agent] AS agent,
              [Attraction] AS attraction,
              [VenueName] AS venueName,
              [VenueAddress] AS venueAddress,
              [VenueCity] AS venueCity,
              [VenueState] AS venueState,
              [VenueCountry] AS venueCountry,
              [Producer] AS producer,
              [ProducerAddress] AS producerAddress,
              [ProducerFedID] AS producerFedId,
              [GuaranteeAmount] AS guaranteeAmount,
              [GuaranteeCurrency] AS guaranteeCurrency,
              [DepositAmount] AS depositAmount,
              CONVERT(varchar(10), [DepositDueDate], 120) AS depositDueDate,
              [BalanceAmount] AS balanceAmount,
              CONVERT(varchar(10), [BalanceDueDate], 120) AS balanceDueDate,
              [RoyaltyDescription] AS royaltyDescription,
              [OverageDescription] AS overageDescription,
              [PaymentTerms] AS paymentTerms,
              [PaymentMethodType] AS paymentMethodType,
              [PaymentPayableTo] AS paymentPayableTo,
              [PaymentBankName] AS paymentBankName,
              [Performances] AS performances,
              [AdditionallyInsured] AS additionallyInsured,
              [AnnotatedPdfBlobName] AS annotatedPdfBlobName,
              [OriginalFilename] AS originalFilename,
              [OneDrivePdfUrl] AS oneDrivePdfUrl
       FROM dbo.PerformanceContracts
       WHERE [EngagementID] = ${eid}
       ORDER BY [ContractID] DESC`,
    );
    return (rows as Record<string, unknown>[]).map((r) => ({
      ...r,
      guaranteeAmount: r.guaranteeAmount != null ? Number(r.guaranteeAmount) : null,
      depositAmount: r.depositAmount != null ? Number(r.depositAmount) : null,
      balanceAmount: r.balanceAmount != null ? Number(r.balanceAmount) : null,
    }));
  }

  async savePerformanceContract(
    engagementId: number,
    dto: import('./dto/save-performance-contract.dto').SavePerformanceContractDto,
  ): Promise<{ contractId: number }> {
    await this.assertEngagementExists(engagementId);
    const eid = Math.trunc(engagementId);

    const cols = ['[EngagementID]', '[CreatedAt]'];
    const vals = [String(eid), 'GETDATE()'];

    const addCol = (col: string, val: string | number | null | undefined, maxLen?: number) => {
      if (val === undefined) return;
      if (val === null || (typeof val === 'string' && val.trim() === '')) {
        cols.push(`[${col}]`);
        vals.push('NULL');
      } else if (typeof val === 'number') {
        cols.push(`[${col}]`);
        vals.push(String(val));
      } else {
        cols.push(`[${col}]`);
        vals.push(this.escapeSqlNVarCharLiteral(String(val).trim().slice(0, maxLen ?? 2048)));
      }
    };

    addCol('Agency', dto.agency, 255);
    addCol('Agent', dto.agent, 255);
    addCol('Attraction', dto.attraction, 255);
    addCol('VenueName', dto.venueName, 255);
    addCol('VenueAddress', dto.venueAddress, 500);
    addCol('VenueCity', dto.venueCity, 100);
    addCol('VenueState', dto.venueState, 100);
    addCol('VenueCountry', dto.venueCountry, 100);
    addCol('Producer', dto.producer, 255);
    addCol('ProducerAddress', dto.producerAddress, 500);
    addCol('ProducerFedID', dto.producerFedId, 50);
    addCol('GuaranteeAmount', dto.guaranteeAmount);
    addCol('GuaranteeCurrency', dto.guaranteeCurrency, 10);
    addCol('DepositAmount', dto.depositAmount);
    addCol('DepositDueDate', dto.depositDueDate, 10);
    addCol('BalanceAmount', dto.balanceAmount);
    addCol('BalanceDueDate', dto.balanceDueDate, 10);
    addCol('RoyaltyDescription', dto.royaltyDescription, 8000);
    addCol('OverageDescription', dto.overageDescription, 8000);
    addCol('PaymentTerms', dto.paymentTerms, 8000);
    addCol('PaymentMethodType', dto.paymentMethodType, 100);
    addCol('PaymentPayableTo', dto.paymentPayableTo, 255);
    addCol('PaymentBankName', dto.paymentBankName, 255);
    addCol('Performances', dto.performances, 8000);
    addCol('AdditionallyInsured', dto.additionallyInsured, 8000);
    addCol('AnnotatedPdfBlobName', dto.annotatedPdfBlobName, 500);
    addCol('OriginalFilename', dto.originalFilename, 500);
    addCol('OneDrivePdfUrl', dto.oneDrivePdfUrl, 1000);

    const result = await this.dataSource.query(
      `INSERT INTO dbo.PerformanceContracts (${cols.join(', ')}) OUTPUT INSERTED.[ContractID] AS contractId VALUES (${vals.join(', ')})`,
    );
    const contractId = (result as Record<string, unknown>[])?.[0]?.contractId;
    return { contractId: Number(contractId) };
  }

  async updatePerformanceContract(
    engagementId: number,
    contractId: number,
    dto: import('./dto/save-performance-contract.dto').SavePerformanceContractDto,
  ): Promise<void> {
    await this.assertEngagementExists(engagementId);
    const eid = Math.trunc(engagementId);
    const cid = Math.trunc(contractId);

    const sets: string[] = [];
    const addSet = (col: string, val: string | number | null | undefined, maxLen?: number) => {
      if (val === undefined) return;
      if (val === null || (typeof val === 'string' && val.trim() === '')) {
        sets.push(`[${col}] = NULL`);
      } else if (typeof val === 'number') {
        sets.push(`[${col}] = ${val}`);
      } else {
        sets.push(`[${col}] = ${this.escapeSqlNVarCharLiteral(String(val).trim().slice(0, maxLen ?? 2048))}`);
      }
    };

    addSet('Agency', dto.agency, 255);
    addSet('Agent', dto.agent, 255);
    addSet('Attraction', dto.attraction, 255);
    addSet('VenueName', dto.venueName, 255);
    addSet('VenueAddress', dto.venueAddress, 500);
    addSet('VenueCity', dto.venueCity, 100);
    addSet('VenueState', dto.venueState, 100);
    addSet('VenueCountry', dto.venueCountry, 100);
    addSet('Producer', dto.producer, 255);
    addSet('ProducerAddress', dto.producerAddress, 500);
    addSet('ProducerFedID', dto.producerFedId, 50);
    addSet('GuaranteeAmount', dto.guaranteeAmount);
    addSet('GuaranteeCurrency', dto.guaranteeCurrency, 10);
    addSet('DepositAmount', dto.depositAmount);
    addSet('DepositDueDate', dto.depositDueDate, 10);
    addSet('BalanceAmount', dto.balanceAmount);
    addSet('BalanceDueDate', dto.balanceDueDate, 10);
    addSet('RoyaltyDescription', dto.royaltyDescription, 8000);
    addSet('OverageDescription', dto.overageDescription, 8000);
    addSet('PaymentTerms', dto.paymentTerms, 8000);
    addSet('PaymentMethodType', dto.paymentMethodType, 100);
    addSet('PaymentPayableTo', dto.paymentPayableTo, 255);
    addSet('PaymentBankName', dto.paymentBankName, 255);
    addSet('Performances', dto.performances, 8000);
    addSet('AdditionallyInsured', dto.additionallyInsured, 8000);
    addSet('AnnotatedPdfBlobName', dto.annotatedPdfBlobName, 500);
    addSet('OriginalFilename', dto.originalFilename, 500);
    addSet('OneDrivePdfUrl', dto.oneDrivePdfUrl, 1000);

    if (sets.length === 0) return;

    await this.dataSource.query(
      `UPDATE dbo.PerformanceContracts SET ${sets.join(', ')} WHERE [ContractID] = ${cid} AND [EngagementID] = ${eid}`,
    );
  }

  async deletePerformanceContract(engagementId: number, contractId: number): Promise<void> {
    await this.assertEngagementExists(engagementId);
    await this.dataSource.query(
      `DELETE FROM dbo.PerformanceContracts WHERE [ContractID] = ${Math.trunc(contractId)} AND [EngagementID] = ${Math.trunc(engagementId)}`,
    );
  }
}
