import type { DocumentSource } from '../document-library.service';
export declare class FolderQueryDto {
    path?: string;
    source?: DocumentSource;
    shared?: boolean;
    self?: boolean;
}
export declare class UploadBodyDto {
    path?: string;
    source?: DocumentSource;
}
export declare class DownloadQueryDto {
    id: string;
    source?: DocumentSource;
    self?: boolean;
}
