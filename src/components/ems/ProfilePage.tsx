import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { fetchMyProfile } from '@/api/myProfileApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { UserProfileDetail } from './UserProfileDetail';
import type { UserProfileUser } from './UserProfileDetail';
import { getActiveAccount, getAccountEmail, getAccountName } from '@/auth/entra';
import { useAccount, useMsal } from '@azure/msal-react';

interface ProfilePageProps {
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export function ProfilePage({ addToast }: ProfilePageProps) {
  const { accounts } = useMsal();
  const account = getActiveAccount() ?? accounts[0] ?? null;
  const email = getAccountEmail(account) || '';
  const name = getAccountName(account);

  const profileQuery = useQuery({
    queryKey: ['my-profile'],
    queryFn: fetchMyProfile,
    staleTime: 30_000,
  });

  const loggedInUser: UserProfileUser | null = profileQuery.data
    ? {
        id: String(profileQuery.data.contactId),
        name: `${profileQuery.data.firstName ?? ''} ${profileQuery.data.lastName ?? ''}`.trim() || name,
        email: profileQuery.data.email || email,
        jobTitle: profileQuery.data.jobTitle || undefined,
        department: profileQuery.data.departmentName || undefined,
        mobilePhone: profileQuery.data.cellPhone || undefined,
        businessPhones: profileQuery.data.workPhone ? [profileQuery.data.workPhone] : undefined,
      }
    : null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      {profileQuery.isLoading ? (
        <div className="rounded-md border border-border bg-surface px-4 py-8 text-sm text-text-secondary">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin align-text-bottom" aria-hidden />
          Loading profile...
        </div>
      ) : profileQuery.isError ? (
        <div className="rounded-md border border-ems-coral/30 bg-ems-coral-dim px-4 py-3 text-sm text-ems-coral">
          {friendlyApiError(profileQuery.error, 'Could not load profile.')}
        </div>
      ) : loggedInUser ? (
        <UserProfileDetail user={loggedInUser} />
      ) : null}
    </div>
  );
}
