import { AuditColumns } from '../audit/audit-columns';
import { Tour } from './tour.entity';
export declare class TourTicketingOfferCode extends AuditColumns {
    offerCodeId: number;
    tourId: number;
    tour: Tour;
    code: string;
    assignedTo: string | null;
    iaeSms: string | null;
    purpose: string | null;
}
