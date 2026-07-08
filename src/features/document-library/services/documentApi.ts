import { apiFetch, apiFetchBlob, apiFetchMultipart } from '@/api/config';
import type { DocumentItem, DocumentSource } from '../types';

function buildQuery(path?: string, source?: DocumentSource, shared?: boolean, self?: boolean): string {
    const params = new URLSearchParams();
    if (path) params.set('path', path);
    if (source && source !== 'sharepoint') params.set('source', source);
    if (shared) params.set('shared', 'true');
    if (self) params.set('self', 'true');
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

export async function fetchFolderContents(
    path?: string,
    source?: DocumentSource,
    opts?: { shared?: boolean; self?: boolean },
): Promise<DocumentItem[]> {
    return apiFetch<DocumentItem[]>('/documents/folder' + buildQuery(path, source, opts?.shared, opts?.self));
}

/** Uploads a file into the given folder path; the backend syncs it to SharePoint. */
export async function uploadDocument(
    path: string,
    file: File,
    source?: DocumentSource,
): Promise<DocumentItem> {
    const form = new FormData();
    form.append('file', file);
    if (path) form.append('path', path);
    if (source && source !== 'sharepoint') form.append('source', source);
    return apiFetchMultipart<DocumentItem>('/documents/upload', {
        method: 'POST',
        body: form,
    });
}

/** Streams the real file bytes through the backend and triggers a browser save. */
export async function downloadFile(item: DocumentItem, source?: DocumentSource, opts?: { self?: boolean }): Promise<void> {
    const params = new URLSearchParams({ id: item.id });
    if (source && source !== 'sharepoint') params.set('source', source);
    if (opts?.self) params.set('self', 'true');
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
