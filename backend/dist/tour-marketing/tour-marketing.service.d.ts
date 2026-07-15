import { DataSource, Repository } from 'typeorm';
import { Tour } from '../entities/tour.entity';
import { TourTicketingOfferCode } from '../entities/tour-ticketing-offer-code.entity';
import { SaveTourMarketingDto } from './dto/save-tour-marketing.dto';
export declare class TourMarketingService {
    private readonly tourRepo;
    private readonly offerCodeRepo;
    private readonly dataSource;
    constructor(tourRepo: Repository<Tour>, offerCodeRepo: Repository<TourTicketingOfferCode>, dataSource: DataSource);
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
