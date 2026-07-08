export declare const VENUE_STATUS_VALUES: readonly ["Confirmed", "Pending", "Inactive"];
export declare const OPTION_STATUS_VALUES: readonly ["Confirmed", "Pending", "Inactive"];
export declare class CreatePerformanceOptionDto {
    proposedDate: string;
    proposedTime?: string | null;
    optionStatus: string;
}
export declare class ProjectOpeningPerformanceDto {
    performanceDate: string;
    performanceTime: string;
    performanceStatus?: string | null;
}
export declare class CreateProjectVenueDto {
    venueCompanyId: number;
    venueStatus: string;
    performanceOptions?: CreatePerformanceOptionDto[];
    configName?: string | null;
    dealType?: string | null;
    guarantee?: number | null;
    splitPct?: number | null;
    breakeven?: number | null;
    marketingCoOp?: number | null;
}
export declare class CreateProjectDto {
    tourId: number;
    projectStage: string;
    offerReviewStatus?: string | null;
    talentAgencyCompanyId: number;
    createdBy?: string | null;
    tourStartDate: string;
    tourEndDate: string;
    venues?: CreateProjectVenueDto[];
    dmaIds: number[];
    openingPerformances?: ProjectOpeningPerformanceDto[];
    name?: string | null;
    bookerId?: string | null;
    agentContactId?: string | null;
    targetOnSale?: string | null;
    notes?: string | null;
}
