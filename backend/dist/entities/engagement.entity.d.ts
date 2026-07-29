import { AuditColumns } from '../audit/audit-columns';
import { Tour } from './tour.entity';
export declare class Engagement extends AuditColumns {
    engagementId: number;
    engagementStatus: string;
    engagementScaling: string | null;
    tourId: number;
    sellableCapacity: number | null;
    grossPotential: string | number | null;
    tourManagerContactId: number | null;
    tour: Tour;
}
