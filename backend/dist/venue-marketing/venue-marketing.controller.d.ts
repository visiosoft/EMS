import { VenueMarketingService } from './venue-marketing.service';
import { SaveVenueMarketingDto } from './dto/save-venue-marketing.dto';
export declare class VenueMarketingController {
    private readonly venueMarketingService;
    constructor(venueMarketingService: VenueMarketingService);
    getPlacementCategories(): Promise<import("../entities/placement-category.entity").PlacementCategory[]>;
    getMediums(): Promise<import("../entities/medium.entity").Medium[]>;
    getLocalizationOptions(): Promise<import("../entities/localization-option.entity").LocalizationOption[]>;
    getTagOptions(): Promise<import("../entities/tag-option.entity").TagOption[]>;
    getFileSpecOptions(): Promise<import("../entities/file-spec-option.entity").FileSpecOption[]>;
    getFileFormatOptions(): Promise<import("../entities/file-format-option.entity").FileFormatOption[]>;
    getVenueMarketing(venueId: number): Promise<{
        styleGuideEnabled: boolean;
        styleGuide: {
            venueStyleGuideId: number;
            font: string | null;
            primaryColors: string | null;
            accentColors: string | null;
            notes: string | null;
            logoUrl: string | null;
        } | null;
        specs: {
            venueMarketingSpecsId: number;
            fileName: string | null;
            placementCategoryId: number | null;
            placementCategoryName: string | null;
            mediumName: string | null;
            sizeUnit: string | null;
            graphicSizeHorizontal: string | null;
            graphicSizeVertical: string | null;
            fileFormatOptionId: number | null;
            fileFormatName: string | null;
            notes: string | null;
            localizations: {
                localizationOptionId: number;
                localizationName: string;
                customValue: string | null;
            }[];
            tags: {
                tagOptionId: number;
                tagName: string;
            }[];
            fileSpecs: {
                fileSpecOptionId: number;
                fileSpecName: string;
                customValue: string | null;
            }[];
        }[];
    }>;
    saveVenueMarketing(venueId: number, dto: SaveVenueMarketingDto): Promise<{
        styleGuideEnabled: boolean;
        styleGuide: {
            venueStyleGuideId: number;
            font: string | null;
            primaryColors: string | null;
            accentColors: string | null;
            notes: string | null;
            logoUrl: string | null;
        } | null;
        specs: {
            venueMarketingSpecsId: number;
            fileName: string | null;
            placementCategoryId: number | null;
            placementCategoryName: string | null;
            mediumName: string | null;
            sizeUnit: string | null;
            graphicSizeHorizontal: string | null;
            graphicSizeVertical: string | null;
            fileFormatOptionId: number | null;
            fileFormatName: string | null;
            notes: string | null;
            localizations: {
                localizationOptionId: number;
                localizationName: string;
                customValue: string | null;
            }[];
            tags: {
                tagOptionId: number;
                tagName: string;
            }[];
            fileSpecs: {
                fileSpecOptionId: number;
                fileSpecName: string;
                customValue: string | null;
            }[];
        }[];
    }>;
    deleteSpec(venueId: number, specId: number): Promise<void>;
}
