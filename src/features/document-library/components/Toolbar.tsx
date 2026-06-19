import { CommandBar } from '@fluentui/react';
import type { ICommandBarItemProps } from '@fluentui/react';
import type { SortField, SortDirection, ViewMode } from '../types';
import { DocumentSearchBar } from './SearchBar';

type ToolbarProps = {
  sortField: SortField;
  sortDirection: SortDirection;
  viewMode: ViewMode;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onToggleSort: (field: SortField) => void;
  onToggleView: () => void;
  onRefresh: () => void;
  onNewFolder?: () => void;
  onUpload?: () => void;
};

export function DocumentToolbar({
  sortField,
  sortDirection,
  viewMode,
  searchQuery,
  onSearchChange,
  onToggleSort,
  onToggleView,
  onRefresh,
}: ToolbarProps) {
  const sortLabel = `Sort by ${sortField === 'name' ? 'Name' : sortField === 'modified' ? 'Date modified' : 'Type'}`;
  const sortIcon = sortDirection === 'asc' ? 'SortUp' : 'SortDown';

  const farItems: ICommandBarItemProps[] = [
    {
      key: 'viewToggle',
      text: viewMode === 'list' ? 'Grid view' : 'List view',
      iconProps: { iconName: viewMode === 'list' ? 'GridViewSmall' : 'List' },
      onClick: onToggleView,
    },
    {
      key: 'refresh',
      text: 'Refresh',
      iconProps: { iconName: 'Refresh' },
      onClick: onRefresh,
    },
  ];

  const items: ICommandBarItemProps[] = [
    {
      key: 'new',
      text: 'New',
      iconProps: { iconName: 'Add' },
      subMenuProps: {
        items: [
          { key: 'folder', text: 'Folder', iconProps: { iconName: 'FabricFolderFill' } },
        ],
      },
    },
    {
      key: 'upload',
      text: 'Upload',
      iconProps: { iconName: 'Upload' },
      subMenuProps: {
        items: [
          { key: 'files', text: 'Files', iconProps: { iconName: 'Document' } },
          { key: 'folderUpload', text: 'Folder', iconProps: { iconName: 'FabricFolderFill' } },
        ],
      },
    },
    {
      key: 'sort',
      text: sortLabel,
      iconProps: { iconName: sortIcon },
      subMenuProps: {
        items: [
          {
            key: 'name',
            text: 'Name',
            canCheck: true,
            isChecked: sortField === 'name',
            onClick: () => onToggleSort('name'),
          },
          {
            key: 'modified',
            text: 'Date modified',
            canCheck: true,
            isChecked: sortField === 'modified',
            onClick: () => onToggleSort('modified'),
          },
          {
            key: 'type',
            text: 'Type',
            canCheck: true,
            isChecked: sortField === 'type',
            onClick: () => onToggleSort('type'),
          },
        ],
      },
    },
    {
      key: 'search',
      onRender: () => (
        <DocumentSearchBar
          value={searchQuery}
          onChange={onSearchChange}
        />
      ),
    },
  ];

  return (
    <CommandBar
      items={items}
      farItems={farItems}
      styles={{
        root: {
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid #e1e1e1',
          paddingLeft: 0,
          paddingRight: 0,
          selectors: {
            '.ms-CommandBar-primaryCommand': {
              alignItems: 'center',
            },
          },
        },
      }}
    />
  );
}
