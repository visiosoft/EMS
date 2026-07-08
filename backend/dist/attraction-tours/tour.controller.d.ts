import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { TourService } from './tour.service';
export declare class TourController {
    private readonly tourService;
    constructor(tourService: TourService);
    list(offset: number, limit: number, q?: string, sortBy?: string, sortDir?: string): Promise<{
        data: import("./tour.service").TourListRow[];
        total: number;
    }>;
    listAgeRanges(): Promise<import("../entities/age-range.entity").AgeRange[]>;
    listAdvertisingSubTypes(): Promise<import("./tour.service").AdvertisingSubTypeOption[]>;
    create(dto: CreateTourDto, bannerImage?: Express.Multer.File): Promise<import("./tour.service").TourListRow>;
    update(id: number, dto: UpdateTourDto, bannerImage?: Express.Multer.File): Promise<import("./tour.service").TourListRow>;
    remove(id: number): Promise<void>;
}
