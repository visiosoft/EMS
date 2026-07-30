import { Medium } from './medium.entity';
export declare class PlacementCategory {
    placementCategoryId: number;
    placementName: string;
    mediumId: number;
    medium: Medium;
    sizeUnit: string | null;
    isActive: boolean;
    sortOrder: number | null;
}
