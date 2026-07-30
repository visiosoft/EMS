export declare const OFFER_CODE_ASSIGNED_TO_VALUES: readonly ["IAE - Sign Up", "IAE - Full List"];
export declare const OFFER_CODE_IAESMS_VALUES: readonly ["Venue - Members", "Venue - Full List", "Artist", "Bookstore", "Media Partner", "Open"];
export declare const OFFER_CODE_PURPOSE_VALUES: readonly ["Presale", "Presale Discount", "Discount"];
export declare class TourTicketingOfferCodeDto {
    offerCodeId?: number;
    code: string;
    assignedTo?: string | null;
    iaeSms?: string | null;
    purpose?: string | null;
}
export declare class SaveTourMarketingDto {
    audienceGender?: string | null;
    audienceAgeRangeIds?: number[];
    mediaMix?: MediaMixInputDto[];
    offerCodes?: TourTicketingOfferCodeDto[];
}
export declare class MediaMixInputDto {
    advertisingSubTypeId: number;
    companyId?: number | null;
}
