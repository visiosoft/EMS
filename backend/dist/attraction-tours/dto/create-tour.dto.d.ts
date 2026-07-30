export declare class CreateTourDto {
    tourName: string;
    attractionId: number;
    classId: number;
    ascap?: boolean;
    bmi?: boolean;
    sesac?: boolean;
    gmr?: boolean;
    talentAgencyCompanyId: number;
    talentAgentContactIds?: number[];
    tourStartDate?: string;
    tourEndDate?: string;
    audienceGender?: string | null;
    audienceAgeRangeIds?: number[];
    jobName?: string | null;
    tourInsuranceLanguage?: string | null;
    venueTypePreferenceId?: number | null;
    techRiderLinkId?: number | null;
}
