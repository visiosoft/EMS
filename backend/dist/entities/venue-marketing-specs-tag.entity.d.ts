import { VenueMarketingSpecs } from './venue-marketing-specs.entity';
import { TagOption } from './tag-option.entity';
export declare class VenueMarketingSpecsTag {
    id: number;
    venueMarketingSpecsId: number;
    spec: VenueMarketingSpecs;
    tagOptionId: number;
    tagOption: TagOption;
}
