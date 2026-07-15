export declare const CONTRACT_UPLOAD_DIR: string;
export declare function contractMulterOptions(): {
    storage: import("multer").StorageEngine;
    limits: {
        fileSize: number;
    };
    fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => void;
};
