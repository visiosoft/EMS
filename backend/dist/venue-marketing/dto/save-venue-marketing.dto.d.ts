export declare class VenueStyleGuideDto {
    font?: string | null;
    primaryColors?: string | null;
    accentColors?: string | null;
    notes?: string | null;
    logoUrl?: string | null;
}
export declare class SpecLocalizationDto {
    localizationOptionId: number;
    customValue?: string | null;
}
export declare class SpecTagDto {
    tagOptionId: number;
}
export declare class SpecFileSpecDto {
    fileSpecOptionId: number;
    customValue?: string | null;
}
export declare class VenueMarketingSpecRowDto {
    venueMarketingSpecsId?: number;
    fileName?: string | null;
    placementCategoryId?: number | null;
    graphicSizeHorizontal?: string | null;
    graphicSizeVertical?: string | null;
    fileFormatOptionId?: number | null;
    notes?: string | null;
    localizations?: SpecLocalizationDto[];
    tags?: SpecTagDto[];
    fileSpecs?: SpecFileSpecDto[];
}
export declare class SaveVenueMarketingDto {
    styleGuideEnabled: boolean;
    styleGuide?: VenueStyleGuideDto | null;
    specs: VenueMarketingSpecRowDto[];
}
