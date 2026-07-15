import { InternalVenuesService } from './internal-venues.service';
export declare class InternalVenuesController {
    private readonly internalVenuesService;
    constructor(internalVenuesService: InternalVenuesService);
    suggest(query: string | undefined, limit: number): Promise<import("../venue-directory/venue-directory.service").AllVenueDirectoryRow[]>;
    list(offset: number, limit: number, query?: string): Promise<{
        data: import("../venue-directory/venue-directory.service").AllVenueDirectoryRow[];
        total: number;
    }>;
}
