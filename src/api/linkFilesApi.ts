import { apiFetchMultipart, getApiBaseUrl } from './config';

export interface UploadedLinkFile {
  url: string;
  name: string;
}

export async function uploadLinkFile(file: File): Promise<UploadedLinkFile> {
  const body = new FormData();
  body.append('file', file);
  const uploaded = await apiFetchMultipart<UploadedLinkFile>('/link-files', {
    method: 'POST',
    body,
  });
  if (/^https?:\/\//i.test(uploaded.url)) return uploaded;
  const host = getApiBaseUrl() || window.location.origin;
  return { ...uploaded, url: new URL(uploaded.url, host).toString() };
}