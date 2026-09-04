import { AuditColumns } from '../audit/audit-columns';
export declare class EngagementTravel extends AuditColumns {
    engagementTravelId: number;
    engagementId: number;
    travelType: string;
    bookedBy: string | null;
    iaePays: boolean | null;
    iaeArranges: boolean | null;
    budgetAmount: number | null;
}
