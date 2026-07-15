"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DocumentLibraryController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentLibraryController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const config_1 = require("@nestjs/config");
const node_stream_1 = require("node:stream");
const internal_access_guard_1 = require("../internal-access/internal-access.guard");
const entra_token_verifier_service_1 = require("../auth/entra-token-verifier.service");
const document_library_service_1 = require("./document-library.service");
const document_upload_multer_config_1 = require("./document-upload-multer.config");
const document_query_dto_1 = require("./dto/document-query.dto");
let DocumentLibraryController = DocumentLibraryController_1 = class DocumentLibraryController {
    documentLibraryService;
    tokenVerifier;
    config;
    logger = new common_1.Logger(DocumentLibraryController_1.name);
    constructor(documentLibraryService, tokenVerifier, config) {
        this.documentLibraryService = documentLibraryService;
        this.tokenVerifier = tokenVerifier;
        this.config = config;
    }
    async resolveSource(req, requested, self) {
        if (requested !== 'onedrive')
            return 'sharepoint';
        if (self) {
            return 'onedrive';
        }
        if (this.documentLibraryService.getEngagementSource() === 'onedrive') {
            return 'onedrive';
        }
        const allowed = (this.config.get('DOCUMENT_TOGGLE_USER') ?? '').trim().toLowerCase();
        if (!allowed) {
            throw new common_1.ForbiddenException('OneDrive source is not enabled (DOCUMENT_TOGGLE_USER is not configured).');
        }
        const token = (0, entra_token_verifier_service_1.getOptionalBearerToken)(req.headers.authorization);
        if (!token) {
            throw new common_1.ForbiddenException('Sign-in required to access the OneDrive source.');
        }
        let identities;
        try {
            const user = await this.tokenVerifier.verify(token);
            identities = [user.oid, user.email, user.preferred_username, user.upn]
                .filter((v) => typeof v === 'string' && v.length > 0)
                .map((v) => v.toLowerCase());
        }
        catch (error) {
            throw new common_1.ForbiddenException({
                message: 'Invalid or expired token; OneDrive source denied.',
                detail: this.tokenVerifier.buildTokenValidationDetail(token, error),
            });
        }
        if (!identities.includes(allowed)) {
            throw new common_1.ForbiddenException('You are not authorized to use the OneDrive source.');
        }
        return 'onedrive';
    }
    async getCallerIdentity(req) {
        const token = (0, entra_token_verifier_service_1.getOptionalBearerToken)(req.headers.authorization);
        if (!token)
            return null;
        try {
            const user = await this.tokenVerifier.verify(token);
            const emails = [user.email, user.preferred_username, user.upn]
                .filter((v) => typeof v === 'string' && v.length > 0)
                .map((v) => v.toLowerCase());
            return { oid: user.oid?.toLowerCase(), emails };
        }
        catch {
            return null;
        }
    }
    filterOwnedFiles(items, identity) {
        return items.filter((item) => {
            if (item.type === 'folder')
                return true;
            const ownerId = item.createdById?.toLowerCase();
            const ownerEmail = item.createdByEmail?.toLowerCase();
            if (identity.oid && ownerId && ownerId === identity.oid)
                return true;
            if (ownerEmail && identity.emails.includes(ownerEmail))
                return true;
            return false;
        });
    }
    async applyOwnershipFilter(req, source, items, self) {
        if (source !== 'sharepoint' && !self)
            return items;
        const identity = await this.getCallerIdentity(req);
        if (!identity)
            return [];
        return this.filterOwnedFiles(items, identity);
    }
    async resolveSelfDriveUser(req) {
        const identity = await this.getCallerIdentity(req);
        return identity?.oid ?? identity?.emails[0];
    }
    async getRoot(req, query) {
        try {
            const source = await this.resolveSource(req, query.source);
            return await this.documentLibraryService.getRootFolder(source);
        }
        catch (error) {
            throw this.toHttpException('root', error);
        }
    }
    async getFolders(req, query) {
        try {
            const source = await this.resolveSource(req, query.source);
            const items = await this.documentLibraryService.getFolders(query.path, source);
            return await this.applyOwnershipFilter(req, source, items);
        }
        catch (error) {
            throw this.toHttpException('folders', error);
        }
    }
    async getFiles(req, query) {
        try {
            const source = await this.resolveSource(req, query.source);
            const items = await this.documentLibraryService.getFiles(query.path, source);
            return await this.applyOwnershipFilter(req, source, items);
        }
        catch (error) {
            throw this.toHttpException('files', error);
        }
    }
    async getFolderContents(req, query) {
        try {
            const source = await this.resolveSource(req, query.source, query.self);
            let driveUserOverride;
            if (source === 'onedrive' && query.self) {
                driveUserOverride = await this.resolveSelfDriveUser(req);
                if (!driveUserOverride)
                    return [];
            }
            const items = await this.documentLibraryService.getFolderContents(query.path, source, driveUserOverride);
            if (query.shared)
                return items;
            return await this.applyOwnershipFilter(req, source, items, query.self);
        }
        catch (error) {
            throw this.toHttpException('folder contents', error);
        }
    }
    async upload(req, file, body) {
        if (!file) {
            throw new common_1.BadRequestException('No file was provided for upload.');
        }
        try {
            const source = await this.resolveSource(req, body.source);
            return await this.documentLibraryService.uploadFile(body.path ?? '', file.originalname, file.buffer, file.mimetype, source);
        }
        catch (error) {
            throw this.toHttpException('upload', error);
        }
    }
    async download(req, res, query) {
        try {
            const source = await this.resolveSource(req, query.source, query.self);
            let driveUserOverride;
            if (source === 'onedrive' && query.self) {
                driveUserOverride = await this.resolveSelfDriveUser(req);
                if (!driveUserOverride) {
                    throw new common_1.ForbiddenException('Sign-in required to download from your OneDrive.');
                }
            }
            const file = await this.documentLibraryService.downloadItem(query.id, source, driveUserOverride);
            res.setHeader('Content-Type', file.contentType);
            if (file.contentLength)
                res.setHeader('Content-Length', file.contentLength);
            res.setHeader('Content-Disposition', `attachment; filename="${file.filename.replace(/"/g, '')}"`);
            node_stream_1.Readable.fromWeb(file.stream).pipe(res);
        }
        catch (error) {
            throw this.toHttpException('download', error);
        }
    }
    toHttpException(context, error) {
        if (error instanceof common_1.HttpException)
            return error;
        this.logger.error(`Error fetching ${context}: ${error instanceof Error ? error.message : String(error)}`);
        const errResponse = extractErrorDetail(error);
        return new common_1.HttpException({
            message: errResponse.message,
            detail: errResponse.detail,
            suggestion: errResponse.suggestion,
        }, errResponse.status);
    }
};
exports.DocumentLibraryController = DocumentLibraryController;
__decorate([
    (0, common_1.Get)('root'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, document_query_dto_1.FolderQueryDto]),
    __metadata("design:returntype", Promise)
], DocumentLibraryController.prototype, "getRoot", null);
__decorate([
    (0, common_1.Get)('folders'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, document_query_dto_1.FolderQueryDto]),
    __metadata("design:returntype", Promise)
], DocumentLibraryController.prototype, "getFolders", null);
__decorate([
    (0, common_1.Get)('files'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, document_query_dto_1.FolderQueryDto]),
    __metadata("design:returntype", Promise)
], DocumentLibraryController.prototype, "getFiles", null);
__decorate([
    (0, common_1.Get)('folder'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, document_query_dto_1.FolderQueryDto]),
    __metadata("design:returntype", Promise)
], DocumentLibraryController.prototype, "getFolderContents", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', (0, document_upload_multer_config_1.documentUploadMulterOptions)())),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, document_query_dto_1.UploadBodyDto]),
    __metadata("design:returntype", Promise)
], DocumentLibraryController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)('download'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, document_query_dto_1.DownloadQueryDto]),
    __metadata("design:returntype", Promise)
], DocumentLibraryController.prototype, "download", null);
exports.DocumentLibraryController = DocumentLibraryController = DocumentLibraryController_1 = __decorate([
    (0, common_1.UseGuards)(internal_access_guard_1.InternalAccessGuard),
    (0, common_1.Controller)('documents'),
    __metadata("design:paramtypes", [document_library_service_1.DocumentLibraryService,
        entra_token_verifier_service_1.EntraTokenVerifier,
        config_1.ConfigService])
], DocumentLibraryController);
function parseGraphErrorBody(body) {
    try {
        const parsed = JSON.parse(body);
        if (parsed.error?.code) {
            return { code: parsed.error.code, message: parsed.error.message || '' };
        }
        return null;
    }
    catch {
        return null;
    }
}
function extractErrorDetail(error) {
    const fallback = {
        status: 500,
        title: 'Something went wrong',
        message: 'An unexpected error occurred while loading documents.',
        suggestion: 'Try refreshing the page. If the problem persists, contact IT support.',
        detail: '',
    };
    if (!(error instanceof Error)) {
        fallback.detail = String(error);
        return fallback;
    }
    if (!('status' in error)) {
        fallback.message = error.message || fallback.message;
        fallback.detail = error.stack || '';
        return fallback;
    }
    const graphErr = error;
    const status = graphErr.status ?? 500;
    const graphError = parseGraphErrorBody(graphErr.body);
    switch (status) {
        case 401: {
            return {
                status: 401,
                title: 'Authentication failed',
                message: 'The document library service could not authenticate with Microsoft Graph.',
                suggestion: 'Check that ENTRA_CLIENT_ID and ENTRA_CLIENT_SECRET are configured correctly in the backend environment.',
                detail: graphErr.body || '',
            };
        }
        case 403: {
            return {
                status: 403,
                title: 'Permission denied',
                message: graphError?.message || "The application doesn't have permission to access this document library.",
                suggestion: 'Verify that the Files.Read.All (Application) permission is granted and admin-consented in Azure AD.',
                detail: graphErr.body || '',
            };
        }
        case 404: {
            return {
                status: 404,
                title: 'Document library not found',
                message: 'The requested document library could not be found.',
                suggestion: 'Verify the SharePoint site exists and has a default document library.',
                detail: graphErr.body || '',
            };
        }
        default: {
            const graphMsg = graphError?.message || '';
            return {
                status,
                title: 'Something went wrong',
                message: graphMsg || graphErr.statusText || `Request failed (HTTP ${status})`,
                suggestion: 'Try refreshing the page. If the problem persists, contact IT support.',
                detail: graphErr.body || '',
            };
        }
    }
}
//# sourceMappingURL=document-library.controller.js.map