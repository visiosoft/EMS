export declare const TOUR_PROFILE_FILE_UPLOAD_DIR: string;
export declare function tourProfileFileMulterOptions(): {
    storage: import("multer").StorageEngine;
    limits: {
        fileSize: number;
    };
    fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => void;
};
export declare const TOUR_PROFILE_FILE_FIELDS: readonly [{
    readonly name: "techRiderFile";
    readonly maxCount: 1;
}, {
    readonly name: "dealSheetFile";
    readonly maxCount: 1;
}, {
    readonly name: "agencySalesFile";
    readonly maxCount: 1;
}, {
    readonly name: "stagehandListFile";
    readonly maxCount: 1;
}, {
    readonly name: "linesetScheduleFile";
    readonly maxCount: 1;
}, {
    readonly name: "cateringRiderFile";
    readonly maxCount: 1;
}, {
    readonly name: "stageDimensionsFile";
    readonly maxCount: 1;
}, {
    readonly name: "travelRequirementsFile";
    readonly maxCount: 1;
}, {
    readonly name: "soundRequirementsFile";
    readonly maxCount: 1;
}, {
    readonly name: "videoRequirementsFile";
    readonly maxCount: 1;
}, {
    readonly name: "lightingRequirementsFile";
    readonly maxCount: 1;
}, {
    readonly name: "heavyEquipmentRequirementsFile";
    readonly maxCount: 1;
}, {
    readonly name: "marketingManualFile";
    readonly maxCount: 1;
}, {
    readonly name: "marketingMaterialFile";
    readonly maxCount: 1;
}, {
    readonly name: "vipPdfFile";
    readonly maxCount: 1;
}];
export type TourProfileFileKey = (typeof TOUR_PROFILE_FILE_FIELDS)[number]['name'];
