import { VenueMarketingSpecs } from './venue-marketing-specs.entity';
import { FileSpecOption } from './file-spec-option.entity';
export declare class VenueMarketingSpecsFileSpec {
    id: number;
    venueMarketingSpecsId: number;
    spec: VenueMarketingSpecs;
    fileSpecOptionId: number;
    fileSpecOption: FileSpecOption;
    customValue: string | null;
}
