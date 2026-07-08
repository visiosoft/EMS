import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { EntraTokenVerifier } from '../auth/entra-token-verifier.service';
import { DocumentLibraryService, type DocumentItem } from './document-library.service';
import { DownloadQueryDto, FolderQueryDto, UploadBodyDto } from './dto/document-query.dto';
export declare class DocumentLibraryController {
    private readonly documentLibraryService;
    private readonly tokenVerifier;
    private readonly config;
    private readonly logger;
    constructor(documentLibraryService: DocumentLibraryService, tokenVerifier: EntraTokenVerifier, config: ConfigService);
    private resolveSource;
    private getCallerIdentity;
    private filterOwnedFiles;
    private applyOwnershipFilter;
    private resolveSelfDriveUser;
    getRoot(req: Request, query: FolderQueryDto): Promise<DocumentItem>;
    getFolders(req: Request, query: FolderQueryDto): Promise<DocumentItem[]>;
    getFiles(req: Request, query: FolderQueryDto): Promise<DocumentItem[]>;
    getFolderContents(req: Request, query: FolderQueryDto): Promise<DocumentItem[]>;
    upload(req: Request, file: Express.Multer.File, body: UploadBodyDto): Promise<DocumentItem>;
    download(req: Request, res: Response, query: DownloadQueryDto): Promise<void>;
    private toHttpException;
}
