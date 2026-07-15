import { Tour } from './tour.entity';
export declare class EngagementProject {
    engagementProjectId: number;
    tourId: number;
    tour: Tour;
    projectStage: string;
    offerReviewStatus: string | null;
    confirmedOfferLinkId: number | null;
    createdDate: Date;
    createdBy: string | null;
}
