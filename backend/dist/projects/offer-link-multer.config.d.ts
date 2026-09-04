export declare const DRAFTED_OFFER_UPLOAD_DIR: string;
export declare const IN_CONSIDERATION_OFFER_UPLOAD_DIR: string;
export declare function draftedOfferMulterOptions(): {
    storage: import("multer").StorageEngine;
    limits: {
        fileSize: number;
    };
    fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => void;
};
export declare function inConsiderationOfferMulterOptions(): {
    storage: import("multer").StorageEngine;
    limits: {
        fileSize: number;
    };
    fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => void;
};
