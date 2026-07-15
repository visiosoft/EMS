import { InternalMarketsService } from './internal-markets.service';
export declare class InternalMarketsController {
    private readonly internalMarketsService;
    constructor(internalMarketsService: InternalMarketsService);
    suggest(query: string | undefined, limit: number): Promise<{
        dmaid: number;
        marketName: string;
        samplePostalCode: string;
        postalCount: number;
    }[]>;
    venues(dmaid: number, offset: number, limit: number): Promise<{
        data: import("../venue-directory/venue-directory.service").AllVenueDirectoryRow[];
        total: number;
    }>;
    list(offset: number, limit: number, query?: string): Promise<{
        data: {
            dmaid: number;
            marketName: string;
            samplePostalCode: string;
            postalCount: number;
        }[];
        total: number;
    }>;
}
