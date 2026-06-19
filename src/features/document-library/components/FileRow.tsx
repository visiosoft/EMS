import { IconButton, ContextualMenu } from '@fluentui/react';
import { useBoolean, useId } from '@fluentui/react-hooks';
import type { IContextualMenuProps } from '@fluentui/react';
import type { DocumentItem } from '../types';

type FileRowProps = {
  item: DocumentItem;
  formatFileSize: (bytes?: number) => string;
  formatDate: (date?: string) => string;
};

function getFileIcon(extension?: string): { icon: string; color: string } {
  if (!extension) return { icon: 'Page', color: '#0078d4' };
  const ext = extension.toLowerCase();

  const iconMap: Record<string, { icon: string; color: string }> = {
    '.doc': { icon: 'WordDocument', color: '#185abd' },
    '.docx': { icon: 'WordDocument', color: '#185abd' },
    '.xls': { icon: 'ExcelDocument', color: '#107c41' },
    '.xlsx': { icon: 'ExcelDocument', color: '#107c41' },
    '.ppt': { icon: 'PowerPointDocument', color: '#c43e1c' },
    '.pptx': { icon: 'PowerPointDocument', color: '#c43e1c' },
    '.pdf': { icon: 'PDF', color: '#f03a17' },
    '.txt': { icon: 'TextDocument', color: '#666' },
    '.zip': { icon: 'ZipFolder', color: '#b87333' },
    '.jpg': { icon: 'FileImage', color: '#666' },
    '.jpeg': { icon: 'FileImage', color: '#666' },
    '.png': { icon: 'FileImage', color: '#666' },
    '.gif': { icon: 'FileImage', color: '#666' },
    '.svg': { icon: 'FileImage', color: '#666' },
    '.mp4': { icon: 'Video', color: '#666' },
    '.mov': { icon: 'Video', color: '#666' },
    '.mp3': { icon: 'Audio', color: '#666' },
    '.wav': { icon: 'Audio', color: '#666' },
    '.msg': { icon: 'Mail', color: '#0072c6' },
    '.html': { icon: 'FileCode', color: '#666' },
    '.htm': { icon: 'FileCode', color: '#666' },
    '.csv': { icon: 'ExcelDocument', color: '#107c41' },
  };

  return iconMap[ext] || { icon: 'Page', color: '#0078d4' };
}

export function FileRow({ item, formatFileSize, formatDate }: FileRowProps) {
  const [menuVisible, { setTrue: showMenu, setFalse: hideMenu }] = useBoolean(false);
  const buttonId = useId('file-context-menu');

  const menuProps: IContextualMenuProps = {
    items: [
      {
        key: 'open',
        text: 'Open',
        iconProps: { iconName: 'OpenInNewWindow' },
        onClick: () => window.open(item.url, '_blank'),
      },
      {
        key: 'download',
        text: 'Download',
        iconProps: { iconName: 'Download' },
        onClick: () => {
          const a = document.createElement('a');
          a.href = item.url;
          a.download = item.name;
          a.target = '_blank';
          a.click();
        },
      },
      {
        key: 'copyLink',
        text: 'Copy link',
        iconProps: { iconName: 'Copy' },
        onClick: () => navigator.clipboard.writeText(item.url),
      },
    ],
  };

  const { icon, color } = getFileIcon(item.extension);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 12px',
        borderBottom: '1px solid #f0f0f0',
        cursor: 'default',
        minHeight: 36,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f3f9ff'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
    >
      <div style={{ width: 32, flexShrink: 0, textAlign: 'center', color }}>
        <i className={`ms-Icon ms-Icon--${icon}`} style={{ fontSize: 20, lineHeight: 24 }} />
      </div>
      <div style={{ flex: '1 1 40%', minWidth: 0, padding: '0 8px' }}>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          style={{
            color: '#333',
            fontSize: 14,
            fontWeight: 400,
            textDecoration: 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }}
        >
          {item.name}
        </a>
      </div>
      <div style={{ flex: '0 0 120px', fontSize: 13, color: '#666', textAlign: 'right' }}>
        {formatDate(item.modified)}
      </div>
      <div style={{ flex: '0 0 80px', textAlign: 'right', fontSize: 13, color: '#666' }}>
        {formatFileSize(item.size)}
      </div>
      <div style={{ flex: '0 0 40px', textAlign: 'center' }}>
        <IconButton
          id={buttonId}
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
            showMenu();
          }}
        />
        {menuVisible && (
          <ContextualMenu
            items={menuProps.items}
            hidden={!menuVisible}
            onDismiss={hideMenu}
            target={`#${buttonId}`}
          />
        )}
      </div>
    </div>
  );
}
