import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useCallback } from 'react';
import { fetchFolderContents } from '../services/documentApi';
import type { DocumentItem, DocumentSource, SortField, SortDirection, ViewMode, BreadcrumbItem } from '../types';

const ONEDRIVE_BASE_PATH = '';

function getFileTypeWeight(type: string): number {
  return type === 'folder' ? 0 : 1;
}

function compareItems(
  a: DocumentItem,
  b: DocumentItem,
  field: SortField,
  direction: SortDirection,
): number {
  const dir = direction === 'asc' ? 1 : -1;

  const typeDiff = getFileTypeWeight(a.type) - getFileTypeWeight(b.type);
  if (typeDiff !== 0) return typeDiff;

  if (field === 'name') {
    return a.name.localeCompare(b.name) * dir;
  }
  if (field === 'type') {
    const aExt = a.extension || '';
    const bExt = b.extension || '';
    return aExt.localeCompare(bExt) * dir;
  }
  if (field === 'modified') {
    const aDate = a.modified ? new Date(a.modified).getTime() : 0;
    const bDate = b.modified ? new Date(b.modified).getTime() : 0;
    return (aDate - bDate) * dir;
  }
  return 0;
}

export function useDocumentLibrary() {
  const [currentPath, setCurrentPath] = useState<string>(ONEDRIVE_BASE_PATH);
  const [source, setSourceState] = useState<DocumentSource>('sharepoint');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [history, setHistory] = useState<string[]>([]);

  const { data: items, isLoading, error, refetch } = useQuery({
    queryKey: ['document-folder', source, currentPath],
    queryFn: () => fetchFolderContents(currentPath, source),
    staleTime: 30_000,
  });

  const setSource = useCallback((next: DocumentSource) => {
    setSourceState((prev) => {
      if (prev === next) return prev;
      // Switching drives invalidates the current path/history (paths are drive-specific).
      setCurrentPath(ONEDRIVE_BASE_PATH);
      setHistory([]);
      setSearchQuery('');
      return next;
    });
  }, []);

  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    const parts = currentPath.split('/').filter(Boolean);
    const crumbs: BreadcrumbItem[] = [
      { name: source === 'onedrive' ? 'OneDrive' : 'Documents', path: '' },
    ];
    let accumulated = '';
    for (const part of parts) {
      accumulated = accumulated ? `${accumulated}/${part}` : part;
      crumbs.push({ name: part, path: accumulated });
    }
    return crumbs;
  }, [currentPath, source]);

  const navigateToFolder = useCallback((folderPath: string) => {
    setHistory((prev) => [...prev, currentPath]);
    setCurrentPath(folderPath);
    setSearchQuery('');
  }, [currentPath]);

  const navigateToBreadcrumb = useCallback((path: string) => {
    setHistory((prev) => {
      const idx = prev.indexOf(path);
      return idx >= 0 ? prev.slice(0, idx) : prev;
    });
    setCurrentPath(path);
    setSearchQuery('');
  }, []);

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const previous = newHistory.pop()!;
      setCurrentPath(previous);
      return newHistory;
    });
  }, []);

  const toggleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDirection('asc');
      return field;
    });
  }, []);

  const filteredAndSorted = useMemo((): DocumentItem[] => {
    if (!items) return [];
    let result = items;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.extension && item.extension.toLowerCase().includes(query)),
      );
    }

    result = [...result].sort((a, b) => compareItems(a, b, sortField, sortDirection));
    return result;
  }, [items, searchQuery, sortField, sortDirection]);

  const formatFileSize = useCallback((bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }, []);

  const formatDate = useCallback((dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }, []);

  return {
    currentPath,
    source,
    setSource,
    items: filteredAndSorted,
    allItems: items,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    sortField,
    sortDirection,
    toggleSort,
    viewMode,
    setViewMode,
    breadcrumbs,
    navigateToFolder,
    navigateToBreadcrumb,
    goBack,
    formatFileSize,
    formatDate,
    refetch,
    hasHistory: history.length > 0,
  };
}
