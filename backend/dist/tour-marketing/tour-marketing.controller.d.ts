import { TourMarketingService } from './tour-marketing.service';
import { SaveTourMarketingDto } from './dto/save-tour-marketing.dto';
export declare class TourMarketingController {
    private readonly tourMarketingService;
    constructor(tourMarketingService: TourMarketingService);
    getOfferCodeOptions(): {
        assignedToOptions: readonly ["IAE - Sign Up", "IAE - Full List"];
        iaeSmsOptions: readonly ["Venue - Members", "Venue - Full List", "Artist", "Bookstore", "Media Partner", "Open"];
        purposeOptions: readonly ["Presale", "Presale Discount", "Discount"];
    };
    getTourMarketing(tourId: number): Promise<{
        tourId: number;
        marketingDirector: {
            name: any;
            email: any;
            phone: any;
        } | null;
        audienceGender: string | null;
        audienceAgeRangeIds: number[];
        audienceAgeRangeLabels: string[];
        mediaMix: any;
        offerCodes: {
            offerCodeId: number;
            code: string;
            assignedTo: string | null;
            iaeSms: string | null;
            purpose: string | null;
        }[];
    }>;
    saveTourMarketing(tourId: number, dto: SaveTourMarketingDto): Promise<{
        tourId: number;
        marketingDirector: {
            name: any;
            email: any;
            phone: any;
        } | null;
        audienceGender: string | null;
        audienceAgeRangeIds: number[];
        audienceAgeRangeLabels: string[];
        mediaMix: any;
        offerCodes: {
            offerCodeId: number;
            code: string;
            assignedTo: string | null;
            iaeSms: string | null;
            purpose: string | null;
        }[];
    }>;
    deleteOfferCode(tourId: number, offerCodeId: number): Promise<void>;
}
