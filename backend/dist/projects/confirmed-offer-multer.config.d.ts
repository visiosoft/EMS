export declare const CONFIRMED_OFFER_UPLOAD_DIR: string;
export declare function confirmedOfferMulterOptions(): {
    storage: import("multer").StorageEngine;
    limits: {
        fileSize: number;
    };
    fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => void;
};
