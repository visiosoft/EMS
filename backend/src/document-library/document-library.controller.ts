import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Readable } from 'node:stream';
import { InternalAccessGuard } from '../internal-access/internal-access.guard';
import {
  EntraTokenVerifier,
  getOptionalBearerToken,
} from '../auth/entra-token-verifier.service';
import {
  DocumentLibraryService,
  type DocumentItem,
  type DocumentSource,
} from './document-library.service';
import { documentUploadMulterOptions } from './document-upload-multer.config';

type OwnerIdentity = { oid?: string; emails: string[] };
import { DownloadQueryDto, FolderQueryDto, UploadBodyDto } from './dto/document-query.dto';

@UseGuards(InternalAccessGuard)
@Controller('documents')
export class DocumentLibraryController {
  private readonly logger = new Logger(DocumentLibraryController.name);

  constructor(
    private readonly documentLibraryService: DocumentLibraryService,
    private readonly tokenVerifier: EntraTokenVerifier,
    private readonly config: ConfigService,
  ) {}

  /**
   * Resolves the effective document source. The OneDrive source is gated to a single
   * configured identity (DOCUMENT_TOGGLE_USER): any other caller is rejected so the
   * fixed user's OneDrive can't be reached by hand-crafting `?source=onedrive`.
   * Verification relies on the signed Entra bearer token, never the spoofable X-User-* headers.
   */
  private async resolveSource(req: Request, requested?: DocumentSource, self?: boolean): Promise<DocumentSource> {
    if (requested !== 'onedrive') return 'sharepoint';

    // `self` = the caller's OWN OneDrive (Hub sidebar). It's their personal drive, so any
    // authenticated internal user may use it — this route is already behind InternalAccessGuard.
    if (self) {
      return 'onedrive';
    }

    // When OneDrive is the shared engagement document store (ENGAGEMENT_DOCUMENT_SOURCE=onedrive),
    // it is a shared team location, not a personal drive — so any internal user may use it. This
    // route is already behind InternalAccessGuard. The per-user DOCUMENT_TOGGLE_USER gate below
    // remains for the legacy case of browsing a single person's OneDrive while the site stays on SharePoint.
    if (this.documentLibraryService.getEngagementSource() === 'onedrive') {
      return 'onedrive';
    }

    const allowed = (this.config.get<string>('DOCUMENT_TOGGLE_USER') ?? '').trim().toLowerCase();
    if (!allowed) {
      throw new ForbiddenException('OneDrive source is not enabled (DOCUMENT_TOGGLE_USER is not configured).');
    }

    const token = getOptionalBearerToken(req.headers.authorization);
    if (!token) {
      throw new ForbiddenException('Sign-in required to access the OneDrive source.');
    }

    let identities: string[];
    try {
      const user = await this.tokenVerifier.verify(token);
      identities = [user.oid, user.email, user.preferred_username, user.upn]
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
        .map((v) => v.toLowerCase());
    } catch (error) {
      // Surface why verification failed (expected vs actual audience/issuer) so it's diagnosable.
      throw new ForbiddenException({
        message: 'Invalid or expired token; OneDrive source denied.',
        detail: this.tokenVerifier.buildTokenValidationDetail(token, error),
      });
    }

    if (!identities.includes(allowed)) {
      throw new ForbiddenException('You are not authorized to use the OneDrive source.');
    }
    return 'onedrive';
  }

  /**
   * Identifies the caller from their verified Entra token. Returns null when no valid token is
   * present — callers use that to return an empty SharePoint listing (we can't tell what's "mine").
   */
  private async getCallerIdentity(req: Request): Promise<OwnerIdentity | null> {
    const token = getOptionalBearerToken(req.headers.authorization);
    if (!token) return null;
    try {
      const user = await this.tokenVerifier.verify(token);
      const emails = [user.email, user.preferred_username, user.upn]
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
        .map((v) => v.toLowerCase());
      return { oid: user.oid?.toLowerCase(), emails };
    } catch {
      return null;
    }
  }

  /**
   * Keeps all folders (so shared folders stay navigable) and only files the caller created,
   * matched on the Entra oid (createdBy.user.id) or email.
   */
  private filterOwnedFiles(items: DocumentItem[], identity: OwnerIdentity): DocumentItem[] {
    return items.filter((item) => {
      if (item.type === 'folder') return true;
      const ownerId = item.createdById?.toLowerCase();
      const ownerEmail = item.createdByEmail?.toLowerCase();
      if (identity.oid && ownerId && ownerId === identity.oid) return true;
      if (ownerEmail && identity.emails.includes(ownerEmail)) return true;
      return false;
    });
  }

  /**
   * The shared SharePoint library is always filtered to the caller's own files (folders stay
   * visible). The caller's OWN OneDrive (`self`) is filtered the same way, preserving the
   * CreatedBy behavior. The fixed shared OneDrive (engagements) is left untouched.
   */
  private async applyOwnershipFilter(
    req: Request,
    source: DocumentSource,
    items: DocumentItem[],
    self?: boolean,
  ): Promise<DocumentItem[]> {
    if (source !== 'sharepoint' && !self) return items;
    const identity = await this.getCallerIdentity(req);
    if (!identity) return [];
    return this.filterOwnedFiles(items, identity);
  }

  /**
   * For a `self` OneDrive request, resolves the calling user's own drive identity
   * (oid, or UPN/email fallback) to target `/users/{id}/drive`. Null if unresolvable.
   */
  private async resolveSelfDriveUser(req: Request): Promise<string | undefined> {
    const identity = await this.getCallerIdentity(req);
    return identity?.oid ?? identity?.emails[0];
  }

  @Get('root')
  async getRoot(@Req() req: Request, @Query() query: FolderQueryDto) {
    try {
      const source = await this.resolveSource(req, query.source);
      return await this.documentLibraryService.getRootFolder(source);
    } catch (error) {
      throw this.toHttpException('root', error);
    }
  }

  @Get('folders')
  async getFolders(@Req() req: Request, @Query() query: FolderQueryDto) {
    try {
      const source = await this.resolveSource(req, query.source);
      const items = await this.documentLibraryService.getFolders(query.path, source);
      return await this.applyOwnershipFilter(req, source, items);
    } catch (error) {
      throw this.toHttpException('folders', error);
    }
  }

  @Get('files')
  async getFiles(@Req() req: Request, @Query() query: FolderQueryDto) {
    try {
      const source = await this.resolveSource(req, query.source);
      const items = await this.documentLibraryService.getFiles(query.path, source);
      return await this.applyOwnershipFilter(req, source, items);
    } catch (error) {
      throw this.toHttpException('files', error);
    }
  }

  @Get('folder')
  async getFolderContents(@Req() req: Request, @Query() query: FolderQueryDto) {
    try {
      const source = await this.resolveSource(req, query.source, query.self);
      let driveUserOverride: string | undefined;
      if (source === 'onedrive' && query.self) {
        driveUserOverride = await this.resolveSelfDriveUser(req);
        // Can't determine whose OneDrive to read → return nothing rather than the wrong drive.
        if (!driveUserOverride) return [];
      }
      const items = await this.documentLibraryService.getFolderContents(query.path, source, driveUserOverride);
      // Shared engagement folders are team spaces — return everything, unfiltered.
      if (query.shared) return items;
      return await this.applyOwnershipFilter(req, source, items, query.self);
    } catch (error) {
      throw this.toHttpException('folder contents', error);
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', documentUploadMulterOptions()))
  async upload(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadBodyDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file was provided for upload.');
    }
    try {
      const source = await this.resolveSource(req, body.source);
      return await this.documentLibraryService.uploadFile(
        body.path ?? '',
        file.originalname,
        file.buffer,
        file.mimetype,
        source,
      );
    } catch (error) {
      throw this.toHttpException('upload', error);
    }
  }

  @Get('download')
  async download(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: DownloadQueryDto,
  ) {
    try {
      const source = await this.resolveSource(req, query.source, query.self);
      let driveUserOverride: string | undefined;
      if (source === 'onedrive' && query.self) {
        driveUserOverride = await this.resolveSelfDriveUser(req);
        if (!driveUserOverride) {
          throw new ForbiddenException('Sign-in required to download from your OneDrive.');
        }
      }
      const file = await this.documentLibraryService.downloadItem(query.id, source, driveUserOverride);
      res.setHeader('Content-Type', file.contentType);
      if (file.contentLength) res.setHeader('Content-Length', file.contentLength);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${file.filename.replace(/"/g, '')}"`,
      );
      Readable.fromWeb(file.stream as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
    } catch (error) {
      throw this.toHttpException('download', error);
    }
  }

  private toHttpException(context: string, error: unknown): HttpException {
    if (error instanceof HttpException) return error;
    this.logger.error(
      `Error fetching ${context}: ${error instanceof Error ? error.message : String(error)}`,
    );
    const errResponse = extractErrorDetail(error);
    return new HttpException(
      {
        message: errResponse.message,
        detail: errResponse.detail,
        suggestion: errResponse.suggestion,
      },
      errResponse.status,
    );
  }
}

type ErrorResponse = {
  status: number;
  title: string;
  message: string;
  suggestion: string;
  detail: string;
};

function parseGraphErrorBody(body: string): { code: string; message: string } | null {
  try {
    const parsed = JSON.parse(body) as { error?: { code?: string; message?: string } };
    if (parsed.error?.code) {
      return { code: parsed.error.code, message: parsed.error.message || '' };
    }
    return null;
  } catch {
    return null;
  }
}

function extractErrorDetail(error: unknown): ErrorResponse & { status: number } {
  const fallback: ErrorResponse = {
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

  const graphErr = error as Error & { status: number; statusText: string; body: string };
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
      if (graphError?.code === 'ResourceNotFound' && /mysite/i.test(graphError.message)) {
        return {
          status: 404,
          title: 'OneDrive not available for this account',
          message: "This user's OneDrive could not be found.",
          suggestion:
            'This Microsoft 365 account may not have OneDrive provisioned (no license, or provisioning has not run yet). Try signing in to onedrive.com once with this account, or contact your Microsoft 365 admin.',
          detail: graphErr.body || '',
        };
      }
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
