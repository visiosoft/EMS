import { CreatePerformanceOptionDto } from './create-project.dto';
export declare class AddProjectVenueDto {
    venueCompanyId: number;
    venueStatus: string;
    performanceOptions?: CreatePerformanceOptionDto[];
    configName?: string | null;
    dealType?: string | null;
    guarantee?: number | null;
    splitPct?: number | null;
    breakeven?: number | null;
    marketingCoOp?: number | null;
}
