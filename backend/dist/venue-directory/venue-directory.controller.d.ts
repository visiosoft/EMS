import { VenueDirectoryService } from './venue-directory.service';
export declare class VenueDirectoryController {
    private readonly venueDirectoryService;
    constructor(venueDirectoryService: VenueDirectoryService);
    listAllVenues(offset: number, limit: number, q?: string, complexName?: string, complexCompanyIdRaw?: string, venueTypeIdRaw?: string, dmaIdRaw?: string, dmaIdsRaw?: string, sortBy?: string, sortDir?: string): Promise<{
        data: import("./venue-directory.service").AllVenueDirectoryRow[];
        total: number;
    }> | {
        data: never[];
        total: number;
    };
    private parseCommaSeparatedPositiveInts;
    private parseOptPosInt;
}
