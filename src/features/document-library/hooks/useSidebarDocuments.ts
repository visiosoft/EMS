import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { fetchFolderContents } from '../services/documentApi';
import type { DocumentItem } from '../types';

const ONEDRIVE_BASE_PATH = '';

export function useSidebarDocuments() {
  const [currentPath, setCurrentPath] = useState<string>(ONEDRIVE_BASE_PATH);

  const { data: items, isLoading, error, refetch } = useQuery({
    queryKey: ['my-onedrive-sidebar', currentPath],
    // The logged-in user's OWN OneDrive (source=onedrive + self); CreatedBy filter still applies.
    queryFn: () => fetchFolderContents(currentPath, 'onedrive', { self: true }),
    staleTime: 30_000,
  });

  const sortedItems = useMemo(() => {
    if (!items) return [];
    return [...items].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [items]);

  const navigateToFolder = useCallback((folderPath: string) => {
    setCurrentPath(folderPath);
  }, []);

  const canGoUp = currentPath !== ONEDRIVE_BASE_PATH;

  const goUp = useCallback(() => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.join('/'));
  }, [currentPath]);

  return {
    items: sortedItems,
    isLoading,
    error,
    refetch,
    navigateToFolder,
    canGoUp,
    goUp,
    currentPath,
  };
}
