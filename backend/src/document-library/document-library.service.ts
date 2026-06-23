import { Injectable, Logger } from '@nestjs/common';
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

type GraphDriveItem = {
  id: string;
  name: string;
  size?: number;
  lastModifiedDateTime?: string;
  folder?: { childCount?: number };
  file?: { mimeType?: string };
  webUrl?: string;
  parentReference?: { path?: string };
  createdBy?: { user?: { id?: string; email?: string; displayName?: string } };
};

const DRIVE_ITEM_SELECT =
  '$select=id,name,size,folder,file,webUrl,lastModifiedDateTime,parentReference,createdBy';

type GraphChildrenResponse = {
  value: GraphDriveItem[];
};

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

@Injectable()
export class DocumentLibraryService {
  private readonly logger = new Logger(DocumentLibraryService.name);
  private readonly cache = new Map<string, { data: unknown; expiry: number }>();
  private readonly cacheTtlMs = 60_000;
  private readonly tenantId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly oneDriveUser: string;
  private readonly sharePointSiteHostname: string;
  private readonly sharePointSitePath: string;
  private readonly engagementsRootFolder: string;
  private tokenCache: { token: string; expiry: number } | null = null;
  private sharePointSiteId: string | null = null;

  constructor(config: ConfigService) {
    this.tenantId = config.get<string>('ENTRA_TENANT_ID') ?? '';
    this.clientId = config.get<string>('ENTRA_CLIENT_ID') ?? '';
    this.clientSecret = config.get<string>('ENTRA_CLIENT_SECRET') ?? '';
    this.oneDriveUser = config.get<string>('ONEDRIVE_USER') ?? '';
    this.sharePointSiteHostname = config.get<string>('SHAREPOINT_SITE_HOSTNAME') ?? '';
    this.sharePointSitePath = config.get<string>('SHAREPOINT_SITE_PATH') ?? '';
    this.engagementsRootFolder = config.get<string>('SHAREPOINT_ENGAGEMENTS_ROOT_FOLDER') ?? 'Engagements';
  }

  private async resolveSiteId(): Promise<string> {
    if (this.sharePointSiteId) return this.sharePointSiteId;
    if (this.sharePointSiteHostname && this.sharePointSitePath) {
      const url = `${GRAPH_BASE}/sites/${this.sharePointSiteHostname}:${this.sharePointSitePath}`;
      const data = await this.graphGet<{ id: string }>(url);
      this.sharePointSiteId = data.id;
      return this.sharePointSiteId;
    }
    return 'root';
  }

  private async driveBase(source: DocumentSource): Promise<string> {
    if (source === 'onedrive') {
      if (!this.oneDriveUser) {
        throw new Error(
          'OneDrive source is not configured. Set ONEDRIVE_USER (UPN or object id) in the backend environment.',
        );
      }
      return `${GRAPH_BASE}/users/${encodeURIComponent(this.oneDriveUser)}/drive`;
    }
    const siteId = await this.resolveSiteId();
    return `${GRAPH_BASE}/sites/${siteId}/drive`;
  }

  private getCacheKey(endpoint: string): string {
    return endpoint;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.cacheTtlMs,
    });
  }

  private async acquireAppToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiry) {
      return this.tokenCache.token;
    }

    const url = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    });

    this.logger.log('[TokenAcquisition] Acquiring app-only token');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '(no body)');
      this.logger.error(`[TokenAcquisition] Failed (${response.status}): ${text}`);
      throw new Error(`Token acquisition failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.tokenCache = {
      token: data.access_token,
      expiry: Date.now() + (data.expires_in - 60) * 1000,
    };
    this.logger.log('[TokenAcquisition] App-only token acquired successfully');
    return data.access_token;
  }

  private async graphGet<T>(url: string): Promise<T> {
    const token = await this.acquireAppToken();
    this.logger.log(`[GraphAPI] Calling: ${url}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    this.logger.log(`[GraphAPI] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '(failed to read body)');
      this.logger.error(`[GraphAPI] Error status: ${response.status}`);
      this.logger.error(`[GraphAPI] Error body: ${errorText}`);
      const err = new Error(`Graph API responded with ${response.status}: ${errorText}`);
      (err as any).status = response.status;
      (err as any).statusText = response.statusText;
      (err as any).body = errorText;
      throw err;
    }

    return (await response.json()) as T;
  }

  private async buildChildrenUrl(source: DocumentSource, relativePath?: string): Promise<string> {
    const base = await this.driveBase(source);
    if (!relativePath || relativePath === '') {
      return `${base}/root/children?${DRIVE_ITEM_SELECT}`;
    }
    const encoded = relativePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
    return `${base}/root:/${encoded}:/children?${DRIVE_ITEM_SELECT}`;
  }

  async getRootFolder(source: DocumentSource = 'sharepoint'): Promise<DocumentItem> {
    const cacheKey = `site-root:${source}`;
    const cached = this.getFromCache<DocumentItem>(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.graphGet<GraphDriveItem>(`${await this.driveBase(source)}/root?${DRIVE_ITEM_SELECT}`);
      const result = this.normalizeItem(data, '');
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch root folder: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async getFolders(relativePath?: string, source: DocumentSource = 'sharepoint'): Promise<DocumentItem[]> {
    const cacheKey = `site-folders:${source}:${relativePath || 'root'}`;
    const cached = this.getFromCache<DocumentItem[]>(cacheKey);
    if (cached) return cached;

    try {
      const all = await this.getFolderContents(relativePath, source);
      const result = all.filter((i) => i.type === 'folder');
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch folders: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async getFiles(relativePath?: string, source: DocumentSource = 'sharepoint'): Promise<DocumentItem[]> {
    const cacheKey = `site-files:${source}:${relativePath || 'root'}`;
    const cached = this.getFromCache<DocumentItem[]>(cacheKey);
    if (cached) return cached;

    try {
      const all = await this.getFolderContents(relativePath, source);
      const result = all.filter((i) => i.type === 'file');
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch files: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async getFolderContents(relativePath?: string, source: DocumentSource = 'sharepoint'): Promise<DocumentItem[]> {
    const cacheKey = `site-contents:${source}:${relativePath || 'root'}`;
    const cached = this.getFromCache<DocumentItem[]>(cacheKey);
    if (cached) return cached;

    const url = await this.buildChildrenUrl(source, relativePath);
    this.logger.log(`[GraphAPI] getFolderContents URL: ${url}`);
    try {
      const data = await this.graphGet<GraphChildrenResponse>(url);
      const result = (data.value || []).map((item) => this.normalizeItem(item, relativePath || ''));
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch folder contents: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async downloadItem(
    id: string,
    source: DocumentSource = 'sharepoint',
  ): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string; contentLength: string | null; filename: string }> {
    const token = await this.acquireAppToken();
    const url = `${await this.driveBase(source)}/items/${encodeURIComponent(id)}/content`;
    this.logger.log(`[GraphAPI] downloadItem URL: ${url}`);

    // `fetch` follows the 302 Graph returns to the pre-authenticated download URL.
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    this.logger.log(`[GraphAPI] downloadItem response status: ${response.status} ${response.statusText}`);

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => '(failed to read body)');
      this.logger.error(`[GraphAPI] downloadItem error (${response.status}): ${errorText}`);
      const err = new Error(`Graph API responded with ${response.status}: ${errorText}`);
      (err as any).status = response.status;
      (err as any).statusText = response.statusText;
      (err as any).body = errorText;
      throw err;
    }

    return {
      stream: response.body,
      contentType: response.headers.get('content-type') ?? 'application/octet-stream',
      contentLength: response.headers.get('content-length'),
      filename: this.parseDownloadFilename(response),
    };
  }

  private parseDownloadFilename(response: Response): string {
    const disposition = response.headers.get('content-disposition') ?? '';
    const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition);
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1].replace(/"/g, '').trim());
      } catch {
        return match[1].replace(/"/g, '').trim();
      }
    }
    return 'download';
  }

  invalidateCache(relativePath?: string): void {
    const prefix = 'site';
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  // ─── Folder creation ────────────────────────────────────────────────────

  /**
   * Create (or retrieve existing) folder at the given path.
   * Uses PUT which is idempotent — returns the existing folder if already present.
   */
  async createFolder(
    parentPath: string,
    folderName: string,
    source: DocumentSource = 'sharepoint',
  ): Promise<CreateFolderResult> {
    const token = await this.acquireAppToken();
    const base = await this.driveBase(source);
    const encodedName = encodeURIComponent(folderName);
    const encodedParent = parentPath.split('/').filter(Boolean).map(s => encodeURIComponent(s)).join('/');
    const url = encodedParent
      ? `${base}/root:/${encodedParent}/${encodedName}:`
      : `${base}/root:/${encodedName}:`;

    const body = JSON.stringify({ name: folderName, folder: {} });
    this.logger.log(`[GraphAPI] createFolder PUT ${url}`);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '(failed to read body)');
      let graphMessage = errorText;
      try {
        const parsed = JSON.parse(errorText) as { error?: { message?: string } };
        if (parsed?.error?.message) graphMessage = parsed.error.message;
      } catch { /* use raw text */ }

      if (response.status === 409) {
        this.logger.log(`[GraphAPI] Folder "${folderName}" already exists, fetching existing item`);
        const getUrl = encodedParent
          ? `${base}/root:/${encodedParent}/${encodedName}`
          : `${base}/root:/${encodedName}`;
        const getRes = await fetch(getUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!getRes.ok) {
          this.logger.error(`[GraphAPI] Failed to fetch existing folder (${getRes.status}): ${await getRes.text().catch(() => '')}`);
          const err = new Error(graphMessage);
          (err as any).status = response.status;
          (err as any).statusText = response.statusText;
          (err as any).body = errorText;
          throw err;
        }
        const existing = (await getRes.json()) as GraphDriveItem;
        const fullPath = parentPath ? `${parentPath}/${folderName}` : folderName;
        this.logger.log(`[GraphAPI] Using existing folder: ${existing.webUrl}`);
        this.invalidateCache(parentPath);
        return {
          id: existing.id,
          name: existing.name,
          webUrl: existing.webUrl ?? '',
          path: fullPath,
        };
      }

      this.logger.error(`[GraphAPI] createFolder failed (${response.status}): ${errorText}`);
      const err = new Error(graphMessage);
      (err as any).status = response.status;
      (err as any).statusText = response.statusText;
      (err as any).body = errorText;
      throw err;
    }

    const data = (await response.json()) as GraphDriveItem;
    const fullPath = parentPath ? `${parentPath}/${folderName}` : folderName;
    this.logger.log(`[GraphAPI] Folder created: ${data.webUrl}`);

    this.invalidateCache(parentPath);

    return {
      id: data.id,
      name: data.name,
      webUrl: data.webUrl ?? '',
      path: fullPath,
    };
  }

  /**
   * Ensures an entire folder hierarchy exists, creating each missing level.
   * Example: ensureFolderHierarchy(["2026", "New York", "Coldplay", "Contracts", "Tour"])
   * will create each segment if it doesn't already exist.
   */
  async ensureFolderHierarchy(
    hierarchy: string[],
    source: DocumentSource = 'sharepoint',
  ): Promise<{ path: string; id: string; webUrl: string }> {
    let accumulatedPath = '';
    let lastResult: { id: string; name: string; webUrl: string; path: string } | null = null;

    for (const segment of hierarchy) {
      const folderName = segment.trim();
      if (!folderName) continue;
      try {
        lastResult = await this.createFolder(accumulatedPath, folderName, source);
        accumulatedPath = lastResult.path;
      } catch (err) {
        this.logger.error(
          `[GraphAPI] Failed to create folder "${folderName}" under "${accumulatedPath || 'root'}": ${err instanceof Error ? err.message : String(err)}`,
        );
        throw err;
      }
    }

    return {
      path: lastResult?.path ?? '',
      id: lastResult?.id ?? '',
      webUrl: lastResult?.webUrl ?? '',
    };
  }

  private normalizeItem(item: GraphDriveItem, parentPath: string): DocumentItem {
    const isFolder = 'folder' in item;
    const path = parentPath ? `${parentPath}/${item.name}` : item.name;
    const ext = isFolder ? '' : this.getExtension(item.name);
    return {
      id: item.id,
      name: item.name,
      type: isFolder ? 'folder' : 'file',
      path,
      url: item.webUrl || '',
      size: item.size ?? 0,
      modified: item.lastModifiedDateTime,
      extension: ext,
      createdById: item.createdBy?.user?.id,
      createdByEmail: item.createdBy?.user?.email,
    };
  }

  private getExtension(filename: string): string {
    const dot = filename.lastIndexOf('.');
    return dot >= 0 ? filename.slice(dot).toLowerCase() : '';
  }
}
