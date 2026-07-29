export interface MediaMixEntry {
    advertisingSubTypeId: number;
    companyId: number | null;
}
export declare class UpdateTourDto {
    tourName?: string;
    attractionId?: number;
    classId?: number;
    ascap?: boolean;
    bmi?: boolean;
    sesac?: boolean;
    gmr?: boolean;
    talentAgencyCompanyId?: number | null;
    tourManagementCompanyId?: number | null;
    talentAgentContactIds?: number[];
    audienceGender?: string | null;
    audienceAgeRangeIds?: number[];
    audienceAgeRange?: string | null;
    jobName?: string | null;
    tourInsuranceLanguage?: string | null;
    venueTypePreferenceId?: number | null;
    removeBanner?: boolean;
    mediaMix?: MediaMixEntry[];
    tourStartDate?: string | null;
    tourEndDate?: string | null;
}
