export declare const ENGAGEMENT_FOLDER_STRUCTURE: Record<string, string[]>;
export declare function sanitizeFolderName(name: string): string;
export declare function buildEngagementFolderHierarchies(year: string, marketName: string | null, attractionName: string | null): string[][];
export declare function buildEngagementRootFolderName(attractionName: string | null, tourName: string | null, venueName: string | null): string;
