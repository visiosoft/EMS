import { UpdateTourProfileFilesDto } from './dto/update-tour-profile-files.dto';
import { type TourProfileFileKey } from './tour-profile-file-multer.config';
import { TourProfileFilesService } from './tour-profile-files.service';
export declare class TourProfileFilesController {
    private readonly svc;
    constructor(svc: TourProfileFilesService);
    get(id: number): Promise<import("./tour-profile-files.service").TourProfileFilesResponse>;
    update(id: number, dto: UpdateTourProfileFilesDto, files: Partial<Record<TourProfileFileKey, Express.Multer.File[]>>): Promise<import("./tour-profile-files.service").TourProfileFilesResponse>;
}
