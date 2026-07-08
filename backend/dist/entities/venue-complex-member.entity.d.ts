import { Venue } from './venue.entity';
import { VenueComplex } from './venue-complex.entity';
export declare class VenueComplexMember {
    venueCompanyId: number;
    complexCompanyId: number;
    venue: Venue;
    complex: VenueComplex;
}
