import { LookupsService } from '../lookups/lookups.service';
import { VenueDirectoryService } from '../venue-directory/venue-directory.service';
export declare class InternalMarketsService {
    private readonly lookupsService;
    private readonly venueDirectoryService;
    constructor(lookupsService: LookupsService, venueDirectoryService: VenueDirectoryService);
    listMarkets(offset: number, limit: number, query?: string): Promise<{
        data: {
            dmaid: number;
            marketName: string;
            nielsenMarketName: string | null;
            nielsenCode: number | null;
            nielsenRank: number | null;
            population: number | null;
        }[];
        total: number;
    }>;
    suggestMarkets(query: string, limit: number): Promise<{
        dmaid: number;
        marketName: string;
        nielsenMarketName: string | null;
        nielsenCode: number | null;
        nielsenRank: number | null;
        population: number | null;
    }[]>;
    listVenuesForMarket(dmaid: number, offset: number, limit: number): Promise<{
        data: import("../venue-directory/venue-directory.service").AllVenueDirectoryRow[];
        total: number;
    }>;
}
