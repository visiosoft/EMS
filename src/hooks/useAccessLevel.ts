import { useQuery } from '@tanstack/react-query';
import { fetchMyAccessLevel, type AccessLevel } from '@/api/accessLevelApi';

/**
 * Hook that returns the current user's resolved access level.
 * Defaults to 'Employee' while loading or on error.
 */
export function useAccessLevel() {
  const query = useQuery({
    queryKey: ['my-access-level'],
    queryFn: fetchMyAccessLevel,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const accessLevel: AccessLevel = query.data?.accessLevel ?? 'Employee';

  return {
    accessLevel,
    isEmployee: accessLevel === 'Employee',
    isAdministrator: accessLevel === 'Administrator' || accessLevel === 'Super Admin',
    isSuperAdmin: accessLevel === 'Super Admin',
    isLoading: query.isLoading,
  };
}
