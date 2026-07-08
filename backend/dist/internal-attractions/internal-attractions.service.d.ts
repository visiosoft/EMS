import { AttractionService } from '../attraction-tours/attraction.service';
import { TourService } from '../attraction-tours/tour.service';
export declare class InternalAttractionsService {
    private readonly attractionService;
    private readonly tourService;
    constructor(attractionService: AttractionService, tourService: TourService);
    listAttractions(offset: number, limit: number, query?: string): Promise<{
        data: import("../attraction-tours/attraction.service").AttractionListRow[];
        total: number;
    }>;
    suggestAttractions(query: string, limit: number): Promise<import("../attraction-tours/attraction.service").AttractionListRow[]>;
    listTours(attractionId: number, offset: number, limit: number): Promise<{
        data: import("../attraction-tours/tour.service").TourListRow[];
        total: number;
    }>;
}
