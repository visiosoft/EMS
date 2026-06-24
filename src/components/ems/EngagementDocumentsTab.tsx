import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Loader2, ExternalLink, FolderOpen, RefreshCw, FolderTree, FileIcon } from 'lucide-react';
import { fetchEngagementSharePointFolder, createEngagementSharePointFolders } from '@/api/engagementApi';
import { fetchFolderContents } from '@/features/document-library/services/documentApi';
import type { DocumentItem } from '@/features/document-library/types';
import { friendlyApiError } from '@/lib/friendlyApiError';

interface Props {
  engagementId: number;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
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
  const [creationError, setCreationError] = useState<string | null>(null);

  // Fetch the SharePoint folder link for this engagement
  const folderQuery = useQuery({
    queryKey: ['engagement-sharepoint-folder', engagementId],
    queryFn: () => fetchEngagementSharePointFolder(engagementId),
  });

  // Set the initial path from the folder link
  const rootPath = useMemo(() => {
    if (!folderQuery.data?.linkPath) return '';
    return folderQuery.data.linkPath;
  }, [folderQuery.data]);

  // Fetch folder contents
  const contentsQuery = useQuery({
    queryKey: ['engagement-documents', engagementId, currentPath || rootPath],
    queryFn: () => fetchFolderContents(currentPath || rootPath),
    enabled: !!(currentPath || rootPath),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  const breadcrumbs = useMemo(() => {
    const parts = (currentPath || rootPath).split('/').filter(Boolean);
    const crumbs = [{ name: 'Engagement Files', path: '' }];
    let acc = '';
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      crumbs.push({ name: part, path: acc });
    }
    return crumbs;
  }, [currentPath, rootPath]);

  const navigateToFolder = (folderPath: string) => {
    setCurrentPath(folderPath);
  };

  const navigateToBreadcrumb = (path: string) => {
    setCurrentPath(path);
  };

  const handleRetryCreate = async () => {
    setCreating(true);
    setCreationError(null);
    try {
      const result = await createEngagementSharePointFolders(engagementId);
      addToast('SharePoint folders created successfully.', 'success');
      folderQuery.refetch();
      if (result.rootWebUrl) {
        setCurrentPath('');
      }
    } catch (e) {
      const msg = friendlyApiError(e);
      setCreationError(msg);
      addToast(msg, 'error');
    } finally {
      setCreating(false);
    }
  };

  // Loading state
  if (folderQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-text-muted text-sm py-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading SharePoint folder info…
      </div>
    );
  }

  // No folder yet
  if (!folderQuery.data?.linkUrl) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center space-y-4">
        <FolderTree className="h-12 w-12 mx-auto text-text-muted" />
        <div>
          <h3 className="text-sm font-semibold text-text-primary">No SharePoint folder</h3>
          <p className="text-sm text-text-muted mt-1">
            This engagement does not have a SharePoint folder structure yet.
            Folder structures are automatically created when an engagement is created with
            status <strong>Confirmed</strong>.
          </p>
        </div>

        {creationError && (
          <div className="bg-ems-coral/10 border border-ems-coral/30 rounded-md px-4 py-3 text-left">
            <p className="text-sm font-medium text-ems-coral">Folder creation failed</p>
            <p className="text-sm text-text-muted mt-1">{creationError}</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleRetryCreate()}
          disabled={creating}
          className="inline-flex items-center gap-2 bg-ems-accent text-background text-sm px-4 py-2 rounded-md font-medium hover:bg-ems-accent/90 transition-colors disabled:opacity-60"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FolderTree className="h-4 w-4" />
          )}
          {creationError ? 'Retry folder creation' : 'Create folder structure now'}
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
            href={folderQuery.data.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-ems-accent hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Open in SharePoint
          </a>
        </div>
        <button
          type="button"
          onClick={() => contentsQuery.refetch()}
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
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
          <div className="grid grid-cols-[32px_1fr_120px_80px] gap-0 px-3 py-2 bg-surface/50 border-b border-border text-[11px] text-text-muted font-medium uppercase tracking-wide">
            <div />
            <div>Name</div>
            <div className="text-right">Modified</div>
            <div className="text-right">Size</div>
          </div>

          {/* Items */}
          {items.map((item) =>
            item.type === 'folder' ? (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateToFolder(item.path)}
                className="w-full grid grid-cols-[32px_1fr_120px_80px] gap-0 px-3 py-2 border-b border-border/50 text-sm hover:bg-hover transition-colors text-left"
              >
                <div className="text-amber-500 flex items-center justify-center">
                  <FolderOpen className="h-4 w-4" />
                </div>
                <div className="text-ems-accent truncate">{item.name}</div>
                <div className="text-right text-text-muted text-xs">
                  {formatDate(item.modified)}
                </div>
                <div className="text-right text-text-muted text-xs">—</div>
              </button>
            ) : (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="grid grid-cols-[32px_1fr_120px_80px] gap-0 px-3 py-2 border-b border-border/50 text-sm hover:bg-hover transition-colors"
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
              </a>
            ),
          )}
        </div>
      )}
    </div>
  );
}
