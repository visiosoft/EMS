import { DataSource } from 'typeorm';
export type HandbookSectionGrouped = {
    sectionNumber: number | null;
    sectionId: string;
    sectionTitle: string;
    heroTitle: string | null;
    subsections: Array<{
        id: string;
        subsectionId: string;
        subsectionTitle: string | null;
        content: string;
        sortOrder: number;
    }>;
};
export declare class InternalHandbookService {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    findAllSections(): Promise<HandbookSectionGrouped[]>;
    findSectionBySectionId(sectionId: string): Promise<HandbookSectionGrouped | null>;
    private stripNumberPrefix;
    private rowToGrouped;
    private sectionTitleToId;
    private slugify;
    private htmlToBlocks;
    private stripHtml;
    private decodeEntities;
}
