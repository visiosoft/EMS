import { ENGAGEMENT_STATUS_VALUES } from '../engagement-status.util';
export { ENGAGEMENT_STATUS_VALUES };
export declare class CreateEngagementDto {
    engagementStatus: string;
    openingShowDate: string;
    openingShowTime: string;
    tourId: number;
    primaryVenueCompanyId: number;
    secondaryVenueCompanyIds?: number[];
    bookerId?: string | null;
    showDate?: string | null;
    dealType?: string | null;
    guarantee?: number | null;
    splitPct?: number | null;
    breakeven?: number | null;
    projectedGross?: number | null;
    projectedMargin?: number | null;
    overviewNotes?: string | null;
    workflows?: unknown;
    cancellationReason?: string | null;
}
