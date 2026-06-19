import { apiFetch } from '@/api/config';
import { requestGraphAccessToken, getActiveAccount, describeGraphAccessToken } from '@/auth/entra';
import type { DocumentItem } from '../types';

function decodeJwt(token: string): Record<string, unknown> | null {
    try {
        const [, payload] = token.split('.');
        if (!payload) return null;
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        return JSON.parse(atob(padded)) as Record<string, unknown>;
    } catch {
        return null;
    }
}

async function buildGraphHeaders(): Promise<HeadersInit> {
    const account = getActiveAccount();
    if (!account) {
        console.warn('[OneDriveApi] No active account found');
        return {};
    }

    console.group('[OneDriveApi] Acquiring Graph token');
    const token = await requestGraphAccessToken(account);
    console.log('Token length:', token.length);
    console.log('Token preview:', token.slice(0, 30) + '...');

    const claims = decodeJwt(token);
    if (claims) {
        console.log('JWT aud:', claims.aud);
        console.log('JWT scp:', claims.scp);
        console.log('JWT exp:', new Date((claims.exp as number) * 1000).toISOString());
        console.log('JWT oid:', claims.oid);
        console.log('JWT idtyp:', claims.idtyp);
    }
    console.groupEnd();

    const diagnostics = describeGraphAccessToken(token);
    console.log('[OneDriveApi] Graph token diagnostics:', diagnostics);

    return {
        'X-SharePoint-Token': token,
    } as HeadersInit;
}

async function logAndFetch<T>(label: string, url: string, headers: HeadersInit): Promise<T> {
    console.group(`[OneDriveApi] ${label}`);
    console.log('URL:', url);
    console.log('Headers present:', Object.keys(headers));
    console.log('X-SharePoint-Token length:', (headers as Record<string, string>)['X-SharePoint-Token']?.length ?? 0);
    const tokenPreview = (headers as Record<string, string>)['X-SharePoint-Token']?.slice(0, 30) ?? '(none)';
    console.log('X-SharePoint-Token preview:', tokenPreview + '...');
    console.groupEnd();

    return apiFetch<T>(url, { headers });
}

export async function fetchRootFolder(): Promise<DocumentItem> {
    const graphHeaders = await buildGraphHeaders();
    return logAndFetch<DocumentItem>('fetchRootFolder', '/documents/root', graphHeaders);
}

export async function fetchFolders(path?: string): Promise<DocumentItem[]> {
    const params = path ? `?path=${encodeURIComponent(path)}` : '';
    const graphHeaders = await buildGraphHeaders();
    return logAndFetch<DocumentItem[]>('fetchFolders', `/documents/folders${params}`, graphHeaders);
}

export async function fetchFiles(path?: string): Promise<DocumentItem[]> {
    const params = path ? `?path=${encodeURIComponent(path)}` : '';
    const graphHeaders = await buildGraphHeaders();
    return logAndFetch<DocumentItem[]>('fetchFiles', `/documents/files${params}`, graphHeaders);
}

export async function fetchFolderContents(path?: string): Promise<DocumentItem[]> {
    const params = path ? `?path=${encodeURIComponent(path)}` : '';
    const graphHeaders = await buildGraphHeaders();
    return logAndFetch<DocumentItem[]>('fetchFolderContents', `/documents/folder${params}`, graphHeaders);
}
