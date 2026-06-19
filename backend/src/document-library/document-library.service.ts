import { Injectable, Logger } from '@nestjs/common';

export type DocumentItemType = 'folder' | 'file';

export type DocumentItem = {
  id: string;
  name: string;
  type: DocumentItemType;
  path: string;
  url: string;
  size?: number;
  modified?: string;
  extension?: string;
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
};

type GraphChildrenResponse = {
  value: GraphDriveItem[];
};

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

@Injectable()
export class DocumentLibraryService {
  private readonly logger = new Logger(DocumentLibraryService.name);
  private readonly cache = new Map<string, { data: unknown; expiry: number }>();
  private readonly cacheTtlMs: number;

  constructor() {
    this.cacheTtlMs = 60_000;
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

  private async graphGet<T>(url: string, token: string): Promise<T> {
    this.logger.log(`[GraphAPI] Calling: ${url}`);
    this.logger.log(`[GraphAPI] Authorization header present: ${Boolean(token)}`);
    this.logger.log(`[GraphAPI] Token length: ${token.length}`);
    this.logger.log(`[GraphAPI] Token preview: ${token.slice(0, 30)}...`);

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

  private buildChildrenUrl(relativePath?: string): string {
    if (!relativePath || relativePath === '') {
      return `${GRAPH_BASE}/me/drive/root/children`;
    }
    const encoded = relativePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
    return `${GRAPH_BASE}/me/drive/root:/${encoded}:/children`;
  }

  async getRootFolder(token: string): Promise<DocumentItem> {
    const cacheKey = 'onedrive-root';
    const cached = this.getFromCache<DocumentItem>(cacheKey);
    if (cached) return cached;

    try {
      this.logger.log('[GraphAPI] Fetching root folder');
      const data = await this.graphGet<GraphDriveItem>(`${GRAPH_BASE}/me/drive/root`, token);
      const result = this.normalizeItem(data, '');
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch root folder: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async getFolders(token: string, relativePath?: string): Promise<DocumentItem[]> {
    const cacheKey = `onedrive-folders:${relativePath || 'root'}`;
    const cached = this.getFromCache<DocumentItem[]>(cacheKey);
    if (cached) return cached;

    try {
      const all = await this.getFolderContents(token, relativePath);
      const result = all.filter((i) => i.type === 'folder');
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch folders: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async getFiles(token: string, relativePath?: string): Promise<DocumentItem[]> {
    const cacheKey = `onedrive-files:${relativePath || 'root'}`;
    const cached = this.getFromCache<DocumentItem[]>(cacheKey);
    if (cached) return cached;

    try {
      const all = await this.getFolderContents(token, relativePath);
      const result = all.filter((i) => i.type === 'file');
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch files: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async getFolderContents(token: string, relativePath?: string): Promise<DocumentItem[]> {
    const cacheKey = `onedrive-contents:${relativePath || 'root'}`;
    const cached = this.getFromCache<DocumentItem[]>(cacheKey);
    if (cached) return cached;

    const url = this.buildChildrenUrl(relativePath);
    this.logger.log(`[GraphAPI] getFolderContents URL: ${url}`);
    try {
      const data = await this.graphGet<GraphChildrenResponse>(url, token);
      const result = (data.value || []).map((item) => this.normalizeItem(item, relativePath || ''));
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch folder contents: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  invalidateCache(relativePath?: string): void {
    const prefix = relativePath ? `onedrive-${relativePath}` : 'onedrive';
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(prefix)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.cache.delete(key));
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
    };
  }

  private getExtension(filename: string): string {
    const dot = filename.lastIndexOf('.');
    return dot >= 0 ? filename.slice(dot).toLowerCase() : '';
  }
}
