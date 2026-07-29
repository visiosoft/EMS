import { DataSource, Repository } from 'typeorm';
import { VenueStyleGuide } from '../entities/venue-style-guide.entity';
import { VenueMarketingSpecs } from '../entities/venue-marketing-specs.entity';
import { VenueMarketingSpecsLocalization } from '../entities/venue-marketing-specs-localization.entity';
import { VenueMarketingSpecsTag } from '../entities/venue-marketing-specs-tag.entity';
import { VenueMarketingSpecsFileSpec } from '../entities/venue-marketing-specs-file-spec.entity';
import { PlacementCategory } from '../entities/placement-category.entity';
import { Medium } from '../entities/medium.entity';
import { LocalizationOption } from '../entities/localization-option.entity';
import { TagOption } from '../entities/tag-option.entity';
import { FileSpecOption } from '../entities/file-spec-option.entity';
import { FileFormatOption } from '../entities/file-format-option.entity';
import { Link } from '../entities/link.entity';
import { SaveVenueMarketingDto } from './dto/save-venue-marketing.dto';
export declare class VenueMarketingService {
    private readonly styleGuideRepo;
    private readonly specsRepo;
    private readonly localizationRepo;
    private readonly tagRepo;
    private readonly fileSpecRepo;
    private readonly placementCategoryRepo;
    private readonly mediumRepo;
    private readonly localizationOptionRepo;
    private readonly tagOptionRepo;
    private readonly fileSpecOptionRepo;
    private readonly fileFormatOptionRepo;
    private readonly linkRepo;
    private readonly dataSource;
    constructor(styleGuideRepo: Repository<VenueStyleGuide>, specsRepo: Repository<VenueMarketingSpecs>, localizationRepo: Repository<VenueMarketingSpecsLocalization>, tagRepo: Repository<VenueMarketingSpecsTag>, fileSpecRepo: Repository<VenueMarketingSpecsFileSpec>, placementCategoryRepo: Repository<PlacementCategory>, mediumRepo: Repository<Medium>, localizationOptionRepo: Repository<LocalizationOption>, tagOptionRepo: Repository<TagOption>, fileSpecOptionRepo: Repository<FileSpecOption>, fileFormatOptionRepo: Repository<FileFormatOption>, linkRepo: Repository<Link>, dataSource: DataSource);
    getPlacementCategories(): Promise<PlacementCategory[]>;
    getMediums(): Promise<Medium[]>;
    getLocalizationOptions(): Promise<LocalizationOption[]>;
    getTagOptions(): Promise<TagOption[]>;
    getFileSpecOptions(): Promise<FileSpecOption[]>;
    getFileFormatOptions(): Promise<FileFormatOption[]>;
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
    private upsertLogoLink;
}
