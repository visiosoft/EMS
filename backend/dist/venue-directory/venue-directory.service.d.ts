import { Repository } from 'typeorm';
import { Venue } from '../entities/venue.entity';
export interface AllVenueDirectoryRow {
    companyId: number;
    entertainmentComplexNames: string | null;
    venueName: string;
    seatingCapacity: number;
    venueTypeId: number | null;
    venueTypeName: string | null;
    dmaId: number | null;
    dmaMarketName: string | null;
    city: string | null;
    stateProvince: string | null;
}
export declare class VenueDirectoryService {
    private readonly venueRepo;
    constructor(venueRepo: Repository<Venue>);
    private static applyVenueTypeWhere;
    private baseAllVenuesQuery;
    listAllVenues(offset: number, limit: number, filters: {
        q?: string;
        complexName?: string;
        complexCompanyId?: number;
        venueTypeId?: number;
        dmaId?: number;
        dmaIds?: number[];
        sortBy?: string;
        sortDir?: string;
    }): Promise<{
        data: AllVenueDirectoryRow[];
        total: number;
    }>;
    private pickRaw;
    private nullableInt;
    private nullableStr;
    private searchTokens;
    private escapeLikePattern;
}
