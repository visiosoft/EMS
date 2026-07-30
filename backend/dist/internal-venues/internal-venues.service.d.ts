import { VenueDirectoryService } from '../venue-directory/venue-directory.service';
export declare class InternalVenuesService {
    private readonly venueDirectoryService;
    constructor(venueDirectoryService: VenueDirectoryService);
    listVenues(offset: number, limit: number, query?: string): Promise<{
        data: import("../venue-directory/venue-directory.service").AllVenueDirectoryRow[];
        total: number;
    }>;
    suggestVenues(query: string, limit: number): Promise<import("../venue-directory/venue-directory.service").AllVenueDirectoryRow[]>;
}
