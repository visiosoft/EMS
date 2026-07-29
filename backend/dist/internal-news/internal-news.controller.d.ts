import { CreateNewsDto } from './dto/create-news.dto';
import { InternalNewsService } from './internal-news.service';
export declare class InternalNewsController {
    private readonly internalNewsService;
    constructor(internalNewsService: InternalNewsService);
    findAll(limit: number, skip: number): Promise<import("./internal-news.service").InternalNewsListItem[]>;
    create(dto: CreateNewsDto): Promise<import("./internal-news.service").InternalNewsListItem>;
}
