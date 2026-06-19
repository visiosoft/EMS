import { Controller, Get, Headers, HttpException, HttpStatus, Logger, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import { InternalAccessGuard } from '../internal-access/internal-access.guard';
import { DocumentLibraryService } from './document-library.service';
import { FolderQueryDto } from './dto/document-query.dto';

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function logTokenDiagnostics(logger: Logger, label: string, token: string | undefined): void {
  if (!token) {
    logger.warn(`[${label}] No token received`);
    return;
  }
  logger.log(`[${label}] Token length: ${token.length}`);
  logger.log(`[${label}] Token preview: ${token.slice(0, 30)}...`);

  const claims = decodeJwt(token);
  if (claims) {
    logger.log(`[${label}] JWT aud: ${claims.aud}`);
    logger.log(`[${label}] JWT scp: ${claims.scp}`);
    logger.log(`[${label}] JWT exp: ${claims.exp ? new Date((claims.exp as number) * 1000).toISOString() : 'unknown'}`);
    logger.log(`[${label}] JWT oid: ${claims.oid}`);
    logger.log(`[${label}] JWT idtyp: ${claims.idtyp}`);
  }
}

@UseGuards(InternalAccessGuard)
@Controller('documents')
export class DocumentLibraryController {
  private readonly logger = new Logger(DocumentLibraryController.name);

  constructor(private readonly documentLibraryService: DocumentLibraryService) {}

  @Get('diag')
  diag(@Headers('x-sharepoint-token') token: string) {
    if (!token) return { error: 'Missing X-SharePoint-Token header' };
    const parts = token.split('.');
    let claims: Record<string, unknown> = {};
    if (parts.length === 3) {
      try {
        claims = JSON.parse(
          Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(),
        ) as Record<string, unknown>;
      } catch { /* ignore */ }
    }
    return {
      tokenLength: token.length,
      tokenPreview: token.slice(0, 20) + '...',
      claims: {
        aud: claims.aud,
        iss: claims.iss,
        scp: claims.scp,
        roles: claims.roles,
        tid: claims.tid,
        exp: claims.exp ? new Date((claims.exp as number) * 1000).toISOString() : undefined,
        nbf: claims.nbf ? new Date((claims.nbf as number) * 1000).toISOString() : undefined,
      },
    };
  }

  @Get('root')
  async getRoot(@Headers('x-sharepoint-token') token: string) {
    logTokenDiagnostics(this.logger, 'getRoot', token);
    if (!token) throw new UnauthorizedException('Missing X-SharePoint-Token header');
    try {
      return await this.documentLibraryService.getRootFolder(token);
    } catch (error) {
      this.logger.error(`Error fetching root: ${error instanceof Error ? error.message : String(error)}`);
      const errResponse = extractErrorDetail(error);
      throw new HttpException({
        message: errResponse.message,
        detail: errResponse.detail,
        suggestion: errResponse.suggestion,
      }, errResponse.status);
    }
  }

  @Get('folders')
  async getFolders(@Query() query: FolderQueryDto, @Headers('x-sharepoint-token') token: string) {
    logTokenDiagnostics(this.logger, 'getFolders', token);
    if (!token) throw new UnauthorizedException('Missing X-SharePoint-Token header');
    try {
      return await this.documentLibraryService.getFolders(token, query.path);
    } catch (error) {
      this.logger.error(`Error fetching folders: ${error instanceof Error ? error.message : String(error)}`);
      const errResponse = extractErrorDetail(error);
      throw new HttpException({
        message: errResponse.message,
        detail: errResponse.detail,
        suggestion: errResponse.suggestion,
      }, errResponse.status);
    }
  }

  @Get('files')
  async getFiles(@Query() query: FolderQueryDto, @Headers('x-sharepoint-token') token: string) {
    logTokenDiagnostics(this.logger, 'getFiles', token);
    if (!token) throw new UnauthorizedException('Missing X-SharePoint-Token header');
    try {
      return await this.documentLibraryService.getFiles(token, query.path);
    } catch (error) {
      this.logger.error(`Error fetching files: ${error instanceof Error ? error.message : String(error)}`);
      const errResponse = extractErrorDetail(error);
      throw new HttpException({
        message: errResponse.message,
        detail: errResponse.detail,
        suggestion: errResponse.suggestion,
      }, errResponse.status);
    }
  }

  @Get('folder')
  async getFolderContents(@Query() query: FolderQueryDto, @Headers('x-sharepoint-token') token: string) {
    logTokenDiagnostics(this.logger, 'getFolderContents', token);
    if (!token) throw new UnauthorizedException('Missing X-SharePoint-Token header');
    try {
      return await this.documentLibraryService.getFolderContents(token, query.path);
    } catch (error) {
      this.logger.error(`Error fetching folder contents: ${error instanceof Error ? error.message : String(error)}`);
      const errResponse = extractErrorDetail(error);
      throw new HttpException({
        message: errResponse.message,
        detail: errResponse.detail,
        suggestion: errResponse.suggestion,
      }, errResponse.status);
    }
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

  // Generic non-Graph error (e.g. network timeout, DNS failure)
  if (!('status' in error)) {
    fallback.message = error.message || fallback.message;
    fallback.detail = error.stack || '';
    return fallback;
  }

  const graphErr = error as Error & { status: number; statusText: string; body: string };
  const status = graphErr.status ?? 500;

  console.error(`[GraphAPI] Raw error body: ${graphErr.body || '(empty)'}`);

  const graphError = parseGraphErrorBody(graphErr.body);

  switch (status) {
    case 401: {
      const code = graphError?.code || 'unknown';

      if (code === 'accessDenied' || code === 'InvalidAuthenticationToken') {
        return {
          status: 401,
          title: 'OneDrive not available',
          message: "Your account doesn't have a OneDrive for Business license, or it hasn't been provisioned yet.",
          suggestion: 'Contact your IT administrator to get OneDrive for Business enabled for your account.',
          detail: graphErr.body || '',
        };
      }

      return {
        status: 401,
        title: 'Access token issue',
        message: graphError?.message || 'Your session token could not be authenticated.',
        suggestion: 'Try refreshing the page. If the issue persists, sign out and sign back in.',
        detail: graphErr.body || '',
      };
    }

    case 403: {
      return {
        status: 403,
        title: 'Permission denied',
        message: graphError?.message || "You don't have permission to access this document library.",
        suggestion: 'Contact your IT administrator to request access.',
        detail: graphErr.body || '',
      };
    }

    case 404: {
      return {
        status: 404,
        title: 'Folder not found',
        message: 'The requested folder or document library could not be found.',
        suggestion: 'It may have been moved, renamed, or deleted. Contact your IT administrator if you believe this is an error.',
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
