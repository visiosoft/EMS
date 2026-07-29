import { AuditColumns } from '../audit/audit-columns';
export declare class EngagementTravelCarService extends AuditColumns {
    carServiceTravelId: number;
    engagementTravelId: number;
    originAddressId: number | null;
    destinationAddressId: number | null;
    pickupDateTime: Date | null;
}
