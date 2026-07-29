import { DailySalesService } from './daily-sales.service';
declare class UpdateSalesDto {
    ticketsSold?: number | null;
    revenue?: number | null;
}
export declare class DailySalesController {
    private readonly dailySalesService;
    constructor(dailySalesService: DailySalesService);
    getEngagementDashboard(engagementIdRaw?: string, asOfDate?: string, performanceIdRaw?: string): Promise<import("./daily-sales.service").EngagementSalesDashboardDto>;
    getAttractionSalesSummary(attractionIdRaw?: string, asOfDate?: string): Promise<import("./daily-sales.service").AttractionSalesDashboardDto>;
    findByPerformance(asOfDate?: string, page?: string, pageSize?: string, search?: string, attraction?: string, performanceDate?: string, startDate?: string, endDate?: string, genre?: string, tour?: string, company?: string, venue?: string, contact?: string, sortBy?: string, sortDir?: string, eventsScope?: string, iaeContactIds?: string): Promise<import("./daily-sales.service").PerformanceSalesPageResult>;
    getByPerformanceSuggestions(asOfDate?: string, q?: string, performanceDate?: string, startDate?: string, endDate?: string): Promise<{
        label: string;
        sublabel: string;
    }[]>;
    findAll(engagementId?: string): Promise<import("./daily-sales.service").DailySalesRow[]>;
    updateSales(performanceId: string, salesDate: string, body: UpdateSalesDto): Promise<void>;
}
export {};
