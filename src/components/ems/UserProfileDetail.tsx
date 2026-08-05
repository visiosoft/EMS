import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, Briefcase, Heart, Star, Award, Lock, MapPin, Loader2, Eye, EyeOff, ExternalLink, RefreshCw, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { fetchEmployeePersonalProfile } from '@/api/employeeProfileApi';
import {
  fetchEmployeeEmploymentProfile,
  fetchUserLicenses,
  fetchUserGroups,
} from '@/api/employeeEmploymentApi';
import { fetchEmployeeHealthInsurance } from '@/api/employeeHealthInsuranceApi';
import { fetchEmployeeExperience } from '@/api/employeeExperienceApi';
import { fetchEmployeeCertifications } from '@/api/employeeCertificationsApi';
import { fetchMyProfile } from '@/api/myProfileApi';
import { previewMyProfileSyncFromEntra, syncMyProfileFromEntra } from '@/api/entraProfileSyncApi';
import type { EntraProfileSyncFieldChange } from '@/api/entraProfileSyncApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { getActiveAccount, getAccountEmail } from '@/auth/entra';
import { INTERNAL_ROOT } from '@/routing/paths';
import { TabBar } from './Primitives';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfileUser {
  id: string;
  name: string;
  email: string;
  jobTitle?: string;
  department?: string;
  employeeType?: string;
  officeLocation?: string;
  city?: string;
  mobilePhone?: string;
  businessPhones?: string[];
  companyName?: string;
  accountEnabled?: boolean;
  status?: 'Active' | 'Disabled';
}

interface UserProfileDetailProps {
  user: UserProfileUser;
  onBack?: () => void;
  addToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

type ProfileTab = 'Overview' | 'Personal' | 'Employment' | 'Health Insurance' | 'Experience' | 'Certifications';

// ─── Source Badges ────────────────────────────────────────────────────────────

type DataSource = 'entra' | 'employee' | 'admin' | 'google' | 'calculated' | 'ems' | 'inventory';

const SOURCE_STYLES: Record<DataSource, { label: string; className: string }> = {
  entra: { label: 'Entra', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  employee: { label: 'Employee', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  admin: { label: 'Admin', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  google: { label: 'Google API', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  calculated: { label: 'Calculated', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  ems: { label: 'EMS', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  inventory: { label: 'Inventory', className: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300' },
};

function SourceBadge({ source }: { source: DataSource }) {
  const style = SOURCE_STYLES[source];
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${style.className}`}>
      {style.label}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserProfileDetail({ user, onBack, addToast }: UserProfileDetailProps) {
  // When opened from Settings (onBack present), skip Overview tab
  const availableTabs = onBack
    ? ['Personal', 'Employment', 'Health Insurance', 'Experience', 'Certifications'] as const
    : ['Overview', 'Personal', 'Employment', 'Health Insurance', 'Experience', 'Certifications'] as const;
  const [profileTab, setProfileTab] = useState<ProfileTab>(availableTabs[0]);

  // Determine current viewer's access level from their own employment profile
  const currentUserEmail = getAccountEmail(getActiveAccount()) || '';
  const viewerProfileQuery = useQuery({
    queryKey: ['employee-employment-profile', currentUserEmail],
    queryFn: () => fetchEmployeeEmploymentProfile(currentUserEmail),
    enabled: !!currentUserEmail,
    staleTime: 60_000,
  });
  // Grant admin visibility to 'Administrator' and 'Super Admin' roles
  const viewerAccessLevel = viewerProfileQuery.data?.accessLevel || '';
  const isAdmin = viewerAccessLevel === 'Administrator' || viewerAccessLevel === 'Super Admin';

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-text-secondary hover:bg-hover hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-text-primary truncate">{user.name}</h1>
          <p className="text-sm text-text-secondary truncate">{user.email}</p>
        </div>
      </div>

      {/* Profile Tabs */}
      <TabBar
        tabs={availableTabs as unknown as string[]}
        active={profileTab}
        onChange={(t) => setProfileTab(t as ProfileTab)}
      />

      {/* Tab Content */}
      {profileTab === 'Overview' && !onBack && <OverviewTab user={user} addToast={addToast} />}
      {profileTab === 'Personal' && <PersonalTab user={user} isAdmin={isAdmin} addToast={addToast} />}
      {profileTab === 'Employment' && <EmploymentTab user={user} isAdmin={isAdmin} addToast={addToast} />}
      {profileTab === 'Health Insurance' && <HealthInsuranceTab user={user} isAdmin={isAdmin} addToast={addToast} />}
      {profileTab === 'Experience' && <ExperienceTab user={user} />}
      {profileTab === 'Certifications' && <CertificationsTab user={user} />}
    </div>
  );
}

// ─── Shared Field Components ──────────────────────────────────────────────────

function ReadOnlyField({ label, value, source }: { label: string; value: string; source?: DataSource }) {
  const isEntra = source === 'entra';
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-text-muted">{label}</label>
        {isEntra && <SourceBadge source={source!} />}
        <Lock className="h-3 w-3 text-text-muted/50" />
      </div>
      <div className={`rounded-md border border-border px-3 py-2 text-sm text-text-secondary ${isEntra ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-white/5'}`}>
        {value || '—'}
      </div>
    </div>
  );
}



function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-3">
        {icon}
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      <div className="px-4 py-4">
        {children}
      </div>
    </div>
  );
}

/** Read-only field with a link to edit the value in the WMS (Company Hub) */
function ReadOnlyWithWmsLink({ label, value, source }: { label: string; value: string; source?: DataSource }) {
  const wmsProfileUrl = `${INTERNAL_ROOT}#my-profile`;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-text-muted">{label}</label>
        {source && <SourceBadge source={source} />}
        <Lock className="h-3 w-3 text-text-muted/50" />
      </div>
      <div className="rounded-md border border-border bg-white dark:bg-white/5 px-3 py-2 text-sm text-text-secondary">
        {value || '—'}
      </div>
      <a
        href={wmsProfileUrl}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-ems-blue hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        Edit in Company Hub
      </a>
    </div>
  );
}

/** A field that hashes its value with a Show/Hide toggle button (for SSN, Age, etc.) */
function HashedField({ label, value, source }: { label: string; value: string; source?: DataSource }) {
  const [revealed, setRevealed] = useState(false);
  const masked = value ? '••••••••' : '—';
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-text-muted">{label}</label>
        {source && <SourceBadge source={source} />}
        <Lock className="h-3 w-3 text-text-muted/50" />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-md border border-border bg-white dark:bg-white/5 px-3 py-2 text-sm text-text-secondary">
          {revealed ? (value || '—') : masked}
        </div>
        {value && (
          <button
            type="button"
            onClick={() => setRevealed(!revealed)}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-2 text-xs font-medium text-text-secondary hover:bg-hover transition-colors"
            title={revealed ? 'Hide' : 'Show'}
          >
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {revealed ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
    </div>
  );
}



/** Banner indicating data is auto-synced from Entra on each page load */
function EntraSyncBanner({ queryKey, dataUpdatedAt }: { queryKey: string[]; dataUpdatedAt: number }) {
  const qc = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);
  const [previewChanges, setPreviewChanges] = useState<EntraProfileSyncFieldChange[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleSyncClick = async () => {
    setLoadingPreview(true);
    try {
      const result = await previewMyProfileSyncFromEntra();
      if (result.changes.length === 0) {
        // No changes — just refresh the query data
        await qc.invalidateQueries({ queryKey });
      } else {
        setPreviewChanges(result.changes);
        setShowPreview(true);
      }
    } catch {
      // Fallback: just do the sync if preview fails
      await qc.invalidateQueries({ queryKey });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmSync = async () => {
    setApplying(true);
    try {
      await syncMyProfileFromEntra();
      await qc.invalidateQueries({ queryKey });
    } finally {
      setApplying(false);
      setShowPreview(false);
      setPreviewChanges([]);
    }
  };

  const syncTime = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <>
      <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 px-3 py-2">
        <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="text-xs text-blue-700 dark:text-blue-300">
          Auto-synced from Entra{syncTime ? ` at ${syncTime}` : ''}
        </span>
        <button
          type="button"
          onClick={handleSyncClick}
          disabled={loadingPreview}
          className="ml-auto inline-flex items-center gap-1 rounded border border-blue-300 bg-white dark:bg-blue-900/40 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loadingPreview ? 'animate-spin' : ''}`} />
          Sync Now
        </button>
      </div>

      {showPreview && (
        <SyncPreviewModal
          changes={previewChanges}
          applying={applying}
          onConfirm={handleConfirmSync}
          onCancel={() => { setShowPreview(false); setPreviewChanges([]); }}
        />
      )}
    </>
  );
}

/** Modal showing field-level changes from Entra before applying sync */
function SyncPreviewModal({
  changes,
  applying,
  onConfirm,
  onCancel,
}: {
  changes: EntraProfileSyncFieldChange[];
  applying: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative z-50 w-full max-w-lg rounded-lg border border-border bg-surface shadow-xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Sync Preview</h2>
            <p className="text-xs text-text-muted mt-0.5">
              {changes.length} field{changes.length !== 1 ? 's' : ''} will be updated from Entra
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1 text-text-muted hover:bg-hover transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Changes list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-muted border-b border-border">
                <th className="pb-2 font-medium">Field</th>
                <th className="pb-2 font-medium">Current (EMS)</th>
                <th className="pb-2 w-6" />
                <th className="pb-2 font-medium">New (Entra)</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((change) => (
                <tr key={change.field} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-2 text-xs font-medium text-text-secondary whitespace-nowrap">
                    {change.label}
                  </td>
                  <td className="py-2 pr-1 text-xs text-text-muted max-w-[120px] truncate" title={change.from || '—'}>
                    {change.from || <span className="italic text-text-muted/60">empty</span>}
                  </td>
                  <td className="py-2 px-1">
                    <ArrowRight className="h-3 w-3 text-blue-500" />
                  </td>
                  <td className="py-2 text-xs text-text-primary font-medium max-w-[120px] truncate" title={change.to || '—'}>
                    {change.to || <span className="italic text-text-muted/60">empty</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={applying}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-hover transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={applying}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {applying && <Loader2 className="h-3 w-3 animate-spin" />}
            Confirm Sync
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ user }: { user: UserProfileUser; addToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void }) {
  const profileQuery = useQuery({
    queryKey: ['my-profile'],
    queryFn: fetchMyProfile,
    staleTime: 30_000,
  });

  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading profile…
      </div>
    );
  }

  const data = profileQuery.data;

  return (
    <div className="space-y-4">
      <SectionCard title="Profile" icon={<User className="h-4 w-4 text-ems-accent" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="First Name" value={data?.firstName || ''} source="entra" />
          <ReadOnlyField label="Last Name" value={data?.lastName || ''} source="entra" />
          <ReadOnlyField label="Email" value={user.email} source="entra" />
          <ReadOnlyField label="Department" value={data?.departmentName || ''} source="entra" />
          <ReadOnlyField label="Roles" value={data?.roleNames?.join(', ') || ''} source="entra" />
          <ReadOnlyWithWmsLink label="Mobile Phone" value={data?.cellPhone || ''} source="ems" />
          <ReadOnlyWithWmsLink label="Work Phone" value={data?.workPhone || ''} source="ems" />
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Personal Tab ─────────────────────────────────────────────────────────────

function PersonalTab({ user, isAdmin }: { user: UserProfileUser; isAdmin: boolean; addToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void }) {
  // ── Fetch existing profile ────────────────────────────────────────────────
  const profileQuery = useQuery({
    queryKey: ['employee-personal-profile', user.email],
    queryFn: () => fetchEmployeePersonalProfile(user.email),
    enabled: !!user.email,
    staleTime: 30_000,
  });

  // ── Loading / error states ────────────────────────────────────────────────
  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading personal profile…
      </div>
    );
  }

  if (profileQuery.isError && !profileQuery.data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-6 text-center text-sm text-red-700 dark:text-red-300">
        {friendlyApiError(profileQuery.error, 'Could not load personal profile.')}
      </div>
    );
  }

  const data = profileQuery.data;
  const birthDate = data?.birthDate || '';
  const age = birthDate ? calculateAge(birthDate) : null;

  return (
    <div className="space-y-4">
      <EntraSyncBanner queryKey={['employee-personal-profile', user.email]} dataUpdatedAt={profileQuery.dataUpdatedAt} />
      {/* Basic Info */}
      <SectionCard title="Basic Information" icon={<User className="h-4 w-4 text-ems-accent" />}>
        <div className="grid gap-4 md:grid-cols-3">
          <ReadOnlyField label="First Name" value={user.name.split(' ')[0] || ''} source="entra" />
          <ReadOnlyField label="Middle Name" value={data?.middleName || ''} source="employee" />
          <ReadOnlyField label="Last Name" value={user.name.split(' ').slice(1).join(' ') || ''} source="entra" />
          <ReadOnlyWithWmsLink label="Cell Phone Number" value={data?.cellPhone || user.mobilePhone || ''} source="entra" />
          <ReadOnlyField label="Birth Date" value={birthDate} source="employee" />
          {isAdmin && (
            <HashedField label="Social Security Number" value={data?.ssn || ''} source="employee" />
          )}
          {age !== null ? (
            <HashedField label="Age" value={`${age} years`} source="calculated" />
          ) : (
            <ReadOnlyField label="Age" value={birthDate ? '—' : 'Conditional on Birth Date'} source="calculated" />
          )}
        </div>
      </SectionCard>

      {/* Home Address */}
      <SectionCard title="Home Address" icon={<MapPin className="h-4 w-4 text-ems-accent" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <ReadOnlyWithWmsLink label="Street Address" value={data?.homeStreet || ''} />
          <ReadOnlyWithWmsLink label="Address Line 2" value={data?.homeAddress2 || ''} />
          <ReadOnlyWithWmsLink label="City" value={data?.homeCity || ''} />
          <ReadOnlyWithWmsLink label="State" value={data?.homeState || ''} />
          <ReadOnlyWithWmsLink label="Postal Code" value={data?.homePostalCode || ''} />
          <ReadOnlyWithWmsLink label="Country" value={data?.homeCountry || ''} />
        </div>
      </SectionCard>

      {/* Emergency Contact */}
      <SectionCard title="Emergency Contact" icon={<User className="h-4 w-4 text-ems-coral" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <ReadOnlyWithWmsLink label="First Name" value={data?.emergencyFirstName || ''} source="employee" />
          <ReadOnlyWithWmsLink label="Last Name" value={data?.emergencyLastName || ''} source="employee" />
          <ReadOnlyWithWmsLink label="Email" value={data?.emergencyEmail || ''} source="employee" />
          <ReadOnlyWithWmsLink label="Cell Phone" value={data?.emergencyCellPhone || ''} source="employee" />
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Employment Tab ───────────────────────────────────────────────────────────

function EmploymentTab({ user, isAdmin }: { user: UserProfileUser; isAdmin: boolean; addToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void }) {
  // ── Fetch existing employment profile ─────────────────────────────────────
  const profileQuery = useQuery({
    queryKey: ['employee-employment-profile', user.email],
    queryFn: () => fetchEmployeeEmploymentProfile(user.email),
    enabled: !!user.email,
    staleTime: 30_000,
  });

  // ── Fetch Entra licenses & group membership ───────────────────────────────
  const licensesQuery = useQuery({
    queryKey: ['user-licenses', user.email],
    queryFn: () => fetchUserLicenses(user.email),
    enabled: !!user.email,
    staleTime: 60_000,
  });

  const groupsQuery = useQuery({
    queryKey: ['user-groups', user.email],
    queryFn: () => fetchUserGroups(user.email),
    enabled: !!user.email,
    staleTime: 60_000,
  });

  // ── Loading / error states ────────────────────────────────────────────────
  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading employment profile…
      </div>
    );
  }

  if (profileQuery.isError && !profileQuery.data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-6 text-center text-sm text-red-700 dark:text-red-300">
        {friendlyApiError(profileQuery.error, 'Could not load employment profile.')}
      </div>
    );
  }

  const data = profileQuery.data;
  const startDate = data?.startDate || '';
  const yearsOfService = startDate ? calculateYearsOfService(startDate) : null;

  return (
    <div className="space-y-4">
      <EntraSyncBanner queryKey={['employee-employment-profile', user.email]} dataUpdatedAt={profileQuery.dataUpdatedAt} />
      {/* Directory Info */}
      <SectionCard title="Directory Info" icon={<Briefcase className="h-4 w-4 text-ems-accent" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="Title" value={user.jobTitle || ''} source="entra" />
          <ReadOnlyField label="Work Email" value={user.email} source="entra" />
          <ReadOnlyField label="Office" value={user.officeLocation || ''} source="entra" />
          <ReadOnlyField
            label="Microsoft Office License"
            value={licensesQuery.isLoading ? 'Loading…' : licensesQuery.data?.length ? licensesQuery.data.join(', ') : 'None'}
            source="entra"
          />
          <div className="md:col-span-2">
            <ReadOnlyField
              label="Microsoft Group Membership"
              value={groupsQuery.isLoading ? 'Loading…' : groupsQuery.data?.length ? groupsQuery.data.join(', ') : 'None'}
              source="entra"
            />
          </div>
        </div>
      </SectionCard>

      {/* Employment Details */}
      <SectionCard title="Employment Details" icon={<Briefcase className="h-4 w-4 text-ems-blue" />}>
        <div className="grid gap-4 md:grid-cols-2">
          {isAdmin && <ReadOnlyField label="Access Level" value={data?.accessLevel || ''} source="admin" />}
          {isAdmin && <ReadOnlyField label="Work Authorization" value={data?.workAuthorization || ''} source="admin" />}
          <ReadOnlyWithWmsLink label="Workstation" value={data?.workstation || ''} source="admin" />
          <ReadOnlyField label="Start Date at IAE" value={startDate} source="admin" />
          {yearsOfService !== null ? (
            <ReadOnlyField label="Years of Service" value={yearsOfService} source="calculated" />
          ) : (
            <ReadOnlyField label="Years of Service" value={startDate ? '—' : 'Conditional on Start Date'} source="calculated" />
          )}
          <ReadOnlyField label="Supervisor" value={data?.supervisor || ''} source="admin" />
          {isAdmin && <ReadOnlyField label="Paid Time Off Accrual Rate" value={data?.ptoAccrualRate || ''} source="admin" />}
          {isAdmin && <ReadOnlyField label="Employment Agreement Fully Executed" value={data?.employmentAgreement || ''} source="admin" />}
          {isAdmin && <ReadOnlyField label="Ramp Account" value={data?.rampAccount || ''} source="admin" />}
          {isAdmin && <ReadOnlyField label="Ramp Credit Card" value={data?.rampCreditCard || ''} source="admin" />}
        </div>
      </SectionCard>

      {/* Office Address */}
      <SectionCard title="Office Address" icon={<MapPin className="h-4 w-4 text-ems-accent" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="Street Address" value={data?.officeStreet || ''} source="admin" />
          <ReadOnlyField label="Address Line 2" value={data?.officeAddress2 || ''} source="admin" />
          <ReadOnlyField label="City" value={data?.officeCity || ''} source="admin" />
          <ReadOnlyField label="State" value={data?.officeState || ''} source="admin" />
          <ReadOnlyField label="Postal Code" value={data?.officePostalCode || ''} source="admin" />
          <ReadOnlyField label="Country" value={data?.officeCountry || ''} source="admin" />
        </div>
      </SectionCard>

      {/* Desk Phone & Equipment */}
      <SectionCard title="Desk Phone & Equipment" icon={<Briefcase className="h-4 w-4 text-ems-green" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <ReadOnlyWithWmsLink label="Desk Phone Number" value="(312) 274-1800" source="admin" />
          <ReadOnlyWithWmsLink label="Desk Phone Extension" value={data?.deskPhoneExtension || ''} source="inventory" />
          <ReadOnlyWithWmsLink label="Desk Phone MAC Address" value={data?.deskPhoneMac || ''} source="inventory" />
          <ReadOnlyWithWmsLink label="Desk Phone Brand" value={data?.deskPhoneBrand || ''} source="inventory" />
          <ReadOnlyWithWmsLink label="Desk Phone Model" value={data?.deskPhoneModel || ''} source="inventory" />
          <ReadOnlyWithWmsLink label="PC Service Tag" value={data?.pcServiceTag || ''} source="inventory" />
          <ReadOnlyWithWmsLink label="PC Brand" value={data?.pcBrand || ''} source="inventory" />
          <ReadOnlyWithWmsLink label="PC Model" value={data?.pcModel || ''} source="inventory" />
          <ReadOnlyWithWmsLink label="Bluetooth Status" value={data?.bluetoothStatus || ''} source="inventory" />
          <ReadOnlyWithWmsLink label="PC Windows Name" value={data?.pcWindowsName || ''} source="inventory" />
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Health Insurance Tab ─────────────────────────────────────────────────────

function ReadOnlyInsuranceSection({
  title,
  icon,
  election,
}: {
  title: string;
  icon: React.ReactNode;
  election?: { optInStatus: string; planName?: string; additionalInsureds?: string; planPrice?: string; planBenefits?: string; monthlyRate?: string; payrollDeduction?: string };
}) {
  const optedIn = election?.optInStatus?.toLowerCase().includes('opt-in');
  return (
    <SectionCard title={title} icon={icon}>
      <div className="grid gap-4 md:grid-cols-2">
        <ReadOnlyField label="Opt-In / Opt-Out" value={election?.optInStatus || '—'} source="admin" />
        {optedIn && (
          <>
            <ReadOnlyField label="Chosen Plan" value={election?.planName || '—'} source="admin" />
            <ReadOnlyField label="Additional Insureds" value={election?.additionalInsureds || '—'} source="admin" />
            <ReadOnlyField label="Plan Price" value={election?.planPrice || '—'} source="calculated" />
            <ReadOnlyField label="Plan Benefits" value={election?.planBenefits || '—'} source="calculated" />
            {election?.monthlyRate && <ReadOnlyField label="Monthly Rate" value={election.monthlyRate} source="calculated" />}
            {election?.payrollDeduction && <ReadOnlyField label="Payroll Deduction" value={election.payrollDeduction} source="calculated" />}
          </>
        )}
      </div>
    </SectionCard>
  );
}

function HealthInsuranceTab({ user }: { user: UserProfileUser; isAdmin: boolean; addToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void }) {
  const insuranceQuery = useQuery({
    queryKey: ['employee-health-insurance', user.email],
    queryFn: () => fetchEmployeeHealthInsurance(user.email),
    enabled: !!user.email,
    staleTime: 30_000,
  });

  if (insuranceQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading health insurance…
      </div>
    );
  }

  if (insuranceQuery.isError && !insuranceQuery.data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-6 text-center text-sm text-red-700 dark:text-red-300">
        {friendlyApiError(insuranceQuery.error, 'Could not load health insurance.')}
      </div>
    );
  }

  const insuranceEligibility = insuranceQuery.data?.insuranceEligibility ?? 'Ineligible';
  const elections = insuranceQuery.data?.elections ?? [];
  const health = elections.find((e) => e.insuranceType === 'Medical');
  const dental = elections.find((e) => e.insuranceType === 'Dental');
  const vision = elections.find((e) => e.insuranceType === 'Vision');

  return (
    <div className="space-y-4">
      <SectionCard title="Health Insurance Information" icon={<Heart className="h-4 w-4 text-ems-coral" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="Health Insurance Status" value={insuranceEligibility} source="calculated" />
        </div>
      </SectionCard>

      <ReadOnlyInsuranceSection
        title="Medical Insurance"
        icon={<Heart className="h-4 w-4 text-ems-coral" />}
        election={health}
      />
      <ReadOnlyInsuranceSection
        title="Dental Insurance"
        icon={<Heart className="h-4 w-4 text-ems-blue" />}
        election={dental}
      />
      <ReadOnlyInsuranceSection
        title="Vision Insurance"
        icon={<Heart className="h-4 w-4 text-ems-green" />}
        election={vision}
      />
    </div>
  );
}

// ─── Experience Tab ───────────────────────────────────────────────────────────

function NameList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-text-muted italic">None</p>;
  }
  return (
    <ul className="space-y-1">
      {items.map((name) => (
        <li key={name} className="flex items-center gap-2 text-sm text-text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-ems-accent shrink-0" />
          {name}
        </li>
      ))}
    </ul>
  );
}

function ExperienceTab({ user }: { user: UserProfileUser }) {
  const experienceQuery = useQuery({
    queryKey: ['employee-experience', user.email],
    queryFn: () => fetchEmployeeExperience(user.email),
    enabled: !!user.email,
    staleTime: 30_000,
  });

  if (experienceQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading experience…
      </div>
    );
  }

  if (experienceQuery.isError && !experienceQuery.data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-6 text-center text-sm text-red-700 dark:text-red-300">
        {friendlyApiError(experienceQuery.error, 'Could not load experience data.')}
      </div>
    );
  }

  const data = experienceQuery.data;

  return (
    <div className="space-y-4">
      {/* Engagements Assigned To */}
      <SectionCard title="Engagements Assigned To" icon={<Star className="h-4 w-4 text-ems-amber" />}>
        <NameList items={data?.engagementsAssignedTo ?? []} />
      </SectionCard>

      {/* Engagements Worked On */}
      <SectionCard title="Engagements Worked On" icon={<Star className="h-4 w-4 text-ems-green" />}>
        <NameList items={data?.engagementsWorkedOn ?? []} />
      </SectionCard>

      {/* Markets Worked In */}
      <SectionCard title="Markets Worked In" icon={<MapPin className="h-4 w-4 text-ems-blue" />}>
        <NameList items={data?.marketsWorkedIn ?? []} />
      </SectionCard>
    </div>
  );
}

// ─── Certifications Tab ───────────────────────────────────────────────────────

/** Platform brand colors and logos */
const PLATFORM_BRANDS: Record<string, { bg: string; text: string; logo: string; img?: string }> = {
  adobe: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', logo: 'Ai', img: '/images/platforms/adobe.png' },
  coursera: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', logo: 'C', img: '/images/platforms/coursera.png' },
  'linkedin learning': { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400', logo: 'in', img: '/images/platforms/linkedin.png' },
  linkedin: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400', logo: 'in', img: '/images/platforms/linkedin.png' },
  skillshare: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', logo: 'Sk', img: '/images/platforms/skillshare.png' },
  canva: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', logo: 'Cv', img: '/images/platforms/canva.png' },
  awwwards: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', logo: 'Aw', img: '/images/platforms/awwwards.png' },
  google: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', logo: 'G', img: '/images/platforms/google.png' },
  meta: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', logo: 'M', img: '/images/platforms/meta.png' },
  cfi: { bg: 'bg-slate-100 dark:bg-slate-900/30', text: 'text-slate-600 dark:text-slate-400', logo: 'CFI', img: '/images/platforms/cfi.png' },
  udemy: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400', logo: 'U', img: '/images/platforms/udemy.png' },
  hubspot: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', logo: 'HS', img: '/images/platforms/hubspot.png' },
  microsoft: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', logo: 'MS', img: '/images/platforms/microsoft.png' },
  aws: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', logo: 'AWS', img: '/images/platforms/aws.png' },
};

function getPlatformStyle(platform: string) {
  const key = platform.toLowerCase();
  return PLATFORM_BRANDS[key] || { bg: 'bg-ems-accent/10', text: 'text-ems-accent', logo: platform.slice(0, 2).toUpperCase() };
}

function PlatformLogo({ platform }: { platform: string }) {
  const style = getPlatformStyle(platform);
  const [imgError, setImgError] = useState(false);

  if (style.img && !imgError) {
    return (
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${style.bg} overflow-hidden`}>
        <img
          src={style.img}
          alt={platform}
          className="h-7 w-7 object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${style.bg}`}>
      <span className={`text-xs font-bold leading-none ${style.text}`}>{style.logo}</span>
    </div>
  );
}

function CertificationsTab({ user }: { user: UserProfileUser }) {
  const certificationsQuery = useQuery({
    queryKey: ['employee-certifications', user.email],
    queryFn: () => fetchEmployeeCertifications(user.email),
    enabled: !!user.email,
    staleTime: 30_000,
  });

  if (certificationsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading certifications…
      </div>
    );
  }

  if (certificationsQuery.isError && !certificationsQuery.data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-6 text-center text-sm text-red-700 dark:text-red-300">
        {friendlyApiError(certificationsQuery.error, 'Could not load certifications.')}
      </div>
    );
  }

  const certifications = certificationsQuery.data?.certifications ?? [];

  return (
    <div className="space-y-4">
      <SectionCard title="Completed / Awarded Credentials & Certifications" icon={<Award className="h-4 w-4 text-ems-accent" />}>
        <div className="space-y-3">

          {certifications.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-elevated/50 px-6 py-10 text-center">
              <Award className="mx-auto h-10 w-10 text-text-muted/40" />
              <p className="mt-3 text-sm font-medium text-text-secondary">No certifications on file</p>
              <p className="mt-1 text-xs text-text-muted">
                Certifications and credentials will appear here once verified through the Learning Portal.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {certifications.map((cert) => {
                return (
                  <div
                    key={cert.submissionId}
                    className="rounded-lg border border-border bg-surface p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <PlatformLogo platform={cert.platformName} />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-text-primary leading-tight">{cert.certificationName}</h4>
                        <p className="text-xs text-text-secondary mt-0.5">{cert.platformName}</p>
                        {cert.dateCompleted && (
                          <p className="mt-1 text-xs text-text-muted flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            Awarded: {cert.dateCompleted}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {cert.tags.map((tag) => (
                          <span key={tag} className="inline-flex rounded-full bg-ems-accent/10 px-2 py-0.5 text-[10px] font-medium text-ems-accent">
                            {tag}
                          </span>
                        ))}
                      </div>
                      {cert.pointsAwarded > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-ems-amber">
                          <Star className="h-3 w-3 fill-ems-amber" />{cert.pointsAwarded} pts
                        </span>
                      )}
                    </div>
                    {cert.credentialUrl && (
                      <a
                        href={cert.credentialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-ems-blue hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Credential →
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculateAge(birthDateStr: string): number | null {
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function calculateYearsOfService(startDateStr: string): string | null {
  const startDate = new Date(startDateStr);
  if (isNaN(startDate.getTime())) return null;
  const today = new Date();
  let years = today.getFullYear() - startDate.getFullYear();
  let months = today.getMonth() - startDate.getMonth();
  if (today.getDate() < startDate.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
}
