import { AuditColumns } from '../audit/audit-columns';
export declare class EngagementTravelHotel extends AuditColumns {
    hotelTravelId: number;
    engagementTravelId: number;
    hotelCompanyId: number | null;
    numberOfRooms: number | null;
    roomTypes: string | null;
    checkInDate: string | null;
    checkOutDate: string | null;
    occupantContactId: number | null;
}
