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
var DocumentLibraryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentLibraryService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const DRIVE_ITEM_SELECT = '$select=id,name,size,folder,file,webUrl,lastModifiedDateTime,parentReference,createdBy';
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
let DocumentLibraryService = DocumentLibraryService_1 = class DocumentLibraryService {
    logger = new common_1.Logger(DocumentLibraryService_1.name);
    cache = new Map();
    cacheTtlMs = 60_000;
    tenantId;
    clientId;
    clientSecret;
    oneDriveUser;
    sharePointSiteHostname;
    sharePointSitePath;
    engagementsRootFolder;
    engagementSource;
    tokenCache = null;
    sharePointSiteId = null;
    constructor(config) {
        this.tenantId = config.get('ENTRA_TENANT_ID') ?? '';
        this.clientId = config.get('ENTRA_CLIENT_ID') ?? '';
        this.clientSecret = config.get('ENTRA_CLIENT_SECRET') ?? '';
        this.oneDriveUser = config.get('ONEDRIVE_USER') ?? '';
        this.sharePointSiteHostname = config.get('SHAREPOINT_SITE_HOSTNAME') ?? '';
        this.sharePointSitePath = config.get('SHAREPOINT_SITE_PATH') ?? '';
        this.engagementsRootFolder = config.get('SHAREPOINT_ENGAGEMENTS_ROOT_FOLDER') ?? 'Engagements';
        this.engagementSource =
            (config.get('ENGAGEMENT_DOCUMENT_SOURCE') ?? '').trim().toLowerCase() === 'onedrive'
                ? 'onedrive'
                : 'sharepoint';
    }
    getEngagementSource() {
        return this.engagementSource;
    }
    async resolveSiteId() {
        if (this.sharePointSiteId)
            return this.sharePointSiteId;
        if (this.sharePointSiteHostname && this.sharePointSitePath) {
            const url = `${GRAPH_BASE}/sites/${this.sharePointSiteHostname}:${this.sharePointSitePath}`;
            const data = await this.graphGet(url);
            this.sharePointSiteId = data.id;
            return this.sharePointSiteId;
        }
        return 'root';
    }
    async driveBase(source, driveUserOverride) {
        if (source === 'onedrive') {
            const driveUser = driveUserOverride || this.oneDriveUser;
            if (!driveUser) {
                throw new Error('OneDrive source is not configured. Set ONEDRIVE_USER (UPN or object id) in the backend environment.');
            }
            return `${GRAPH_BASE}/users/${encodeURIComponent(driveUser)}/drive`;
        }
        const siteId = await this.resolveSiteId();
        return `${GRAPH_BASE}/sites/${siteId}/drive`;
    }
    getCacheKey(endpoint) {
        return endpoint;
    }
    getFromCache(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    setCache(key, data) {
        this.cache.set(key, {
            data,
            expiry: Date.now() + this.cacheTtlMs,
        });
    }
    async acquireAppToken() {
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
        const data = (await response.json());
        this.tokenCache = {
            token: data.access_token,
            expiry: Date.now() + (data.expires_in - 60) * 1000,
        };
        this.logger.log('[TokenAcquisition] App-only token acquired successfully');
        return data.access_token;
    }
    async graphGet(url) {
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
            err.status = response.status;
            err.statusText = response.statusText;
            err.body = errorText;
            throw err;
        }
        return (await response.json());
    }
    async buildChildrenUrl(source, relativePath, driveUserOverride) {
        const base = await this.driveBase(source, driveUserOverride);
        if (!relativePath || relativePath === '') {
            return `${base}/root/children?${DRIVE_ITEM_SELECT}`;
        }
        const encoded = relativePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
        return `${base}/root:/${encoded}:/children?${DRIVE_ITEM_SELECT}`;
    }
    async getRootFolder(source = 'sharepoint') {
        const cacheKey = `site-root:${source}`;
        const cached = this.getFromCache(cacheKey);
        if (cached)
            return cached;
        try {
            const data = await this.graphGet(`${await this.driveBase(source)}/root?${DRIVE_ITEM_SELECT}`);
            const result = this.normalizeItem(data, '');
            this.setCache(cacheKey, result);
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to fetch root folder: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    async getFolders(relativePath, source = 'sharepoint') {
        const cacheKey = `site-folders:${source}:${relativePath || 'root'}`;
        const cached = this.getFromCache(cacheKey);
        if (cached)
            return cached;
        try {
            const all = await this.getFolderContents(relativePath, source);
            const result = all.filter((i) => i.type === 'folder');
            this.setCache(cacheKey, result);
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to fetch folders: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    async getFiles(relativePath, source = 'sharepoint') {
        const cacheKey = `site-files:${source}:${relativePath || 'root'}`;
        const cached = this.getFromCache(cacheKey);
        if (cached)
            return cached;
        try {
            const all = await this.getFolderContents(relativePath, source);
            const result = all.filter((i) => i.type === 'file');
            this.setCache(cacheKey, result);
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to fetch files: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    async getFolderContents(relativePath, source = 'sharepoint', driveUserOverride) {
        const cacheKey = `site-contents:${source}:${driveUserOverride || 'default'}:${relativePath || 'root'}`;
        const cached = this.getFromCache(cacheKey);
        if (cached)
            return cached;
        const url = await this.buildChildrenUrl(source, relativePath, driveUserOverride);
        this.logger.log(`[GraphAPI] getFolderContents URL: ${url}`);
        try {
            const data = await this.graphGet(url);
            const result = (data.value || []).map((item) => this.normalizeItem(item, relativePath || ''));
            this.setCache(cacheKey, result);
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to fetch folder contents: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    async downloadItem(id, source = 'sharepoint', driveUserOverride) {
        const token = await this.acquireAppToken();
        const url = `${await this.driveBase(source, driveUserOverride)}/items/${encodeURIComponent(id)}/content`;
        this.logger.log(`[GraphAPI] downloadItem URL: ${url}`);
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        this.logger.log(`[GraphAPI] downloadItem response status: ${response.status} ${response.statusText}`);
        if (!response.ok || !response.body) {
            const errorText = await response.text().catch(() => '(failed to read body)');
            this.logger.error(`[GraphAPI] downloadItem error (${response.status}): ${errorText}`);
            const err = new Error(`Graph API responded with ${response.status}: ${errorText}`);
            err.status = response.status;
            err.statusText = response.statusText;
            err.body = errorText;
            throw err;
        }
        return {
            stream: response.body,
            contentType: response.headers.get('content-type') ?? 'application/octet-stream',
            contentLength: response.headers.get('content-length'),
            filename: this.parseDownloadFilename(response),
        };
    }
    parseDownloadFilename(response) {
        const disposition = response.headers.get('content-disposition') ?? '';
        const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition);
        if (match?.[1]) {
            try {
                return decodeURIComponent(match[1].replace(/"/g, '').trim());
            }
            catch {
                return match[1].replace(/"/g, '').trim();
            }
        }
        return 'download';
    }
    invalidateCache(relativePath) {
        const prefix = 'site';
        const keysToDelete = [];
        this.cache.forEach((_, key) => {
            if (key.startsWith(prefix)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach((key) => this.cache.delete(key));
    }
    async createFolder(parentPath, folderName, source = 'sharepoint') {
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
                const parsed = JSON.parse(errorText);
                if (parsed?.error?.message)
                    graphMessage = parsed.error.message;
            }
            catch { }
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
                    err.status = response.status;
                    err.statusText = response.statusText;
                    err.body = errorText;
                    throw err;
                }
                const existing = (await getRes.json());
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
            err.status = response.status;
            err.statusText = response.statusText;
            err.body = errorText;
            throw err;
        }
        const data = (await response.json());
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
    async ensureFolderHierarchy(hierarchy, source = 'sharepoint') {
        let accumulatedPath = '';
        let lastResult = null;
        for (const segment of hierarchy) {
            const folderName = segment.trim();
            if (!folderName)
                continue;
            try {
                lastResult = await this.createFolder(accumulatedPath, folderName, source);
                accumulatedPath = lastResult.path;
            }
            catch (err) {
                this.logger.error(`[GraphAPI] Failed to create folder "${folderName}" under "${accumulatedPath || 'root'}": ${err instanceof Error ? err.message : String(err)}`);
                throw err;
            }
        }
        return {
            path: lastResult?.path ?? '',
            id: lastResult?.id ?? '',
            webUrl: lastResult?.webUrl ?? '',
        };
    }
    async createFolderTree(rootSegments, structure, source = 'sharepoint') {
        await this.acquireAppToken();
        let accumulatedPath = '';
        let rootWebUrl = '';
        for (const segment of rootSegments) {
            const folderName = segment.trim();
            if (!folderName)
                continue;
            const res = await this.withGraphRetry(() => this.createFolder(accumulatedPath, folderName, source), `createFolder ${folderName}`);
            accumulatedPath = res.path;
            rootWebUrl = res.webUrl;
        }
        const basePath = accumulatedPath;
        const parents = Object.keys(structure);
        await Promise.all(parents.map((parent) => this.withGraphRetry(() => this.createFolder(basePath, parent, source), `createFolder ${parent}`)));
        const childTasks = [];
        for (const [parent, children] of Object.entries(structure)) {
            for (const child of children) {
                childTasks.push(this.withGraphRetry(() => this.createFolder(`${basePath}/${parent}`, child, source), `createFolder ${parent}/${child}`));
            }
        }
        await Promise.all(childTasks);
        return { rootWebUrl };
    }
    async withGraphRetry(fn, label, maxAttempts = 4) {
        const isTransient = (status) => status === undefined || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
        let attempt = 0;
        for (;;) {
            try {
                return await fn();
            }
            catch (err) {
                attempt += 1;
                const status = err?.status;
                if (attempt >= maxAttempts || !isTransient(status))
                    throw err;
                const backoff = Math.min(8000, 400 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 250);
                this.logger.warn(`[GraphAPI] ${label} failed (attempt ${attempt}/${maxAttempts}, status ${status ?? 'network'}); retrying in ${backoff}ms`);
                await new Promise((resolve) => setTimeout(resolve, backoff));
            }
        }
    }
    async uploadFile(parentPath, filename, buffer, contentType, source = 'sharepoint') {
        const token = await this.acquireAppToken();
        const base = await this.driveBase(source);
        const encodedName = encodeURIComponent(filename);
        const encodedParent = parentPath.split('/').filter(Boolean).map((s) => encodeURIComponent(s)).join('/');
        const itemPath = encodedParent ? `${encodedParent}/${encodedName}` : encodedName;
        const url = `${base}/root:/${itemPath}:/content?@microsoft.graph.conflictBehavior=rename`;
        this.logger.log(`[GraphAPI] uploadFile PUT ${url}`);
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': contentType || 'application/octet-stream',
            },
            body: buffer,
        });
        if (!response.ok) {
            const errorText = await response.text().catch(() => '(failed to read body)');
            this.logger.error(`[GraphAPI] uploadFile failed (${response.status}): ${errorText}`);
            const err = new Error(`Graph API responded with ${response.status}: ${errorText}`);
            err.status = response.status;
            err.statusText = response.statusText;
            err.body = errorText;
            throw err;
        }
        const data = (await response.json());
        this.logger.log(`[GraphAPI] File uploaded: ${data.webUrl}`);
        this.invalidateCache(parentPath);
        return this.normalizeItem(data, parentPath);
    }
    normalizeItem(item, parentPath) {
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
    getExtension(filename) {
        const dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.slice(dot).toLowerCase() : '';
    }
};
exports.DocumentLibraryService = DocumentLibraryService;
exports.DocumentLibraryService = DocumentLibraryService = DocumentLibraryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DocumentLibraryService);
//# sourceMappingURL=document-library.service.js.map