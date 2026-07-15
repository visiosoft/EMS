import { AuditColumns } from '../audit/audit-columns';
import { Engagement } from './engagement.entity';
export declare class Performance extends AuditColumns {
    performanceId: number;
    engagementId: number;
    engagement: Engagement;
    performanceStatus: string;
    performanceDate: string;
    performanceTime: string;
}
