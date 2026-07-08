import { ContractExtractionService } from './contract-extraction.service';
import { SavePerformanceContractDto } from './dto/save-performance-contract.dto';
import { AddEngagementVenueDto } from './dto/add-engagement-venue.dto';
import { UpdateEngagementVenueTabDto } from './dto/update-engagement-venue-tab.dto';
import { CreateEngagementDto } from './dto/create-engagement.dto';
import { CreateEngagementIaeContactDto } from './dto/create-engagement-iae-contact.dto';
import { CreatePerformanceDto } from './dto/create-performance.dto';
import { UpdateEngagementDto } from './dto/update-engagement.dto';
import { UpdateEngagementFinanceDto } from './dto/update-engagement-finance.dto';
import { UpdateEngagementIaeContactDto } from './dto/update-engagement-iae-contact.dto';
import { UpdateNonResidentWithholdingLinksDto } from './dto/update-non-resident-withholding-links.dto';
import { UpdatePerformanceTicketingDto } from './dto/update-performance-ticketing.dto';
import { UpdateIaeTicketingManagerDto } from './dto/update-iae-ticketing-manager.dto';
import { UpdateIaeMarketingTeamDto } from './dto/update-iae-marketing-team.dto';
import { UpdateTourMarketingTeamDto } from './dto/update-tour-marketing-team.dto';
import { CreateEngagementRetailPartnerDto } from './dto/create-engagement-retail-partner.dto';
import { CreateEngagementTravelHotelDto, UpdateEngagementTravelHotelDto, CreateEngagementTravelCarServiceDto, UpdateEngagementTravelCarServiceDto } from './dto/engagement-travel.dto';
import { EngagementService } from './engagement.service';
export declare class EngagementController {
    private readonly engagementService;
    private readonly contractExtractionService;
    private readonly logger;
    constructor(engagementService: EngagementService, contractExtractionService: ContractExtractionService);
    list(): Promise<import("./engagement.service").EngagementListRow[]>;
    filterOptions(): Promise<{
        attractionNames: string[];
        dmaMarketNames: string[];
        venueLabels: string[];
    }>;
    financeLookups(): Promise<import("./engagement.service").EngagementFinanceLookups>;
    listByTour(tourId: number): Promise<import("./engagement.service").EngagementListRow[]>;
    iaeContactLookups(): Promise<import("./engagement.service").EngagementIaeContactLookups>;
    listHubSchedule(startDate?: string, endDate?: string): Promise<import("./engagement.service").EngagementListRow[]>;
    listHubRedAlerts(): Promise<import("./engagement.service").HubRedAlertRow[]>;
    updateWithholdingLinks(withholdingId: number, dto: UpdateNonResidentWithholdingLinksDto): Promise<void>;
    createWithholdingForEngagement(id: number): Promise<{
        withholdingId: number;
    }>;
    getFinance(id: number): Promise<import("./engagement.service").EngagementFinanceRow>;
    updateFinance(id: number, dto: UpdateEngagementFinanceDto): Promise<void>;
    getDepositTerms(id: number): Promise<{
        depositAmount: number | null;
        depositDueDate: string | null;
    }>;
    updateDepositTerms(id: number, dto: {
        depositAmount?: number | null;
        depositDueDate?: string | null;
    }): Promise<void>;
    updateNonResidentWithholding(nrwId: number, dto: {
        withholdingArea?: string | null;
        withholdingTaxRate?: number | null;
        withholdingAgencyName?: string | null;
        iaeWaiverSubmissionDate?: string | null;
        iaeWaiverAppNumber?: string | null;
    }): Promise<void>;
    listPaged(offset: number, limit: number, q?: string, engagementId?: string, status?: string, attraction?: string, dma?: string, venue?: string, timing?: string, mine?: string, sortBy?: string, sortDir?: string, dateFrom?: string, dateTo?: string): Promise<{
        data: import("./engagement.service").EngagementListRow[];
        total: number;
    }>;
    getOne(id: number): Promise<import("./engagement.service").EngagementListRow>;
    create(dto: CreateEngagementDto): Promise<{
        engagementId: number;
    }>;
    update(id: number, dto: UpdateEngagementDto): Promise<void>;
    listIaeContacts(id: number): Promise<import("./engagement.service").EngagementIaeContactRow[]>;
    addIaeContact(id: number, dto: CreateEngagementIaeContactDto): Promise<{
        engagementIaeContactId: number;
    }>;
    updateIaeContact(id: number, eicId: number, dto: UpdateEngagementIaeContactDto): Promise<void>;
    removeIaeContact(id: number, eicId: number): Promise<void>;
    getDeleteImpact(id: number): Promise<import("./engagement.service").EngagementDeleteImpact>;
    remove(id: number): Promise<void>;
    listVenues(id: number): Promise<import("./engagement.service").EngagementVenueRow[]>;
    getVenueTabData(id: number): Promise<import("./engagement.service").EngagementVenueTabData>;
    addVenue(id: number, dto: AddEngagementVenueDto): Promise<{
        added: boolean;
    }>;
    removeVenue(id: number, venueCompanyId: number): Promise<void>;
    updateVenueTab(id: number, venueCompanyId: number, dto: UpdateEngagementVenueTabDto): Promise<void>;
    uploadSeatingChart(id: number, venueCompanyId: number, file: Express.Multer.File): Promise<{
        seatingChartLinkId: number;
        seatingChartLinkUrl: string;
    }>;
    removeSeatingChart(id: number, venueCompanyId: number): Promise<void>;
    upsertEngagementLink(id: number, dto: {
        linkUrl: string;
        linkName?: string;
        linkPurpose: string;
    }): Promise<{
        engagementLinkId: number;
        linkId: number;
    }>;
    removeEngagementLink(id: number, engagementLinkId: number): Promise<void>;
    listServiceProviders(id: number): Promise<{
        venueCompanyId: number;
        providers: import("./engagement.service").EngagementServiceProviderRow[];
    }>;
    addServiceProvider(id: number, dto: {
        providerCompanyId: number;
    }): Promise<{
        added: boolean;
    }>;
    removeServiceProvider(id: number, providerCompanyId: number): Promise<void>;
    listPerformances(id: number): Promise<{
        performanceId: number;
        engagementId: number;
        performanceStatus: string;
        performanceDate: string;
        performanceTime: string;
    }[]>;
    createPerformance(id: number, dto: CreatePerformanceDto): Promise<{
        performanceId: number;
    }>;
    updatePerformance(id: number, performanceId: number, dto: {
        performanceDate?: string;
        performanceTime?: string;
        performanceStatus?: string;
    }): Promise<void>;
    deletePerformance(id: number, performanceId: number): Promise<void>;
    getPerformancesTicketingSummary(id: number): Promise<import("./engagement.service").PerformanceTicketingSummaryRow[]>;
    getPerformanceTicketing(id: number, performanceId: number): Promise<import("./engagement.service").PerformanceTicketingRow>;
    updatePerformanceTicketing(id: number, performanceId: number, dto: UpdatePerformanceTicketingDto): Promise<void>;
    getIaeTicketingManager(id: number): Promise<import("./engagement.service").EngagementIaeTicketingManager>;
    updateIaeTicketingManager(id: number, dto: UpdateIaeTicketingManagerDto): Promise<void>;
    getMarketingMeta(id: number): Promise<import("./engagement.service").EngagementMarketingMeta>;
    updateIaeMarketingTeam(id: number, dto: UpdateIaeMarketingTeamDto): Promise<void>;
    updateTourMarketingTeam(id: number, dto: UpdateTourMarketingTeamDto): Promise<void>;
    listRetailPartners(id: number): Promise<import("./engagement.service").EngagementRetailPartnerRow[]>;
    addRetailPartner(id: number, dto: CreateEngagementRetailPartnerDto): Promise<{
        retailPartnerId: number;
    }>;
    removeRetailPartner(id: number, retailPartnerId: number): Promise<void>;
    getPartner(id: number): Promise<{
        partnerCompanyId: number | null;
        partnerCompanyName: string | null;
        partnerContactId: number | null;
        partnerContactName: string | null;
    }>;
    updatePartner(id: number, body: {
        partnerCompanyId: number;
        partnerContactId: number | null;
    }): Promise<void>;
    listTravel(id: number): Promise<import("./engagement.service").EngagementTravelRow[]>;
    addTravelHotel(id: number, dto: CreateEngagementTravelHotelDto): Promise<{
        engagementTravelId: number;
        hotelTravelId: number;
    }>;
    updateTravelHotel(id: number, travelId: number, dto: UpdateEngagementTravelHotelDto): Promise<void>;
    addTravelCarService(id: number, dto: CreateEngagementTravelCarServiceDto): Promise<{
        engagementTravelId: number;
        carServiceTravelId: number;
    }>;
    updateTravelCarService(id: number, carServiceTravelId: number, dto: UpdateEngagementTravelCarServiceDto): Promise<void>;
    deleteTravel(id: number, travelId: number): Promise<void>;
    getContracts(id: number): Promise<Record<string, unknown>[]>;
    uploadContract(id: number, file: Express.Multer.File): Promise<{
        extracted: import("./contract-extraction.service").ExtractedContractData;
        fieldMeta: Partial<Record<keyof import("./contract-extraction.service").ExtractedContractData, import("./contract-extraction.service").ContractFieldMeta>>;
        originalFilename: string;
        annotatedPdfBlobName: string;
    }>;
    saveContract(id: number, dto: SavePerformanceContractDto): Promise<{
        contractId: number;
    }>;
    updateContract(id: number, contractId: number, dto: SavePerformanceContractDto): Promise<void>;
    deleteContract(id: number, contractId: number): Promise<void>;
    getSharePointFolder(id: number): Promise<{
        linkUrl: string | null;
        linkName: string | null;
        linkPath: string | null;
        marketFolderPath: string | null;
    }>;
    getSharePointFolderStatus(id: number): Promise<{
        status: "ready" | "pending" | "failed" | "none";
        linkUrl: string | null;
        linkName: string | null;
        linkPath: string | null;
        marketFolderPath: string | null;
        source: "sharepoint" | "onedrive";
        error: string | null;
    }>;
    createSharePointFolders(id: number): {
        status: "pending";
    };
}
