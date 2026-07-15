import { ConfigService } from '@nestjs/config';
export type DocumentItemType = 'folder' | 'file';
export type DocumentSource = 'sharepoint' | 'onedrive';
export type DocumentItem = {
    id: string;
    name: string;
    type: DocumentItemType;
    path: string;
    url: string;
    size?: number;
    modified?: string;
    extension?: string;
    createdById?: string;
    createdByEmail?: string;
};
export type CreateFolderResult = {
    id: string;
    name: string;
    webUrl: string;
    path: string;
};
export declare class DocumentLibraryService {
    private readonly logger;
    private readonly cache;
    private readonly cacheTtlMs;
    private readonly tenantId;
    private readonly clientId;
    private readonly clientSecret;
    private readonly oneDriveUser;
    private readonly sharePointSiteHostname;
    private readonly sharePointSitePath;
    private readonly engagementsRootFolder;
    private readonly engagementSource;
    private tokenCache;
    private sharePointSiteId;
    constructor(config: ConfigService);
    getEngagementSource(): DocumentSource;
    private resolveSiteId;
    private driveBase;
    private getCacheKey;
    private getFromCache;
    private setCache;
    private acquireAppToken;
    private graphGet;
    private buildChildrenUrl;
    getRootFolder(source?: DocumentSource): Promise<DocumentItem>;
    getFolders(relativePath?: string, source?: DocumentSource): Promise<DocumentItem[]>;
    getFiles(relativePath?: string, source?: DocumentSource): Promise<DocumentItem[]>;
    getFolderContents(relativePath?: string, source?: DocumentSource, driveUserOverride?: string): Promise<DocumentItem[]>;
    downloadItem(id: string, source?: DocumentSource, driveUserOverride?: string): Promise<{
        stream: ReadableStream<Uint8Array>;
        contentType: string;
        contentLength: string | null;
        filename: string;
    }>;
    private parseDownloadFilename;
    invalidateCache(relativePath?: string): void;
    createFolder(parentPath: string, folderName: string, source?: DocumentSource): Promise<CreateFolderResult>;
    ensureFolderHierarchy(hierarchy: string[], source?: DocumentSource): Promise<{
        path: string;
        id: string;
        webUrl: string;
    }>;
    createFolderTree(rootSegments: string[], structure: Record<string, string[]>, source?: DocumentSource): Promise<{
        rootWebUrl: string;
    }>;
    private withGraphRetry;
    uploadFile(parentPath: string, filename: string, buffer: Buffer, contentType: string, source?: DocumentSource): Promise<DocumentItem>;
    private normalizeItem;
    private getExtension;
}
