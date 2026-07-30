import { Repository } from 'typeorm';
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
}
export declare class PerformancesService {
    private readonly performanceRepo;
    constructor(performanceRepo: Repository<Performance>);
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
