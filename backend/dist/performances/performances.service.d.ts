import { DataSource, Repository } from 'typeorm';
import { Performance } from '../entities/performance.entity';
export interface PerformanceCalendarRow {
    performanceId: number;
    engagementId: number;
    performanceStatus: string;
    performanceDate: string;
    performanceTime: string;
    engagementStatus: string;
    tourId: number | null;
    tourName: string | null;
    attractionId: number | null;
    attractionName: string | null;
    venueCompanyId: number | null;
    venueCompanyName: string | null;
    venueName: string | null;
    city: string | null;
    stateProvince: string | null;
    announcementDate: string | null;
    presaleStartDate: string | null;
    presaleEndDate: string | null;
    onSaleDate: string | null;
}
export declare class PerformancesService {
    private readonly performanceRepo;
    private readonly dataSource;
    private preSaleEndDateColPresent;
    constructor(performanceRepo: Repository<Performance>, dataSource: DataSource);
    private performanceTicketingHasPreSaleEndDateColumn;
    private buildCalendarQuery;
    private applyCalendarListSort;
    private applyVisibilityFilter;
    private mapCalendarRaw;
    findAll(year?: number, month?: number): Promise<PerformanceCalendarRow[]>;
    findAllPaginated(year: number, month: number, offset: number, limit: number, visibility: string[], sortByRaw?: string, sortDirRaw?: string): Promise<{
        data: PerformanceCalendarRow[];
        total: number;
    }>;
}
