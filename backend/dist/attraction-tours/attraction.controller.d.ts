import { AttractionService } from './attraction.service';
import { CreateAttractionDto } from './dto/create-attraction.dto';
import { UpdateAttractionDto } from './dto/update-attraction.dto';
export declare class AttractionController {
    private readonly attractionService;
    constructor(attractionService: AttractionService);
    list(offset: number, limit: number, q?: string, sortBy?: string, sortDir?: string): Promise<{
        data: import("./attraction.service").AttractionListRow[];
        total: number;
    }>;
    create(dto: CreateAttractionDto): Promise<import("./attraction.service").AttractionListRow>;
    update(id: number, dto: UpdateAttractionDto): Promise<import("./attraction.service").AttractionListRow>;
    remove(id: number): Promise<void>;
}
