import type { Response } from 'express';
import { InternalHandbookService } from './internal-handbook.service';
import { SectionQueryDto } from './dto/section-query.dto';
export declare class InternalHandbookController {
    private readonly internalHandbookService;
    constructor(internalHandbookService: InternalHandbookService);
    findAllSections(): Promise<import("./internal-handbook.service").HandbookSectionGrouped[]>;
    findSection(query: SectionQueryDto): Promise<import("./internal-handbook.service").HandbookSectionGrouped[]> | Promise<import("./internal-handbook.service").HandbookSectionGrouped | null>;
    getImage(sectionContentId: number, index: number, res: Response): Promise<void>;
}
