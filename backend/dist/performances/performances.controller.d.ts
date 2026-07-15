import { PerformancesService } from './performances.service';
export declare class PerformancesController {
    private readonly performancesService;
    constructor(performancesService: PerformancesService);
    findPaged(year: number, month: number, offset: number, limit: number, visibility?: string | string[], sortBy?: string, sortDir?: string): Promise<{
        data: import("./performances.service").PerformanceCalendarRow[];
        total: number;
    }>;
    findAll(year?: string, month?: string): Promise<import("./performances.service").PerformanceCalendarRow[]>;
}
