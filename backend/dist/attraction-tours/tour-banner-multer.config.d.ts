export declare const TOUR_BANNER_UPLOAD_DIR: string;
export declare function tourBannerMulterOptions(): {
    storage: import("multer").StorageEngine;
    limits: {
        fileSize: number;
    };
    fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => void;
};
