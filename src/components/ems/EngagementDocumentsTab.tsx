import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, ExternalLink, FolderOpen, RefreshCw, FolderTree, FileIcon, Upload, Download } from 'lucide-react';
import { fetchEngagementSharePointFolderStatus, createEngagementSharePointFolders } from '@/api/engagementApi';
import { fetchFolderContents, uploadDocument, downloadFile } from '@/features/document-library/services/documentApi';
import type { DocumentItem } from '@/features/document-library/types';
import { friendlyApiError } from '@/lib/friendlyApiError';

interface Props {
  engagementId: number;
  addToast: (
    msg: string,
    type: 'success' | 'error' | 'warning' | 'info',
    action?: { label: string; onClick: () => void },
    title?: string,
  ) => void;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return dateStr; }
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function EngagementDocumentsTab({ engagementId, addToast }: Props) {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll the SharePoint folder provisioning status. While it's 'pending' we keep polling
  // so the folders load automatically once ready — the user never has to refresh.
  const statusQuery = useQuery({
    queryKey: ['engagement-sharepoint-status', engagementId],
    queryFn: () => fetchEngagementSharePointFolderStatus(engagementId),
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 4000 : false),
  });
  const statusData = statusQuery.data;
  const status = statusData?.status;

  // Default the tab to the engagement's Market (DMA) folder, falling back to the
  // engagement (attraction) folder if the market path can't be resolved.
  const rootPath = useMemo(() => {
    return statusData?.marketFolderPath || statusData?.linkPath || '';
  }, [statusData]);

  // The effective folder currently being viewed. Empty currentPath = the market root.
  const effectivePath = currentPath || rootPath;

  // Fetch folder contents (shared: engagement folders are shown to the whole team)
  const contentsQuery = useQuery({
    queryKey: ['engagement-documents', engagementId, effectivePath],
    queryFn: () => fetchFolderContents(effectivePath, undefined, { shared: true }),
    enabled: !!effectivePath,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  // Breadcrumbs are relative to the Market (DMA) folder — it is the base of this view,
  // so users navigate within it (and below) but not above it.
  const breadcrumbs = useMemo(() => {
    const rootName = rootPath.split('/').filter(Boolean).pop() || 'Documents';
    const crumbs = [{ name: rootName, path: rootPath }];
    const relative = effectivePath.startsWith(rootPath)
      ? effectivePath.slice(rootPath.length).replace(/^\//, '')
      : effectivePath;
    let acc = rootPath;
    for (const part of relative.split('/').filter(Boolean)) {
      acc = acc ? `${acc}/${part}` : part;
      crumbs.push({ name: part, path: acc });
    }
    return crumbs;
  }, [effectivePath, rootPath]);

  const navigateToFolder = (folderPath: string) => {
    setCurrentPath(folderPath);
  };

  const navigateToBreadcrumb = (path: string) => {
    setCurrentPath(path);
  };

  const handleCreateOrRetry = async () => {
    setCreating(true);
    try {
      await createEngagementSharePointFolders(engagementId);
      addToast('Preparing your SharePoint folders…', 'info');
      setCurrentPath('');
      // Reflect the new 'pending' state immediately and resume polling.
      await statusQuery.refetch();
    } catch (e) {
      addToast(friendlyApiError(e), 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (item: DocumentItem) => {
    setDownloadingId(item.id);
    try {
      await downloadFile(item);
    } catch (e) {
      addToast(`${item.name}: ${friendlyApiError(e)}`, 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const targetPath = effectivePath;
    const files = Array.from(fileList);
    setUploading(true);
    let uploaded = 0;
    try {
      for (const file of files) {
        try {
          await uploadDocument(targetPath, file);
          uploaded += 1;
        } catch (e) {
          addToast(`${file.name}: ${friendlyApiError(e)}`, 'error');
        }
      }
      if (uploaded > 0) {
        addToast(
          uploaded === 1 ? 'File uploaded to SharePoint.' : `${uploaded} files uploaded to SharePoint.`,
          'success',
        );
        contentsQuery.refetch();
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Fire a toast the moment the background provisioning finishes — only on the actual
  // transition out of 'pending', so opening an already-ready engagement stays silent.
  const prevStatusRef = useRef<typeof status>(undefined);
  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev === 'pending' && status === 'ready') {
      addToast(
        'Your SharePoint folders have been created successfully. You can now access all documents.',
        'success',
        undefined,
        'SharePoint Workspace Ready',
      );
    } else if (prev === 'pending' && status === 'failed') {
      addToast(
        "We couldn't create your SharePoint folders. Please try again.",
        'error',
        { label: 'Retry', onClick: () => void handleCreateOrRetry() },
        'Folder Creation Failed',
      );
    }
    prevStatusRef.current = status;
    // handleCreateOrRetry is intentionally omitted; the transition guard prevents refires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, addToast]);

  // Initial load
  if (statusQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-text-muted text-sm py-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading SharePoint folder info…
      </div>
    );
  }

  // The status request itself failed (e.g. backend unreachable) — surface it explicitly
  // instead of falling through to the misleading "No SharePoint folder" empty state.
  if (statusQuery.isError) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center space-y-4">
        <FolderTree className="h-12 w-12 mx-auto text-ems-coral" />
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Couldn't check SharePoint status</h3>
          <p className="text-sm text-text-muted mt-1">{friendlyApiError(statusQuery.error)}</p>
        </div>
        <button
          type="button"
          onClick={() => void statusQuery.refetch()}
          className="inline-flex items-center gap-2 bg-ems-accent text-background text-sm px-4 py-2 rounded-md font-medium hover:bg-ems-accent/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  // Folders are being created in the background — non-blocking loading state that
  // auto-resolves (the status query keeps polling) without a manual refresh.
  if (status === 'pending') {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center space-y-3">
        <Loader2 className="h-10 w-10 mx-auto text-ems-accent animate-spin" />
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Preparing your SharePoint folders</h3>
          <p className="text-sm text-text-muted mt-1">
            This may take a few moments. The documents will appear here automatically once ready.
          </p>
        </div>
      </div>
    );
  }

  // Provisioning failed — clear message + Retry.
  if (status === 'failed') {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center space-y-4">
        <FolderTree className="h-12 w-12 mx-auto text-ems-coral" />
        <div>
          <h3 className="text-sm font-semibold text-text-primary">SharePoint folder creation failed</h3>
          <p className="text-sm text-text-muted mt-1">
            {statusData?.error || 'Something went wrong while creating the folders.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleCreateOrRetry()}
          disabled={creating}
          className="inline-flex items-center gap-2 bg-ems-accent text-background text-sm px-4 py-2 rounded-md font-medium hover:bg-ems-accent/90 transition-colors disabled:opacity-60"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Retry folder creation
        </button>
      </div>
    );
  }

  // No folder yet (e.g. engagement not Confirmed) — offer manual creation.
  if (status !== 'ready' || !statusData?.linkUrl) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center space-y-4">
        <FolderTree className="h-12 w-12 mx-auto text-text-muted" />
        <div>
          <h3 className="text-sm font-semibold text-text-primary">No SharePoint folder</h3>
          <p className="text-sm text-text-muted mt-1">
            This engagement does not have a SharePoint folder structure yet.
            Folder structures are automatically created when an engagement is set to
            status <strong>Confirmed</strong>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleCreateOrRetry()}
          disabled={creating}
          className="inline-flex items-center gap-2 bg-ems-accent text-background text-sm px-4 py-2 rounded-md font-medium hover:bg-ems-accent/90 transition-colors disabled:opacity-60"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderTree className="h-4 w-4" />}
          Create folder structure now
        </button>
      </div>
    );
  }

  const items = contentsQuery.data ?? [];
  const isLoading = contentsQuery.isLoading;
  const error = contentsQuery.error;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <a
            href={statusData?.linkUrl ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-ems-accent hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Open in SharePoint
          </a>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => void handleFilesSelected(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 text-sm text-ems-accent hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <button
            type="button"
            onClick={() => contentsQuery.refetch()}
            className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm flex-wrap">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.path} className="flex items-center gap-1">
            {i > 0 && <span className="text-text-muted">/</span>}
            {i < breadcrumbs.length - 1 ? (
              <button
                type="button"
                onClick={() => navigateToBreadcrumb(crumb.path)}
                className="text-ems-accent hover:underline"
              >
                {crumb.name}
              </button>
            ) : (
              <span className="text-text-primary font-medium">{crumb.name}</span>
            )}
          </span>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-text-muted text-sm py-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading folder contents…
        </div>
      ) : error ? (
        <div className="bg-ems-coral/10 border border-ems-coral/30 rounded-md px-4 py-3 flex items-start gap-3">
          <span className="text-ems-coral text-sm shrink-0 mt-0.5">⚠</span>
          <div>
            <p className="text-sm font-medium text-ems-coral">Could not load folder contents</p>
            <p className="text-sm text-text-muted mt-1">{friendlyApiError(error)}</p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <FolderOpen className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">This folder is empty</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[32px_1fr_120px_80px_40px] gap-0 px-3 py-2 bg-surface/50 border-b border-border text-[11px] text-text-muted font-medium uppercase tracking-wide">
            <div />
            <div>Name</div>
            <div className="text-right">Modified</div>
            <div className="text-right">Size</div>
            <div />
          </div>

          {/* Items */}
          {items.map((item) =>
            item.type === 'folder' ? (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateToFolder(item.path)}
                className="w-full grid grid-cols-[32px_1fr_120px_80px_40px] gap-0 px-3 py-2 border-b border-border/50 text-sm hover:bg-hover transition-colors text-left"
              >
                <div className="text-amber-500 flex items-center justify-center">
                  <FolderOpen className="h-4 w-4" />
                </div>
                <div className="text-ems-accent truncate">{item.name}</div>
                <div className="text-right text-text-muted text-xs">
                  {formatDate(item.modified)}
                </div>
                <div className="text-right text-text-muted text-xs">—</div>
                <div />
              </button>
            ) : (
              <button
                key={item.id}
                type="button"
                onClick={() => void handleDownload(item)}
                disabled={downloadingId === item.id}
                title={`Download ${item.name}`}
                className="w-full grid grid-cols-[32px_1fr_120px_80px_40px] gap-0 px-3 py-2 border-b border-border/50 text-sm hover:bg-hover transition-colors text-left disabled:opacity-60"
              >
                <div className="text-text-muted flex items-center justify-center">
                  <FileIcon className="h-4 w-4" />
                </div>
                <div className="text-text-primary truncate">{item.name}</div>
                <div className="text-right text-text-muted text-xs">
                  {formatDate(item.modified)}
                </div>
                <div className="text-right text-text-muted text-xs">
                  {formatFileSize(item.size)}
                </div>
                <div className="flex items-center justify-center text-text-muted">
                  {downloadingId === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </div>
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
