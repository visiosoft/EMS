import { Repository } from 'typeorm';
import { Attraction } from '../entities/attraction.entity';
import { Tour } from '../entities/tour.entity';
import { CreateAttractionDto } from './dto/create-attraction.dto';
import { UpdateAttractionDto } from './dto/update-attraction.dto';
import { EmsAppCreatedStore } from './ems-app-created.store';
export interface AttractionListRow {
    attractionId: number;
    attractionName: string;
    activeTourCount: number;
    latestTourBannerImageUrl: string | null;
    appCreated: boolean;
}
export declare class AttractionService {
    private readonly attractionRepo;
    private readonly tourRepo;
    private readonly emsCreated;
    constructor(attractionRepo: Repository<Attraction>, tourRepo: Repository<Tour>, emsCreated: EmsAppCreatedStore);
    private latestTourBannerUrlsByAttractionIds;
    private assertUniqueAttractionName;
    private searchTokens;
    private escapeLikePattern;
    list(): Promise<AttractionListRow[]>;
    listPaginated(offset: number, limit: number, q?: string, sortByRaw?: string, sortDirRaw?: string): Promise<{
        data: AttractionListRow[];
        total: number;
    }>;
    create(dto: CreateAttractionDto): Promise<AttractionListRow>;
    update(id: number, dto: UpdateAttractionDto): Promise<AttractionListRow>;
    private buildListRow;
    remove(id: number): Promise<void>;
}
