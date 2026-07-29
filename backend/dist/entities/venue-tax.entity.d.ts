import { Tax } from './tax.entity';
import { Venue } from './venue.entity';
export declare class VenueTax {
    venueCompanyId: number;
    taxId: number;
    venue: Venue;
    tax: Tax;
}
