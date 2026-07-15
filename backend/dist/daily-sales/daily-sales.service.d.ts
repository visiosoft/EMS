import { Repository } from 'typeorm';
import { Attraction } from '../entities/attraction.entity';
import { Contact } from '../entities/contact.entity';
import { Engagement } from '../entities/engagement.entity';
import { Performance } from '../entities/performance.entity';
import { PerformanceTicketing } from '../entities/performance-ticketing.entity';
import { TicketingSales } from '../entities/ticketing-sales.entity';
import { AuditRequestContext } from '../audit/audit-request-context.service';
import { EngagementService } from '../engagements/engagement.service';
export interface DailySalesRow {
    performanceId: number;
    engagementId: number;
    salesDate: string;
    performanceDate: string;
    performanceTime: string;
    performanceStatus: string;
    engagementStatus: string;
    ticketsSold: number | null;
    revenue: number | null;
    tourId: number | null;
    tourName: string | null;
    attractionId: number | null;
    attractionName: string | null;
    venueCompanyId: number | null;
    venueCompanyName: string | null;
    venueName: string | null;
    city: string | null;
    stateProvince: string | null;
    dmaMarketName: string | null;
}
export interface PerformanceSalesRow {
    performanceId: number;
    engagementId: number;
    performanceDate: string;
    performanceTime: string;
    performanceStatus: string;
    engagementStatus: string;
    attractionId: number | null;
    attractionName: string | null;
    genre: string | null;
    tourName: string | null;
    venueCompanyName: string | null;
    venueName: string | null;
    city: string | null;
    stateProvince: string | null;
    todayDate: string;
    todayTicketsSold: number | null;
    todayRevenue: number | null;
    yesterdayDate: string;
    yesterdayTicketsSold: number | null;
    yesterdayRevenue: number | null;
    soldYesterday: number;
    totalSold: number;
    totalRevenue: number;
    daysOnSale: number;
    contactName: string | null;
    engagementSellableCapacity: number | null;
    engagementGrossPotential: number | null;
    entertainmentComplexNames: string | null;
}
export interface PerformanceCompanyFilterOption {
    companyId: number;
    companyName: string;
    companyTypeNames: string[];
    physicalCity: string | null;
    physicalStateProvince: string | null;
    dmaMarketName: string | null;
}
export interface PerformanceSalesPageResult {
    items: PerformanceSalesRow[];
    total: number;
    page: number;
    pageSize: number;
    todayDate: string;
    yesterdayDate: string;
    summary: {
        todayTickets: number;
        todayRevenue: number;
        yesterdayTickets: number;
        yesterdayRevenue: number;
        totalTickets: number;
        totalRevenue: number;
    };
    attractions: Array<{
        attractionId: number;
        attractionName: string;
    }>;
    filterOptions: {
        genres: string[];
        tours: string[];
        companies: PerformanceCompanyFilterOption[];
        venues: string[];
        contacts: string[];
    };
}
export interface EngagementSalesDashboardDto {
    engagementId: number;
    asOfDate: string;
    header: {
        attractionName: string | null;
        tourName: string;
        entertainmentComplexNames: string | null;
        venueLabel: string;
        city: string | null;
        stateProvince: string | null;
        showDate: string | null;
        showTime: string | null;
    };
    sellableCapacity: number | null;
    grossPotential: number | null;
    marketingWindow: {
        preSaleDate: string | null;
        onSaleDate: string | null;
    };
    kpis: {
        totalRevenue: number;
        ticketsDistributed: number;
        pctSold: number | null;
        revenueLast7Days: number;
        ticketsLast7Days: number;
        daysUntilOpening: number;
        pctRevenueVsPotential: number | null;
    };
    series: Array<{
        date: string;
        totalTickets: number;
        totalRevenue: number;
        dailyTickets: number;
        dailyRevenue: number;
    }>;
    summary: Array<{
        date: string;
        totalTicketsSold: number;
        totalValueSold: number;
        dailyTicketsSold: number;
        dailyValueSold: number;
        seatsSoldPct: number | null;
        seatsRemaining: number | null;
        revenueRemaining: number | null;
    }>;
    performanceId: number | null;
}
export interface AttractionEngagementBaselineRow {
    engagementId: number;
    tourName: string;
    sellableCapacity: number | null;
    grossPotential: number | null;
}
export type AttractionSalesDashboardDto = Omit<EngagementSalesDashboardDto, 'engagementId'> & {
    attractionId: number;
    engagementCount: number;
    engagementBaselines: AttractionEngagementBaselineRow[];
};
export declare class DailySalesService {
    private readonly salesRepo;
    private readonly performanceRepo;
    private readonly performanceTicketingRepo;
    private readonly engagementRepo;
    private readonly attractionRepo;
    private readonly contactRepo;
    private readonly engagementService;
    private readonly auditContext;
    private readonly logger;
    private lastConvertedProjectPerformanceRepairAt;
    constructor(salesRepo: Repository<TicketingSales>, performanceRepo: Repository<Performance>, performanceTicketingRepo: Repository<PerformanceTicketing>, engagementRepo: Repository<Engagement>, attractionRepo: Repository<Attraction>, contactRepo: Repository<Contact>, engagementService: EngagementService, auditContext: AuditRequestContext);
    private ensureConvertedProjectPerformancesFromOptions;
    private getMarketingWindowForPerformances;
    private searchTokens;
    private resolveIaeContactIdForSignedInUser;
    findAll(engagementId?: number): Promise<DailySalesRow[]>;
    findByPerformancePage(asOfDateParam: string | undefined, pageIn: number, pageSizeIn: number, searchRaw: string | undefined, attractionName: string | undefined, performanceDateRaw?: string, startDateRaw?: string, endDateRaw?: string, genreRaw?: string, tourRaw?: string, companyRaw?: string, venueRaw?: string, contactRaw?: string, sortByRaw?: string, sortDirRaw?: string, eventsScopeRaw?: string, iaeContactIdsRaw?: string): Promise<PerformanceSalesPageResult>;
    private createByPerformanceBaseQb;
    private getByPerformanceFilterOptions;
    private sumSalesForByPerformanceQuery;
    private getDistinctAttractionsFromBase;
    getByPerformanceSuggestions(asOfDateParam: string | undefined, query: string | undefined, performanceDateRaw?: string, startDateRaw?: string, endDateRaw?: string): Promise<Array<{
        label: string;
        sublabel: string;
    }>>;
    private normalizeOptionalYmd;
    private resolveAsOfDateString;
    getEngagementDashboard(engagementId: number, asOfDateParam?: string, performanceIdFilter?: number): Promise<EngagementSalesDashboardDto>;
    getAttractionSalesSummary(attractionId: number, asOfDateParam?: string): Promise<AttractionSalesDashboardDto>;
    private normalizePatchSalesDateYmd;
    private assertTicketingSalesDateOnOrBeforePerformance;
    updateSales(performanceId: number, salesDate: string, body: {
        ticketsSold?: number | null;
        revenue?: number | null;
    }): Promise<void>;
}
