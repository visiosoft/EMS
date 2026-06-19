import { Spinner, SpinnerSize } from '@fluentui/react';
import { useMemo } from 'react';
import { getActiveAccount, getAccountOid } from '@/auth/entra';
import { useDocumentLibrary } from '../hooks/useDocumentLibrary';
import { DocumentBreadcrumbs } from './Breadcrumbs';
import { DocumentToolbar } from './Toolbar';
import { FolderRow } from './FolderRow';
import { FileRow } from './FileRow';

function ColumnHeader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        borderBottom: '1px solid #d1d1d1',
        backgroundColor: '#f5f5f5',
        minHeight: 32,
        fontSize: 12,
        fontWeight: 600,
        color: '#555',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
      }}
    >
      <div style={{ width: 32, flexShrink: 0, textAlign: 'center' }} />
      <div style={{ flex: '1 1 40%', padding: '0 8px' }}>Name</div>
      <div style={{ flex: '0 0 120px', textAlign: 'right' }}>Modified</div>
      <div style={{ flex: '0 0 80px', textAlign: 'right' }}>Size</div>
      <div style={{ flex: '0 0 40px', textAlign: 'center' }} />
    </div>
  );
}

export function DocumentLibrary() {
  const {
    items,
    isLoading,
    error,
    breadcrumbs,
    navigateToFolder,
    navigateToBreadcrumb,
    searchQuery,
    setSearchQuery,
    sortField,
    sortDirection,
    toggleSort,
    viewMode,
    setViewMode,
    formatFileSize,
    formatDate,
    refetch,
    hasHistory,
    goBack,
    source,
    setSource,
  } = useDocumentLibrary();

  // The source toggle is a personal/admin control: only the configured account sees it.
  const isSourceAdmin = useMemo(() => {
    const allowed = (import.meta.env.VITE_DOCUMENT_TOGGLE_OID as string | undefined)?.trim().toLowerCase();
    if (!allowed) return false;
    const oid = getAccountOid(getActiveAccount()).trim().toLowerCase();
    return Boolean(oid) && oid === allowed;
  }, []);

  if (error) {
    const err = error as Error & { detail?: string; suggestion?: string; status?: number };
    const errMsg = err.message || 'An unexpected error occurred';
    const errDetail = err.detail;
    const errSuggestion = err.suggestion;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          padding: 48,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: '#fde7e9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a80000" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>

        <div style={{ fontSize: 18, fontWeight: 600, color: '#222', marginBottom: 8 }}>
          {errMsg}
        </div>

        {errSuggestion ? (
          <div style={{ fontSize: 14, color: '#555', maxWidth: 480, lineHeight: 1.5, marginBottom: 20 }}>
            {errSuggestion}
          </div>
        ) : (
          <div style={{ fontSize: 14, color: '#555', maxWidth: 480, lineHeight: 1.5, marginBottom: 20 }}>
            Please try again or contact IT support if the issue persists.
          </div>
        )}

        <button
          onClick={() => refetch()}
          style={{
            padding: '8px 24px',
            background: '#0078d4',
            color: '#fff',
            border: 'none',
            borderRadius: 2,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Try again
        </button>

        {errDetail ? (
          <details
            style={{
              marginTop: 24,
              color: '#999',
              fontSize: 11,
              maxWidth: 600,
              textAlign: 'left',
            }}
          >
            <summary style={{ cursor: 'pointer', color: '#bbb' }}>Technical details</summary>
            <pre
              style={{
                marginTop: 8,
                padding: 8,
                backgroundColor: '#fafafa',
                border: '1px solid #eee',
                borderRadius: 2,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                fontSize: 11,
                color: '#777',
                lineHeight: 1.4,
              }}
            >
              {errDetail}
            </pre>
          </details>
        ) : null}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spinner size={SpinnerSize.large} label="Loading documents..." />
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div style={{ padding: 16 }}>
        <DocumentToolbar
          sortField={sortField}
          sortDirection={sortDirection}
          viewMode={viewMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleSort={toggleSort}
          onToggleView={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          onRefresh={() => refetch()}
          source={source}
          onSourceChange={setSource}
          showSourceToggle={isSourceAdmin}
        />
        <DocumentBreadcrumbs items={breadcrumbs} onNavigate={navigateToBreadcrumb} />
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#666' }}>
            <i className="ms-Icon ms-Icon--Page" style={{ fontSize: 48, color: '#d1d1d1', marginBottom: 8 }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>This folder is empty</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Add files or folders to get started</div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 16,
              padding: 8,
            }}
          >
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #e1e1e1',
                  borderRadius: 4,
                  padding: 16,
                  textAlign: 'center',
                  cursor: item.type === 'folder' ? 'pointer' : 'default',
                }}
                onClick={() => item.type === 'folder' && navigateToFolder(item.path)}
              >
                {item.type === 'folder' ? (
                  <i className="ms-Icon ms-Icon--FabricFolderFill" style={{ fontSize: 48, color: '#d8a200' }} />
                ) : (
                  <i
                    className={`ms-Icon ms-Icon--${getIconName(item.extension?.toLowerCase() || '')}`}
                    style={{ fontSize: 48, color: getIconColor(item.extension?.toLowerCase() || '') }}
                  />
                )}
                <div
                  style={{
                    fontSize: 13,
                    marginTop: 8,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={item.name}
                >
                  {item.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
        border: '1px solid #e1e1e1',
        borderRadius: 2,
      }}
    >
      <DocumentToolbar
        sortField={sortField}
        sortDirection={sortDirection}
        viewMode={viewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleSort={toggleSort}
        onToggleView={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
        onRefresh={() => refetch()}
        source={source}
        onSourceChange={setSource}
        showSourceToggle={isSourceAdmin}
      />
      <div style={{ padding: '8px 16px 0' }}>
        <DocumentBreadcrumbs items={breadcrumbs} onNavigate={navigateToBreadcrumb} />
      </div>
      <ColumnHeader />
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#666' }}>
          <i className="ms-Icon ms-Icon--Page" style={{ fontSize: 48, color: '#d1d1d1', marginBottom: 8 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>This folder is empty</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Add files or folders to get started</div>
        </div>
      ) : (
        <div>
          {items.map((item) =>
            item.type === 'folder' ? (
              <FolderRow
                key={item.id}
                item={item}
                onNavigate={navigateToFolder}
                formatDate={formatDate}
              />
            ) : (
              <FileRow
                key={item.id}
                item={item}
                source={source}
                formatFileSize={formatFileSize}
                formatDate={formatDate}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function getIconName(ext: string): string {
  const iconMap: Record<string, string> = {
    '.doc': 'WordDocument',
    '.docx': 'WordDocument',
    '.xls': 'ExcelDocument',
    '.xlsx': 'ExcelDocument',
    '.ppt': 'PowerPointDocument',
    '.pptx': 'PowerPointDocument',
    '.pdf': 'PDF',
    '.txt': 'TextDocument',
    '.zip': 'ZipFolder',
    '.jpg': 'FileImage',
    '.jpeg': 'FileImage',
    '.png': 'FileImage',
    '.gif': 'FileImage',
    '.svg': 'FileImage',
    '.mp4': 'Video',
    '.mov': 'Video',
    '.mp3': 'Audio',
    '.wav': 'Audio',
    '.csv': 'ExcelDocument',
    '.msg': 'Mail',
    '.html': 'FileCode',
    '.htm': 'FileCode',
  };
  return iconMap[ext] || 'Page';
}

function getIconColor(ext: string): string {
  const colorMap: Record<string, string> = {
    '.doc': '#185abd',
    '.docx': '#185abd',
    '.xls': '#107c41',
    '.xlsx': '#107c41',
    '.ppt': '#c43e1c',
    '.pptx': '#c43e1c',
    '.pdf': '#f03a17',
    '.csv': '#107c41',
  };
  return colorMap[ext] || '#0078d4';
}
