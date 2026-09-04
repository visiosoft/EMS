import { Repository } from 'typeorm';
import { Link } from '../entities/link.entity';
import { Tour } from '../entities/tour.entity';
import { UpdateTourProfileFilesDto } from './dto/update-tour-profile-files.dto';
import type { TourProfileFileKey } from './tour-profile-file-multer.config';
export interface TourProfileFileField {
    linkId: number | null;
    linkUrl: string | null;
    linkName: string | null;
}
export interface TourProfileFilesResponse {
    tourId: number;
    techRider: TourProfileFileField;
    dealSheet: TourProfileFileField;
    agencySales: TourProfileFileField;
    stagehandList: TourProfileFileField;
    linesetSchedule: TourProfileFileField;
    cateringRider: TourProfileFileField;
    stageDimensions: TourProfileFileField;
    travelRequirements: TourProfileFileField;
    soundRequirements: TourProfileFileField;
    videoRequirements: TourProfileFileField;
    lightingRequirements: TourProfileFileField;
    heavyEquipmentRequirements: TourProfileFileField;
    marketingManual: TourProfileFileField;
    marketingMaterial: TourProfileFileField;
    vipPdf: TourProfileFileField;
    seatHoldRequirements: string | null;
    bookingDocumentTypes: string[];
}
export declare class TourProfileFilesService {
    private readonly tourRepo;
    private readonly linkRepo;
    constructor(tourRepo: Repository<Tour>, linkRepo: Repository<Link>);
    get(tourId: number): Promise<TourProfileFilesResponse>;
    update(tourId: number, dto: UpdateTourProfileFilesDto, files?: Partial<Record<TourProfileFileKey, Express.Multer.File[]>>): Promise<TourProfileFilesResponse>;
}
