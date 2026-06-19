import { IconButton } from '@fluentui/react';
import type { DocumentItem } from '../types';

type FolderRowProps = {
  item: DocumentItem;
  onNavigate: (path: string) => void;
  formatDate: (date?: string) => string;
};

export function FolderRow({ item, onNavigate, formatDate }: FolderRowProps) {
  return (
    <div
      className="document-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 12px',
        borderBottom: '1px solid #f0f0f0',
        cursor: 'pointer',
        minHeight: 36,
        selectors: {
          ':hover': { backgroundColor: '#f3f9ff' },
        },
      }}
      onClick={() => onNavigate(item.path)}
    >
      <div style={{ width: 32, flexShrink: 0, textAlign: 'center', color: '#d8a200' }}>
        <i className="ms-Icon ms-Icon--FabricFolderFill" style={{ fontSize: 20, lineHeight: 24 }} />
      </div>
      <div style={{ flex: '1 1 40%', minWidth: 0, padding: '0 8px' }}>
        <span
          style={{
            color: '#0078d4',
            fontSize: 14,
            fontWeight: 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }}
        >
          {item.name}
        </span>
      </div>
      <div style={{ flex: '0 0 120px', fontSize: 13, color: '#666', textAlign: 'right' }}>
        {formatDate(item.modified)}
      </div>
      <div style={{ flex: '0 0 80px', textAlign: 'right', fontSize: 13, color: '#666' }}>
        —
      </div>
      <div style={{ flex: '0 0 40px', textAlign: 'center' }}>
        <IconButton
          iconProps={{ iconName: 'ContextMenu', style: { fontSize: 14, color: '#666' } }}
          title="Actions"
          ariaLabel="Actions"
          styles={{
            root: {
              width: 32,
              height: 32,
              selectors: {
                ':hover': { backgroundColor: '#e1e1e1' },
              },
            },
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        />
      </div>
    </div>
  );
}
