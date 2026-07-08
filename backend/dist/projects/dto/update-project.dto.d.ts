import { ProjectOpeningPerformanceDto } from './create-project.dto';
export declare class UpdateProjectDto {
    projectStage?: string;
    offerReviewStatus?: string | null;
    createdBy?: string | null;
    tourStartDate?: string;
    tourEndDate?: string;
    tourId?: number;
    talentAgencyCompanyId?: number;
    name?: string | null;
    bookerId?: string | null;
    agentContactId?: string | null;
    dmaIds?: number[];
    openingPerformances?: ProjectOpeningPerformanceDto[];
    targetOnSale?: string | null;
    notes?: string | null;
}
