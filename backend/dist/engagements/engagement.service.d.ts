import { DataSource, Repository } from 'typeorm';
import { Company } from '../entities/company.entity';
import { Contact } from '../entities/contact.entity';
import { ContactInfo } from '../entities/contact-info.entity';
import { Department } from '../entities/department.entity';
import { Link } from '../entities/link.entity';
import { EngagementLink } from '../entities/engagement-link.entity';
import { Engagement } from '../entities/engagement.entity';
import { EngagementIAEContact } from '../entities/engagement-iae-contact.entity';
import { EngagementFinances } from '../entities/engagement-finance.entity';
import { EngagementProduction } from '../entities/engagement-production.entity';
import { EngagementVenue } from '../entities/engagement-venue.entity';
import { VenueServiceProvider } from '../entities/venue-service-provider.entity';
import { CompanyService as CompanyServiceEntity } from '../entities/company-service.entity';
import { ServiceProvided } from '../entities/service-provided.entity';
import { NonResidentWithholding } from '../entities/non-resident-withholding.entity';
import { ArtistFinance } from '../entities/artist-finance.entity';
import { SettlementFinance } from '../entities/settlement-finance.entity';
import { Performance } from '../entities/performance.entity';
import { PerformanceTicketing } from '../entities/performance-ticketing.entity';
import { Role } from '../entities/role.entity';
import { Tour } from '../entities/tour.entity';
import { Venue } from '../entities/venue.entity';
import { EmsAppCreatedStore } from '../attraction-tours/ems-app-created.store';
import { DocumentLibraryService } from '../document-library/document-library.service';
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
export interface EngagementDeleteImpact {
    canDelete: boolean;
    blockers: string[];
    dependents: {
        label: string;
        count: number;
    }[];
}
export interface EngagementListRow {
    engagementId: number;
    engagementStatus: string;
    engagementScaling: string | null;
    sellableCapacity: number | null;
    grossPotential: number | null;
    openingPerformanceDate: string | null;
    openingPerformanceTime: string | null;
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
    tourBannerImageUrl: string | null;
    entertainmentComplexNames: string | null;
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
    venueBookingManagerContactId: number | null;
    venueBookingManagerName: string | null;
    venueTypeId: number | null;
    venueTypeName: string | null;
    stageDimensions: string | null;
    flySystemSpecs: string | null;
    stageType: string | null;
    seatingChartLinkId: number | null;
    seatingChartLinkUrl: string | null;
    seatingChartUrl: string | null;
    ticketingSystem: string | null;
    ticketingAdminContactId: number | null;
    ticketingAdminContactName: string | null;
    techPackPdfUrl: string | null;
    attractionTechDirectorContactId: number | null;
    attractionTechDirectorName: string | null;
    venueContractSharePointLink: string | null;
    partiallyExecutedContractSharePointLink: string | null;
    fullyExecutedContractSharePointLink: string | null;
    venueForecastSharePointLink: string | null;
    venueMarketingDirectorContactId: number | null;
    venueMarketingDirectorName: string | null;
    venueMarketingManagerContactId: number | null;
    venueMarketingManagerName: string | null;
    venueDigitalMarketingManagerContactId: number | null;
    venueDigitalMarketingManagerName: string | null;
    iaeProductionManagerContactId: number | null;
    iaeProductionManagerContactName: string | null;
    venueProductionManagerContactId: number | null;
    venueProductionManagerContactName: string | null;
    stagehandContactId: number | null;
    stagehandContactName: string | null;
}
export interface EngagementVenueTabData {
    venues: EngagementVenueRow[];
    venueDealTypeId: number | null;
    venueDealType: string | null;
    venueTerms: string | null;
    techRiderLinkUrl: string | null;
    engagementLinks: EngagementLinkRow[];
    venueRoleContacts: Record<number, VenueRoleContacts>;
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
    tourMarketingContacts: TourMarketingContactRow[];
    audienceGender: string | null;
    tourAudienceDemographics: {
        ageRangeId: number;
        ageRangeLabel: string;
        sortOrder: number | null;
    }[];
    tourAudienceAgeRange: string | null;
    mediaMix: TourMediaMixRow[];
    advertisingSubTypes: AdvertisingSubTypeRow[];
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
    venueDealType: 'Rental' | 'CoPro' | '3rd Party Renting Venue' | 'Silent CoPro with Venue' | null;
    thirdPartyPartnerDealStructure: 'CoPro with 3rd Party' | 'CoPro with 3rd Party, 3rd Party Renting Venue' | 'Silent CoPro with 3rd Party, 3rd Party Renting Venue' | null;
    venueDealTypeId: number | null;
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
    artistDealType: string | null;
    artistGuarantee: number | null;
    artistMiddleMoney: number | null;
    artistRoyaltyVariableFee: string | null;
    artistBackEndTerms: string | null;
    artistVersusPercent: number | null;
    overagePercent: number | null;
    artistPromoterProfitPercent: number | null;
    artistBackendPercent: number | null;
    artistRoyaltyRatePercent: number | null;
    artistRoyaltyBasedOn: string | null;
    finalAcceptedOfferLink: string | null;
    settlementFileSharePointLink: string | null;
    tourSplitPoint: number | null;
    announcementDate: string | null;
    promoterPartnerCompanyId: number | null;
    promoterPartnerCompanyName: string | null;
    promoterPartnerContactId: number | null;
    promoterPartnerContactName: string | null;
    tourManagerContactId: number | null;
    tourManagerContactName: string | null;
    attractionContractSharePointLink: string | null;
    partiallyExecutedAttractionContractSharePointLink: string | null;
    fullyExecutedAttractionContractSharePointLink: string | null;
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
    tourAscap: boolean | null;
    tourBmi: boolean | null;
    tourSesac: boolean | null;
    tourGmr: boolean | null;
    artistDepositRequired: boolean | null;
    artistPartOfCollateralizedDeal: boolean | null;
    artistFexPerformanceAgreementLink: string | null;
    artistTourOfferLink: string | null;
    artistOverageAmount: number | null;
    artistBuyouts: number | null;
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
    iaeApplicationWaiverStatuses: {
        value: string;
        label: string;
    }[];
    venueDealTypes: {
        id: number;
        label: string;
    }[];
}
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
export interface EngagementListFilters {
    q?: string;
    engagementId?: number;
    status?: string;
    attractionName?: string;
    dmaMarketName?: string;
    venueLabel?: string;
    timing?: 'all' | 'upcoming' | 'past';
    mine?: boolean;
    sortBy?: string;
    sortDir?: string;
    dateFrom?: string;
    dateTo?: string;
}
export interface HubRedAlertRow {
    engagementId: number;
    attractionName: string | null;
    tourName: string | null;
    venueName: string | null;
    city: string | null;
    stateProvince: string | null;
    openingPerformanceDate: string | null;
    salesRevenueGoal: number;
    totalRevenue: number;
    pctToGoal: number;
}
export declare class EngagementService {
    private readonly engagementRepo;
    private readonly engagementFinancesRepo;
    private readonly engagementVenueRepo;
    private readonly engagementProductionRepo;
    private readonly tourRepo;
    private readonly venueRepo;
    private readonly companyRepo;
    private readonly venueServiceProviderRepo;
    private readonly companyServiceRepo;
    private readonly serviceProvidedRepo;
    private readonly performanceRepo;
    private readonly performanceTicketingRepo;
    private readonly linkRepo;
    private readonly engagementIaeContactRepo;
    private readonly contactRepo;
    private readonly contactInfoRepo;
    private readonly roleRepo;
    private readonly departmentRepo;
    private readonly nonResidentWithholdingRepo;
    private readonly artistFinanceRepo;
    private readonly settlementFinanceRepo;
    private readonly engagementTravelRepo;
    private readonly engagementTravelCarServiceRepo;
    private readonly engagementTravelHotelRepo;
    private readonly engagementLinkRepo;
    private readonly emsCreated;
    private readonly dataSource;
    private readonly auditContext;
    private readonly documentLibrary;
    private readonly logger;
    private readonly folderJobs;
    private engagementFinanceSharePointLinkColsPresent;
    private engagementFinanceMarketingBudgetColsPresent;
    private engagementFinanceDealStructureColsPresent;
    private performanceTicketingAdvancedColsPresent;
    private performanceTicketingExtendedColsPresent;
    private performanceTicketingPasswordColsPresent;
    private engagementFinancesIaeTicketingManagerColPresent;
    private nonResidentWithholdingHasDmaIdColumn;
    private engagementProductionTimeColsPresent;
    private engagementVenueOptionalColsPresent;
    private venueOptionalTechPackColPresent;
    private engagementVenueMarketingColsPresent;
    private engagementVenueProductionManagerColPresent;
    private engagementVenueVenueProductionManagerColPresent;
    private engagementVenueStagehandContactColPresent;
    private engagementVenueTicketingAdminColPresent;
    private venueSeatingChartUrlColPresent;
    private engagementIaeMarketingColsPresent;
    private tourMarketingColsPresent;
    private engagementFinanceAnnouncementDatePresent;
    private engagementFinanceBookingColsPresent;
    private engagementFinanceContractLinkColsPresent;
    private engagementFinanceEventBusinessColsPresent;
    constructor(engagementRepo: Repository<Engagement>, engagementFinancesRepo: Repository<EngagementFinances>, engagementVenueRepo: Repository<EngagementVenue>, engagementProductionRepo: Repository<EngagementProduction>, tourRepo: Repository<Tour>, venueRepo: Repository<Venue>, companyRepo: Repository<Company>, venueServiceProviderRepo: Repository<VenueServiceProvider>, companyServiceRepo: Repository<CompanyServiceEntity>, serviceProvidedRepo: Repository<ServiceProvided>, performanceRepo: Repository<Performance>, performanceTicketingRepo: Repository<PerformanceTicketing>, linkRepo: Repository<Link>, engagementIaeContactRepo: Repository<EngagementIAEContact>, contactRepo: Repository<Contact>, contactInfoRepo: Repository<ContactInfo>, roleRepo: Repository<Role>, departmentRepo: Repository<Department>, nonResidentWithholdingRepo: Repository<NonResidentWithholding>, artistFinanceRepo: Repository<ArtistFinance>, settlementFinanceRepo: Repository<SettlementFinance>, engagementTravelRepo: Repository<EngagementTravel>, engagementTravelCarServiceRepo: Repository<EngagementTravelCarService>, engagementTravelHotelRepo: Repository<EngagementTravelHotel>, engagementLinkRepo: Repository<EngagementLink>, emsCreated: EmsAppCreatedStore, dataSource: DataSource, auditContext: AuditRequestContext, documentLibrary: DocumentLibraryService);
    private getPrimaryVenueCompanyIdForEngagement;
    private loadCompanyServices;
    private normalizeTime;
    private assertPerformanceSlotAvailable;
    private assertVenueCompany;
    private assertEngagementExists;
    private mapFinanceNumber;
    private mapFinanceYmd;
    private assertYmdOrNull;
    private escapeSqlNVarCharLiteral;
    private escapeLikePattern;
    private searchTokens;
    private engagementFinancesHasSharePointLinkColumns;
    private mergeFinanceSharePointLinksFromDb;
    private tryPersistFinanceSharePointLinks;
    private engagementFinancesHasMarketingBudgetColumns;
    private mergeFinanceMarketingBudgetFromDb;
    private engagementFinancesHasAnnouncementDateColumn;
    private mergeFinanceAnnouncementDateFromDb;
    private mergeAnnouncementDateFromProduction;
    private tryPersistFinanceMarketingBudget;
    private tryPersistFinanceAnnouncementDate;
    private tryPersistAnnouncementDateToProduction;
    private normalizeVenueDealType;
    private normalizeThirdPartyPartnerDealStructure;
    private engagementFinancesGetDealStructureColumns;
    private mergeFinanceDealStructuresFromDb;
    private tryPersistFinanceDealStructures;
    private engagementFinancesHasBookingColumns;
    private engagementFinancesHasContractLinkColumns;
    private mergeFinanceBookingFieldsFromDb;
    private tryPersistFinanceBookingFields;
    private engagementFinancesHasEventBusinessColumns;
    private mergeFinanceEventBusinessFieldsFromDb;
    private tryPersistFinanceEventBusinessFields;
    private engagementFinanceCustomerColPresent;
    private engagementFinancesHasCustomerColumn;
    private mergeFinanceCustomerFromDb;
    private tryPersistFinanceCustomer;
    private engagementFinancePromoterPartnerCompanyColPresent;
    private engagementFinancesHasPromoterPartnerCompanyColumn;
    private mergeFinancePromoterPartnerCompanyFromDb;
    private tryPersistFinancePromoterPartnerCompany;
    private engagementProductionHasTimeColumns;
    private normalizeTicketingAdmin;
    private normalizeTicketingPick;
    private performanceTicketingHasAdvancedColumns;
    private performanceTicketingHasExtendedColumns;
    private performanceTicketingHasPasswordColumns;
    private engagementFinancesHasIaeTicketingManagerCol;
    private mergePerformanceTicketingAdvancedFromDb;
    private mergePerformanceTicketingExtendedFromDb;
    private mergePerformanceTicketingPasswordFromDb;
    private tryPersistPerformanceTicketingAdvanced;
    private tryPersistPerformanceTicketingExtended;
    private tryPersistPerformanceTicketingPassword;
    private getPerformanceIdFromTicketingId;
    private mergeEngagementProductionTimesFromDb;
    private tryPersistEngagementProductionTimes;
    private enforceOpeningPerformancePublic;
    private mapBit;
    private mapFinanceLink;
    private dboTableHasColumn;
    private nonResidentWithholdingHasDmaId;
    private listNonResidentWithholdingRowsSafe;
    updateNonResidentWithholding(withholdingId: number, dto: {
        withholdingArea?: string | null;
        withholdingTaxRate?: number | null;
        withholdingAgencyName?: string | null;
        iaeWaiverSubmissionDate?: string | null;
        iaeWaiverAppNumber?: string | null;
    }): Promise<void>;
    private findNonResidentWithholdingByIdSafe;
    private assertNonResidentWithholdingExists;
    private normalizeHttpOrHttpsUrl;
    private upsertUrlLink;
    private upsertTicketingUrlLink;
    private toPercentOrNull;
    private toDecimalOrNull;
    private normalizeRoyaltyBasis;
    private parseArtistRoyaltyVariableFee;
    private parseArtistBackEndTerms;
    private nextArtistRoyaltyVariableFee;
    private nextArtistBackEndTerms;
    private settlementFinanceResponseSlice;
    private toFinanceResponse;
    private buildEngagementQuery;
    private parseOpeningDateOnly;
    private parseOpeningTimeOnly;
    private mapRaw;
    list(): Promise<EngagementListRow[]>;
    listByCompany(companyId: number): Promise<EngagementListRow[]>;
    listByTour(tourId: number): Promise<EngagementListRow[]>;
    private openingPerformanceDateSubquery;
    private openingPerformanceTimeSubquery;
    private engagementRehearsalDateSubquery;
    private engagementLoadInDateSubquery;
    private applyEngagementListFilters;
    private applyEngagementListSort;
    private resolveIaeContactIdForSignedInUser;
    listHubSchedule(startDateRaw?: string, endDateRaw?: string): Promise<EngagementListRow[]>;
    private normalizeHubScheduleYmd;
    listHubRedAlerts(): Promise<HubRedAlertRow[]>;
    listPaginated(offset: number, limit: number, filters?: EngagementListFilters): Promise<{
        data: EngagementListRow[];
        total: number;
    }>;
    filterOptions(): Promise<{
        attractionNames: string[];
        dmaMarketNames: string[];
        venueLabels: string[];
    }>;
    getOne(id: number): Promise<EngagementListRow>;
    getFinance(engagementId: number): Promise<EngagementFinanceRow>;
    private mergeFinanceTourLicensingFromDb;
    getFinanceLookups(): Promise<EngagementFinanceLookups>;
    updateNonResidentWithholdingLinks(withholdingId: number, dto: UpdateNonResidentWithholdingLinksDto): Promise<void>;
    createWithholdingForEngagement(engagementId: number): Promise<{
        withholdingId: number;
    }>;
    private assertFinanceFks;
    upsertFinance(engagementId: number, dto: UpdateEngagementFinanceDto): Promise<void>;
    create(dto: CreateEngagementDto): Promise<{
        engagementId: number;
    }>;
    getSharePointFolderLink(engagementId: number): Promise<{
        linkUrl: string | null;
        linkName: string | null;
        linkPath: string | null;
        marketFolderPath: string | null;
    }>;
    private resolveEngagementFolderPaths;
    private resolveEngagementFolderContext;
    ensureSharePointFolders(engagementId: number): Promise<{
        rootWebUrl: string;
    }>;
    startFolderProvisioning(engagementId: number): {
        status: 'pending';
    };
    private runFolderProvisioning;
    getSharePointFolderStatus(engagementId: number): Promise<{
        status: 'ready' | 'pending' | 'failed' | 'none';
        linkUrl: string | null;
        linkName: string | null;
        linkPath: string | null;
        marketFolderPath: string | null;
        source: 'sharepoint' | 'onedrive';
        error: string | null;
    }>;
    update(id: number, dto: UpdateEngagementDto): Promise<void>;
    private assertEngagementDeletableForDelete;
    getEngagementDeleteImpact(engagementId: number): Promise<EngagementDeleteImpact>;
    remove(id: number): Promise<void>;
    private engagementVenueHasOptionalCols;
    private engagementVenueHasMarketingCols;
    private engagementHasIaeMarketingCols;
    private tourHasMarketingCols;
    private engagementVenueHasProductionManagerCol;
    private engagementVenueHasVenueProductionManagerCol;
    private readEngagementVenueVenueProductionManagerCol;
    private engagementVenueHasStagehandContactCol;
    private readEngagementVenueStagehandContactCol;
    private engagementVenueHasTicketingAdminCol;
    private readEngagementVenueTicketingAdminCol;
    private venueHasSeatingChartUrlCol;
    private readVenueSeatingChartUrl;
    private venueHasTechPackCol;
    private readEngagementVenueOptionalCols;
    private readEngagementVenueMarketingCols;
    private readEngagementVenueProductionManagerCol;
    private readVenueTechPackUrl;
    private lookupContactName;
    private lookupCompanyName;
    getPerformancesWithTicketingSummary(engagementId: number): Promise<PerformanceTicketingSummaryRow[]>;
    getIaeTicketingManager(engagementId: number): Promise<EngagementIaeTicketingManager>;
    updateIaeTicketingManager(engagementId: number, iaeTicketingManagerContactId: number | null): Promise<void>;
    listVenues(engagementId: number): Promise<EngagementVenueRow[]>;
    getVenueTabData(engagementId: number): Promise<EngagementVenueTabData>;
    updateVenueTabPerVenue(engagementId: number, venueCompanyId: number, dto: UpdateEngagementVenueTabDto): Promise<void>;
    uploadSeatingChart(engagementId: number, venueCompanyId: number, file: Express.Multer.File): Promise<{
        seatingChartLinkId: number;
        seatingChartLinkUrl: string;
    }>;
    removeSeatingChart(engagementId: number, venueCompanyId: number): Promise<void>;
    upsertEngagementLink(engagementId: number, dto: {
        linkUrl: string;
        linkName?: string;
        linkPurpose: string;
        linkPath?: string;
    }): Promise<{
        engagementLinkId: number;
        linkId: number;
    }>;
    removeEngagementLink(engagementId: number, engagementLinkId: number): Promise<void>;
    addVenue(engagementId: number, dto: AddEngagementVenueDto): Promise<{
        added: boolean;
    }>;
    removeVenue(engagementId: number, venueCompanyId: number): Promise<void>;
    listServiceProviders(engagementId: number): Promise<{
        venueCompanyId: number;
        providers: EngagementServiceProviderRow[];
    }>;
    addServiceProvider(engagementId: number, providerCompanyId: number): Promise<{
        added: boolean;
    }>;
    removeServiceProvider(engagementId: number, providerCompanyId: number): Promise<void>;
    private mapIaeCreatedDate;
    private contactDisplayLabel;
    private assertNoDuplicateIaeAssignment;
    private clearOtherPrimaryIaeContacts;
    private assertInternalContact;
    private loadInternalContactIdSet;
    getEngagementIaeContactLookups(): Promise<EngagementIaeContactLookups>;
    listEngagementIaeContacts(engagementId: number): Promise<EngagementIaeContactRow[]>;
    addEngagementIaeContact(engagementId: number, dto: CreateEngagementIaeContactDto): Promise<{
        engagementIaeContactId: number;
    }>;
    updateEngagementIaeContact(engagementId: number, eicId: number, dto: UpdateEngagementIaeContactDto): Promise<void>;
    removeEngagementIaeContact(engagementId: number, eicId: number): Promise<void>;
    listPerformances(engagementId: number): Promise<{
        performanceId: number;
        engagementId: number;
        performanceStatus: string;
        performanceDate: string;
        performanceTime: string;
    }[]>;
    private assertPerformanceForEngagement;
    getPerformanceTicketing(engagementId: number, performanceId: number): Promise<PerformanceTicketingRow>;
    private mergeSalesTaxFromVenue;
    upsertPerformanceTicketing(engagementId: number, performanceId: number, dto: UpdatePerformanceTicketingDto): Promise<void>;
    private tryPersistEngagementScaling;
    private tryPersistSalesTaxToVenue;
    createPerformance(engagementId: number, dto: CreatePerformanceDto): Promise<{
        performanceId: number;
    }>;
    updatePerformance(engagementId: number, performanceId: number, dto: {
        performanceDate?: string;
        performanceTime?: string;
        performanceStatus?: string;
    }): Promise<void>;
    deletePerformance(engagementId: number, performanceId: number): Promise<void>;
    listRetailPartners(engagementId: number): Promise<EngagementRetailPartnerRow[]>;
    addRetailPartner(engagementId: number, dto: CreateEngagementRetailPartnerDto): Promise<{
        retailPartnerId: number;
    }>;
    removeRetailPartner(engagementId: number, retailPartnerId: number): Promise<void>;
    getMarketingMeta(engagementId: number): Promise<EngagementMarketingMeta>;
    updateIaeMarketingTeam(engagementId: number, dto: {
        iaeMarketingDirectorContactId?: number | null;
        iaeMarketingManagerContactId?: number | null;
        iaeMarketingCoordinatorContactId?: number | null;
    }): Promise<void>;
    updateTourMarketingTeam(engagementId: number, dto: {
        tourMarketingDirectorContactId?: number | null;
        tourMarketingManagerContactId?: number | null;
    }): Promise<void>;
    private buildAddressLabel;
    listEngagementTravel(engagementId: number): Promise<EngagementTravelRow[]>;
    addEngagementTravelHotel(engagementId: number, dto: CreateEngagementTravelHotelDto): Promise<{
        engagementTravelId: number;
        hotelTravelId: number;
    }>;
    updateEngagementTravelHotel(engagementId: number, engagementTravelId: number, dto: UpdateEngagementTravelHotelDto): Promise<void>;
    addEngagementTravelCarService(engagementId: number, dto: CreateEngagementTravelCarServiceDto): Promise<{
        engagementTravelId: number;
        carServiceTravelId: number;
    }>;
    updateEngagementTravelCarService(engagementId: number, carServiceTravelId: number, dto: UpdateEngagementTravelCarServiceDto): Promise<void>;
    deleteEngagementTravel(engagementId: number, engagementTravelId: number): Promise<void>;
    getEngagementPartner(engagementId: number): Promise<{
        partnerCompanyId: number | null;
        partnerCompanyName: string | null;
        partnerContactId: number | null;
        partnerContactName: string | null;
    }>;
    upsertEngagementPartner(engagementId: number, dto: {
        partnerCompanyId: number;
        partnerContactId: number | null;
    }): Promise<void>;
    getDepositTerms(engagementId: number): Promise<{
        depositAmount: number | null;
        depositDueDate: string | null;
    }>;
    updateDepositTerms(engagementId: number, dto: {
        depositAmount?: number | null;
        depositDueDate?: string | null;
    }): Promise<void>;
    getPerformanceContracts(engagementId: number): Promise<Record<string, unknown>[]>;
    savePerformanceContract(engagementId: number, dto: import('./dto/save-performance-contract.dto').SavePerformanceContractDto): Promise<{
        contractId: number;
    }>;
    updatePerformanceContract(engagementId: number, contractId: number, dto: import('./dto/save-performance-contract.dto').SavePerformanceContractDto): Promise<void>;
    deletePerformanceContract(engagementId: number, contractId: number): Promise<void>;
}
