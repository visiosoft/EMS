import { AuditColumns } from '../audit/audit-columns';
import { PlacementCategory } from './placement-category.entity';
import { FileFormatOption } from './file-format-option.entity';
import { VenueStyleGuide } from './venue-style-guide.entity';
export declare class VenueMarketingSpecs extends AuditColumns {
    venueMarketingSpecsId: number;
    venueId: number;
    styleGuideEnabled: boolean;
    venueStyleGuideId: number | null;
    venueStyleGuide: VenueStyleGuide | null;
    fileName: string | null;
    placementCategoryId: number | null;
    placementCategory: PlacementCategory | null;
    graphicSizeHorizontal: string | null;
    graphicSizeVertical: string | null;
    fileFormatOptionId: number | null;
    fileFormat: FileFormatOption | null;
    notes: string | null;
}
