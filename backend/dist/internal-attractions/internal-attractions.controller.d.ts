import { InternalAttractionsService } from './internal-attractions.service';
export declare class InternalAttractionsController {
    private readonly internalAttractionsService;
    constructor(internalAttractionsService: InternalAttractionsService);
    suggest(query: string | undefined, limit: number): Promise<import("../attraction-tours/attraction.service").AttractionListRow[]>;
    tours(attractionId: number, offset: number, limit: number): Promise<{
        data: import("../attraction-tours/tour.service").TourListRow[];
        total: number;
    }>;
    list(offset: number, limit: number, query?: string): Promise<{
        data: import("../attraction-tours/attraction.service").AttractionListRow[];
        total: number;
    }>;
}
