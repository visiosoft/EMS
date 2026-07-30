import { VenueMarketingSpecs } from './venue-marketing-specs.entity';
import { LocalizationOption } from './localization-option.entity';
export declare class VenueMarketingSpecsLocalization {
    id: number;
    venueMarketingSpecsId: number;
    spec: VenueMarketingSpecs;
    localizationOptionId: number;
    localizationOption: LocalizationOption;
    customValue: string | null;
}
