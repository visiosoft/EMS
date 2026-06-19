import { apiFetch, apiFetchBlob } from '@/api/config';
import type { DocumentItem, DocumentSource } from '../types';

function buildQuery(path?: string, source?: DocumentSource): string {
    const params = new URLSearchParams();
    if (path) params.set('path', path);
    if (source && source !== 'sharepoint') params.set('source', source);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

export async function fetchRootFolder(source?: DocumentSource): Promise<DocumentItem> {
    return apiFetch<DocumentItem>('/documents/root' + buildQuery(undefined, source));
}

export async function fetchFolders(path?: string, source?: DocumentSource): Promise<DocumentItem[]> {
    return apiFetch<DocumentItem[]>('/documents/folders' + buildQuery(path, source));
}

export async function fetchFiles(path?: string, source?: DocumentSource): Promise<DocumentItem[]> {
    return apiFetch<DocumentItem[]>('/documents/files' + buildQuery(path, source));
}

export async function fetchFolderContents(path?: string, source?: DocumentSource): Promise<DocumentItem[]> {
    return apiFetch<DocumentItem[]>('/documents/folder' + buildQuery(path, source));
}

/** Streams the real file bytes through the backend and triggers a browser save. */
export async function downloadFile(item: DocumentItem, source?: DocumentSource): Promise<void> {
    const params = new URLSearchParams({ id: item.id });
    if (source && source !== 'sharepoint') params.set('source', source);
    const { blob, filename } = await apiFetchBlob(`/documents/download?${params.toString()}`);
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename || item.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
}
