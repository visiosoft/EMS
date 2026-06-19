export type DocumentItemType = 'folder' | 'file';

export type DocumentItem = {
  id: string;
  name: string;
  type: DocumentItemType;
  path: string;
  url: string;
  size?: number;
  modified?: string;
  extension?: string;
};

export type SortField = 'name' | 'modified' | 'type';
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'list' | 'grid';

export type BreadcrumbItem = {
  name: string;
  path: string;
};
