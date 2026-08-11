import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, UserRound, Briefcase, Heart, HeartPulse, Star, Award, Lock, MapPin, Loader2, Eye, EyeOff, ExternalLink, RefreshCw, Save, Laptop, KeyRound, Ticket, Users } from 'lucide-react';
import { fetchEmployeePersonalProfile } from '@/api/employeeProfileApi';
import {
  fetchEmployeeEmploymentProfile,
  fetchUserLicenses,
  fetchUserGroups,
  updateEmployeeEmploymentProfile,
} from '@/api/employeeEmploymentApi';
import { fetchEmployeeHealthInsurance, bulkUpdateHealthInsurance, type HealthPlanOption, type BulkUpdateHealthInsuranceRequest, type EmployeeHealthInsurance } from '@/api/employeeHealthInsuranceApi';
import { fetchEmployeeExperience } from '@/api/employeeExperienceApi';
import { fetchEmployeeCertifications } from '@/api/employeeCertificationsApi';
import { previewUserSyncFromEntra } from '@/api/entraProfileSyncApi';
import { EntraSyncPreviewDialog } from '@/components/ems/EntraSyncPreviewDialog';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { getActiveAccount, getAccountEmail } from '@/auth/entra';
import { INTERNAL_ROOT } from '@/routing/paths';


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

type ProfileTab = 'Personal' | 'Employment' | 'Health Insurance' | 'Property' | 'Licenses & Groups' | 'Certifications' | 'Experience';

const tabIcons: Record<ProfileTab, React.ReactNode> = {
  Personal: <UserRound className="h-3.5 w-3.5" />,
  Employment: <Briefcase className="h-3.5 w-3.5" />,
  'Health Insurance': <HeartPulse className="h-3.5 w-3.5" />,
  Property: <Laptop className="h-3.5 w-3.5" />,
  'Licenses & Groups': <KeyRound className="h-3.5 w-3.5" />,
  Certifications: <Award className="h-3.5 w-3.5" />,
  Experience: <Ticket className="h-3.5 w-3.5" />,
};

function ProfileTabBar({ tabs, active, onChange }: { tabs: readonly ProfileTab[]; active: ProfileTab; onChange: (t: ProfileTab) => void }) {
  return (
    <div className="flex border-b border-border overflow-x-auto -mx-2 px-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm sm:px-4 font-medium transition-colors relative whitespace-nowrap ${
            active === tab
              ? 'text-ems-accent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-ems-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {tabIcons[tab]}
          {tab}
        </button>
      ))}
    </div>
  );
}

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
  const availableTabs = ['Personal', 'Employment', 'Health Insurance', 'Property', 'Licenses & Groups', 'Certifications', 'Experience'] as const;
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
  const isAdmin = viewerAccessLevel === 'Administrator' || viewerAccessLevel === 'Admin' || viewerAccessLevel === 'Super Admin';

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3 flex-wrap">
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
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-semibold text-text-primary truncate">{user.name}</h1>
          <p className="text-xs sm:text-sm text-text-secondary truncate">{user.email}</p>
        </div>
      </div>

      {/* Profile Tabs */}
      <ProfileTabBar
        tabs={availableTabs}
        active={profileTab}
        onChange={setProfileTab}
      />

      {/* Tab Content */}
      {profileTab === 'Personal' && <PersonalTab user={user} isAdmin={isAdmin} addToast={addToast} />}
      {profileTab === 'Employment' && <EmploymentTab user={user} isAdmin={isAdmin} addToast={addToast} />}
      {profileTab === 'Health Insurance' && <HealthInsuranceTab user={user} isAdmin={isAdmin} addToast={addToast} />}
      {profileTab === 'Property' && <PropertyTab user={user} isAdmin={isAdmin} addToast={addToast} />}
      {profileTab === 'Licenses & Groups' && <LicensesGroupsTab user={user} />}
      {profileTab === 'Certifications' && <CertificationsTab user={user} />}
      {profileTab === 'Experience' && <ExperienceTab user={user} />}
    </div>
  );
}

// ─── Shared Field Components ──────────────────────────────────────────────────

function ReadOnlyField({ label, value, source }: { label: string; value: string; source?: DataSource }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-text-muted">{label}</label>
        <Lock className="h-3 w-3 text-text-muted/50" />
      </div>
      <div className="rounded-md border border-border bg-white dark:bg-white/5 px-3 py-2 text-sm text-text-secondary">
        {value || '—'}
      </div>
    </div>
  );
}



function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
  source,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  source?: DataSource;
}) {
  const isEntra = source === 'entra';
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-text-muted">{label}</label>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-md border border-border bg-white dark:bg-white/5 px-3 py-2 text-sm text-text-primary focus:border-ems-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">— Select —</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function SavingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-6 py-4 shadow-xl">
        <Loader2 className="h-5 w-5 animate-spin text-ems-accent" />
        <span className="text-sm font-medium text-text-primary">Saving…</span>
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
function ReadOnlyWithWmsLink({ label, value, source, contactId }: { label: string; value: string; source?: DataSource; contactId?: number }) {
  const wmsProfileUrl = contactId
    ? `${INTERNAL_ROOT}?view=employee-profile&contactId=${contactId}`
    : `${INTERNAL_ROOT}?view=my-profile`;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-text-muted">{label}</label>
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

/** Editable link field — displays clickable URL with inline edit capability */
function EditableLinkField({ label, value, onSave }: { label: string; value: string; onSave: (url: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-text-muted">{label}</label>
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            type="url"
            className="flex-1 rounded-md border border-border bg-white dark:bg-white/5 px-3 py-2 text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://..."
            autoFocus
          />
          <button
            className="rounded px-2 py-1.5 text-xs font-medium bg-ems-accent text-white hover:bg-ems-accent/90"
            onClick={() => { onSave(draft); setEditing(false); }}
          >
            <Save className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-border bg-white dark:bg-white/5 px-3 py-2 text-sm">
          {value ? (
            <a href={value} target="_blank" rel="noopener noreferrer" className="text-ems-blue hover:underline truncate flex-1">
              {value}
            </a>
          ) : (
            <span className="text-text-muted flex-1">—</span>
          )}
          <button onClick={() => setEditing(true)} className="text-text-muted hover:text-ems-accent">
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
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


function RefetchingBanner() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-3 py-2">
      <Loader2 className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
      <span className="text-xs text-amber-700 dark:text-amber-300">Fetching data from database…</span>
    </div>
  );
}

/** Banner with "Sync from Entra" button — opens selective field dialog */
function EntraSyncBanner({ email, tabFields, invalidateKeys }: { email: string; tabFields: string[]; invalidateKeys: string[][] }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fetchEnabled, setFetchEnabled] = useState(false);

  const queryKey = ['entra-sync-preview', email];

  const previewQuery = useQuery({
    queryKey,
    queryFn: () => previewUserSyncFromEntra(email),
    enabled: fetchEnabled,
    staleTime: 0,
  });

  function handleClick() {
    queryClient.removeQueries({ queryKey });
    setFetchEnabled(true);
  }

  // Open dialog once fresh data arrives
  if (fetchEnabled && previewQuery.data && !dialogOpen && !previewQuery.isFetching) {
    setDialogOpen(true);
  }

  const loading = fetchEnabled && previewQuery.isFetching;

  return (
    <>
      <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 px-3 py-2">
        <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="text-xs text-blue-700 dark:text-blue-300">
          Pull latest field values from Microsoft Entra
        </span>
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-1 rounded border border-blue-300 bg-white dark:bg-blue-900/40 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Sync from Entra
        </button>
      </div>

      {previewQuery.data && (
        <EntraSyncPreviewDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setFetchEnabled(false);
          }}
          changes={previewQuery.data.changes}
          targetEmail={email}
          tabFields={tabFields}
          invalidateKeys={invalidateKeys}
        />
      )}
    </>
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
      <EntraSyncBanner
        email={user.email}
        tabFields={[
          'firstName', 'lastName', 'cellPhone', 'workPhone', 'middleName',
          'personalEmail', 'birthDate', 'ssn',
          'streetAddress', 'streetAddress2', 'city', 'state', 'postalCode', 'country',
          'emergencyContactName', 'emergencyContactPhone', 'emergencyContactEmail',
        ]}
        invalidateKeys={[['employee-personal-profile', user.email], ['employee-employment-profile', user.email]]}
      />
      {profileQuery.isFetching && !profileQuery.isLoading && <RefetchingBanner />}
      {/* Basic Info */}
      <SectionCard title="Basic Information" icon={<User className="h-4 w-4 text-ems-accent" />}>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ReadOnlyField label="First Name" value={data?.firstName || ''} source="ems" />
          <ReadOnlyField label="Middle Name" value={data?.middleName || ''} source="employee" />
          <ReadOnlyField label="Last Name" value={data?.lastName || ''} source="ems" />
          <ReadOnlyWithWmsLink label="Cell Phone Number" value={data?.cellPhone || ''} source="ems" contactId={data?.contactId} />
          <ReadOnlyWithWmsLink label="Work Phone" value={data?.workPhone || ''} source="ems" contactId={data?.contactId} />
          <ReadOnlyField label="Personal Email" value={data?.personalEmail || ''} source="employee" />
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
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          <ReadOnlyWithWmsLink label="Street Address" value={data?.homeStreet || ''} contactId={data?.contactId} />
          <ReadOnlyWithWmsLink label="Address Line 2" value={data?.homeAddress2 || ''} contactId={data?.contactId} />
          <ReadOnlyWithWmsLink label="City" value={data?.homeCity || ''} contactId={data?.contactId} />
          <ReadOnlyWithWmsLink label="State" value={data?.homeState || ''} contactId={data?.contactId} />
          <ReadOnlyWithWmsLink label="Postal Code" value={data?.homePostalCode || ''} contactId={data?.contactId} />
          <ReadOnlyWithWmsLink label="Country" value={data?.homeCountry || ''} contactId={data?.contactId} />
        </div>
      </SectionCard>

      {/* Emergency Contact */}
      <SectionCard title="Emergency Contact" icon={<User className="h-4 w-4 text-ems-coral" />}>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          <ReadOnlyWithWmsLink label="First Name" value={data?.emergencyFirstName || ''} source="employee" contactId={data?.contactId} />
          <ReadOnlyWithWmsLink label="Last Name" value={data?.emergencyLastName || ''} source="employee" contactId={data?.contactId} />
          <ReadOnlyWithWmsLink label="Email" value={data?.emergencyEmail || ''} source="employee" contactId={data?.contactId} />
          <ReadOnlyWithWmsLink label="Cell Phone" value={data?.emergencyCellPhone || ''} source="employee" contactId={data?.contactId} />
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Employment Tab ───────────────────────────────────────────────────────────

function EmploymentTab({ user, isAdmin, addToast }: { user: UserProfileUser; isAdmin: boolean; addToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void }) {
  // ── Fetch existing employment profile ─────────────────────────────────────
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ['employee-employment-profile', user.email],
    queryFn: () => fetchEmployeeEmploymentProfile(user.email),
    enabled: !!user.email,
    staleTime: 30_000,
  });

  const saveWorkAuthLink = useCallback(async (url: string) => {
    try {
      await updateEmployeeEmploymentProfile(user.email, { workAuthorizationLinkUrl: url || null });
      queryClient.invalidateQueries({ queryKey: ['employee-employment-profile', user.email] });
      addToast?.('Work Authorization Photos link saved.', 'success');
    } catch (e) {
      addToast?.(friendlyApiError(e, 'Could not save link.'), 'error');
    }
  }, [user.email, queryClient, addToast]);

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
      <EntraSyncBanner
        email={user.email}
        tabFields={[
          'email',
          'title', 'department', 'accessLevel', 'office', 'workstation', 'workAuthorization',
          'workAuthorizationLink',
          'role',
          'officeAddressStreet1', 'officeAddressStreet2', 'officeAddressCity', 'officeAddressState', 'officeAddressZip', 'officeAddressCountry',
          'departmentRank', 'startDate', 'supervisor', 'ptoAccrualRate',
          'employmentAgreement', 'rampAccount', 'rampCreditCard', 'employmentType',
        ]}
        invalidateKeys={[['employee-employment-profile', user.email], ['employee-personal-profile', user.email]]}
      />
      {profileQuery.isFetching && !profileQuery.isLoading && <RefetchingBanner />}
      {/* Directory Info */}
      <SectionCard title="Directory Info" icon={<Briefcase className="h-4 w-4 text-ems-accent" />}>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Title" value={data?.title || ''} source="ems" />
          <ReadOnlyField label="Work Email" value={data?.workEmail || ''} source="ems" />
          <ReadOnlyField label="Department" value={data?.department || ''} source="ems" />
          <ReadOnlyField label="Office" value={data?.office || ''} source="ems" />
          <ReadOnlyField label="Department Rank" value={data?.departmentRank || ''} source="admin" />
          <ReadOnlyField label="Role" value={data?.role || ''} source="admin" />
        </div>
      </SectionCard>

      {/* Employment Details */}
      <SectionCard title="Employment Details" icon={<Briefcase className="h-4 w-4 text-ems-blue" />}>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {isAdmin && <ReadOnlyField label="Access Level" value={data?.accessLevel || ''} source="admin" />}
          {isAdmin && <ReadOnlyField label="Work Authorization" value={data?.workAuthorization || ''} source="admin" />}
          {isAdmin && <EditableLinkField label="Work Authorization Photos" value={data?.workAuthorizationLinkUrl || ''} onSave={saveWorkAuthLink} />}
          <ReadOnlyWithWmsLink label="Workstation" value={data?.workstation || ''} source="admin" contactId={data?.contactId} />
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
          <ReadOnlyField label="Employment Type" value={data?.employmentType || ''} source="admin" />
        </div>
      </SectionCard>

      {/* Office Address */}
      <SectionCard title="Office Address" icon={<MapPin className="h-4 w-4 text-ems-accent" />}>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Street Address" value={data?.officeStreet || ''} source="admin" />
          <ReadOnlyField label="Address Line 2" value={data?.officeAddress2 || ''} source="admin" />
          <ReadOnlyField label="City" value={data?.officeCity || ''} source="admin" />
          <ReadOnlyField label="State" value={data?.officeState || ''} source="admin" />
          <ReadOnlyField label="Postal Code" value={data?.officePostalCode || ''} source="admin" />
          <ReadOnlyField label="Country" value={data?.officeCountry || ''} source="admin" />
        </div>
      </SectionCard>

    </div>
  );
}

// ─── Property Tab ─────────────────────────────────────────────────────────────

function PropertyTab({ user, isAdmin }: { user: UserProfileUser; isAdmin: boolean; addToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void }) {
  const profileQuery = useQuery({
    queryKey: ['employee-employment-profile', user.email],
    queryFn: () => fetchEmployeeEmploymentProfile(user.email),
    enabled: !!user.email,
    staleTime: 30_000,
  });

  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading property assignments…
      </div>
    );
  }

  const data = profileQuery.data;

  return (
    <div className="space-y-4">
      <EntraSyncBanner
        email={user.email}
        tabFields={[
          'deskPhoneExtension', 'deskPhoneMac', 'deskPhoneBrand', 'deskPhoneModel',
          'pcServiceTag', 'pcWindowsName', 'pcBrand', 'pcModel', 'bluetoothStatus',
          'pcDeviceType', 'pcNotes', 'pcEquipmentStatus', 'pcIsManagedByIT',
        ]}
        invalidateKeys={[['employee-employment-profile', user.email], ['employee-personal-profile', user.email]]}
      />
      {profileQuery.isFetching && !profileQuery.isLoading && <RefetchingBanner />}
      <SectionCard title="Desk Phone" icon={<Laptop className="h-4 w-4 text-ems-accent" />}>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          <ReadOnlyWithWmsLink label="Desk Phone Number" value="(312) 274-1800" source="admin" contactId={data?.contactId} />
          <ReadOnlyWithWmsLink label="Desk Phone Extension" value={data?.deskPhoneExtension || ''} source="inventory" contactId={data?.contactId} />
          <ReadOnlyWithWmsLink label="Desk Phone MAC Address" value={data?.deskPhoneMac || ''} source="inventory" contactId={data?.contactId} />
          <ReadOnlyWithWmsLink label="Desk Phone Brand" value={data?.deskPhoneBrand || ''} source="inventory" contactId={data?.contactId} />
          <ReadOnlyWithWmsLink label="Desk Phone Model" value={data?.deskPhoneModel || ''} source="inventory" contactId={data?.contactId} />
        </div>
      </SectionCard>

      <SectionCard title="PC" icon={<Laptop className="h-4 w-4 text-ems-blue" />}>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          <ReadOnlyWithWmsLink label="PC Service Tag" value={data?.pcServiceTag || ''} source="inventory" contactId={data?.contactId} />
          <ReadOnlyWithWmsLink label="PC Brand" value={data?.pcBrand || ''} source="inventory" contactId={data?.contactId} />
          <ReadOnlyWithWmsLink label="PC Model" value={data?.pcModel || ''} source="inventory" contactId={data?.contactId} />
          <ReadOnlyWithWmsLink label="Bluetooth Status" value={data?.bluetoothStatus || ''} source="inventory" contactId={data?.contactId} />
          <ReadOnlyWithWmsLink label="PC Windows Name" value={data?.pcWindowsName || ''} source="inventory" contactId={data?.contactId} />
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Licenses & Groups Tab ────────────────────────────────────────────────────

function LicensesGroupsTab({ user }: { user: UserProfileUser }) {
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

  if (licensesQuery.isLoading && groupsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading licenses & groups…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Software Assets" icon={<KeyRound className="h-4 w-4 text-ems-accent" />}>
        <ReadOnlyField
          label="Microsoft Office License"
          value={licensesQuery.isLoading ? 'Loading…' : licensesQuery.data?.length ? licensesQuery.data.join(', ') : 'None'}
          source="entra"
        />
      </SectionCard>

      <SectionCard title="Group Membership" icon={<Users className="h-4 w-4 text-ems-blue" />}>
        <ReadOnlyField
          label="Microsoft Group Membership"
          value={groupsQuery.isLoading ? 'Loading…' : groupsQuery.data?.length ? groupsQuery.data.join(', ') : 'None'}
          source="entra"
        />
      </SectionCard>
    </div>
  );
}

// ─── Health Insurance Tab ─────────────────────────────────────────────────────

function InsuranceSection({
  title,
  icon,
  insuranceType,
  optIn,
  setOptIn,
  planId,
  setPlanId,
  plans,
  additionalInsureds,
  setAdditionalInsureds,
  planPrice,
  setPlanPrice,
  planBenefits,
  setPlanBenefits,
  monthlyRate,
  setMonthlyRate,
  payrollDeduction,
  setPayrollDeduction,
  companyContribution,
  setCompanyContribution,
  tenureTier,
  companyContribPP,
  benchmarkBiweekly,
  showAdditional,
}: {
  title: string;
  icon: React.ReactNode;
  insuranceType: string;
  optIn: string;
  setOptIn: (v: string) => void;
  planId: string;
  setPlanId: (v: string) => void;
  plans: HealthPlanOption[];
  additionalInsureds?: string;
  setAdditionalInsureds?: (v: string) => void;
  planPrice: string;
  setPlanPrice?: (v: string) => void;
  planBenefits: string;
  setPlanBenefits?: (v: string) => void;
  monthlyRate?: string;
  setMonthlyRate?: (v: string) => void;
  payrollDeduction?: string;
  setPayrollDeduction?: (v: string) => void;
  companyContribution?: string;
  setCompanyContribution?: (v: string) => void;
  tenureTier?: '<1 yr' | '1+ yr' | null;
  companyContribPP?: number;
  benchmarkBiweekly?: number;
  showAdditional?: boolean;
}) {
  const typePlans = plans.filter((p) => p.planType === insuranceType);

  const coverageOptions = useMemo(() => {
    if (!planId) return [];
    const plan = plans.find((p) => String(p.healthPlanId) === planId);
    if (!plan) return [];
    const bases = new Set<string>();
    for (const p of plan.pricing) {
      const base = p.coverageType.replace(/\s*\(<1 yr\)|\s*\(1\+ yr\)/g, '');
      bases.add(base);
    }
    return Array.from(bases).sort();
  }, [planId, plans]);

  const recalcPricing = useCallback((currentPlanId: string, currentAdditionalInsureds?: string) => {
    if (!currentPlanId) {
      setPlanPrice?.('');
      setPlanBenefits?.('');
      setPayrollDeduction?.('');
      setMonthlyRate?.('');
      setCompanyContribution?.('');
      return;
    }
    const plan = plans.find((p) => String(p.healthPlanId) === currentPlanId);
    if (plan) {
      setPlanBenefits?.(plan.benefits.join('; '));

      let base = currentAdditionalInsureds || 'Employee';
      if (base === 'Employee Only') base = 'Employee';
      else if (base === 'Spouse') base = 'Employee + Spouse';
      else if (base === 'Child' || base === 'Children') base = 'Employee + Child(ren)';
      else if (base === 'N/A') base = 'Employee';

      const coverageType = tenureTier ? `${base} (${tenureTier})` : base;

      let priceEntry = plan.pricing.find((p) => p.coverageType === coverageType);
      if (!priceEntry) {
        const baseLower = base.toLowerCase();
        const candidates = plan.pricing.filter((p) =>
          p.coverageType.replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase() === baseLower,
        );
        if (candidates.length === 1) {
          priceEntry = candidates[0];
        } else if (candidates.length > 1) {
          const marker = tenureTier === '<1 yr' ? '<1' : '1+';
          priceEntry = candidates.find((p) => p.coverageType.includes(marker)) ?? candidates[0];
        }
        if (!priceEntry) {
          const altMap: Record<string, string> = {
            'family': 'employee + family',
            'employee + family': 'family',
            'children': 'employee + children',
            'employee + children': 'children',
            'child': 'employee + child',
            'employee + child': 'child',
          };
          const alt = altMap[baseLower];
          if (alt) {
            const altCandidates = plan.pricing.filter((p) =>
              p.coverageType.replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase() === alt,
            );
            priceEntry = altCandidates[0];
          }
        }
      }

      if (priceEntry) {
        const empMonthly = priceEntry.monthlyPremium;
        setPlanPrice?.(`$${empMonthly.toFixed(2)}/mo`);
        setMonthlyRate?.(`$${empMonthly.toFixed(2)}/mo`);

        const rules = plan.contributionRules ?? [];
        let employerPct = 0;
        if (rules.length > 0 && tenureTier) {
          const match = rules.find((r) => {
            const t = r.tenureTier.toLowerCase();
            if (tenureTier === '1+ yr') return t.startsWith('1+');
            if (tenureTier === '<1 yr') return t.includes('less than') || t.includes('<1');
            return false;
          });
          if (match) employerPct = match.employerContributionPct;
        }
        const planPriceBiweekly = (empMonthly * 12) / 26;
        const employerPerPP = employerPct * (benchmarkBiweekly ?? 0);
        const employerApplied = Math.min(employerPerPP, planPriceBiweekly);
        const payrollDed = Math.round((planPriceBiweekly - employerApplied) * 100) / 100;
        setPayrollDeduction?.(`$${payrollDed.toFixed(2)}/pay period`);
        setCompanyContribution?.(`$${employerApplied.toFixed(2)}/pay period`);
      } else {
        setPlanPrice?.('');
        setMonthlyRate?.('');
        setPayrollDeduction?.('');
        setCompanyContribution?.('');
      }
    }
  }, [plans, tenureTier, benchmarkBiweekly, setPlanPrice, setPlanBenefits, setPayrollDeduction, setMonthlyRate, setCompanyContribution]);

  useEffect(() => {
    if (planId) recalcPricing(planId, additionalInsureds);
  }, [additionalInsureds]);

  const handlePlanChange = (newPlanId: string) => {
    setPlanId(newPlanId);
    recalcPricing(newPlanId, additionalInsureds);
  };

  return (
    <SectionCard title={title} icon={icon}>
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
        <SelectField
          label={`${insuranceType} Insurance Opt-In / Opt-Out`}
          value={optIn}
          onChange={(v) => {
            setOptIn(v);
            if (v === 'Opt-Out') setPlanId('');
          }}
          options={[
            { value: 'Opt-In', label: 'Opt-In' },
            { value: 'Opt-Out', label: 'Opt-Out' },
          ]}
          source="admin"
        />
        <SelectField
          label="Chosen Plan"
          value={planId}
          onChange={handlePlanChange}
          disabled={optIn !== 'Opt-In'}
          options={[
            ...typePlans.map((p) => ({ value: String(p.healthPlanId), label: p.planName })),
            { value: '', label: 'Declined' },
          ]}
          source="admin"
        />
        <ReadOnlyField label="Plan Price" value={optIn !== 'Opt-In' ? '—' : (planPrice || '— From Pricing Table —')} source="calculated" />
        <ReadOnlyField label="Plan Benefits" value={optIn !== 'Opt-In' ? '—' : (planBenefits || '— From Benefits Table —')} source="calculated" />
        {monthlyRate !== undefined && (
          <ReadOnlyField label="Monthly Rate" value={optIn !== 'Opt-In' ? '—' : (monthlyRate || '— From Pricing Table —')} source="calculated" />
        )}
        {showAdditional && setAdditionalInsureds && (
          <SelectField
            label="Additional Insureds"
            value={additionalInsureds || ''}
            onChange={(v) => { setAdditionalInsureds(v); }}
            options={coverageOptions.map((ct) => ({ value: ct, label: ct }))}
            disabled={optIn !== 'Opt-In'}
            source="admin"
          />
        )}
        {showAdditional && payrollDeduction !== undefined && (
          <ReadOnlyField label="Payroll Deduction" value={optIn !== 'Opt-In' ? '—' : (payrollDeduction || '—')} source="calculated" />
        )}
        {showAdditional && companyContribution !== undefined && (
          <ReadOnlyField label="Company Contribution Per Pay Period" value={optIn !== 'Opt-In' ? '—' : (companyContribution || '—')} source="calculated" />
        )}
      </div>
    </SectionCard>
  );
}

function HealthInsuranceTab({ user, isAdmin, addToast }: { user: UserProfileUser; isAdmin: boolean; addToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void }) {
  const qc = useQueryClient();

  const insuranceQuery = useQuery({
    queryKey: ['employee-health-insurance', user.email],
    queryFn: () => fetchEmployeeHealthInsurance(user.email),
    enabled: !!user.email,
    staleTime: 30_000,
  });

  const [healthOptIn, setHealthOptIn] = useState('');
  const [healthPlanId, setHealthPlanId] = useState('');
  const [additionalInsureds, setAdditionalInsureds] = useState('');
  const [dentalOptIn, setDentalOptIn] = useState('');
  const [dentalPlanId, setDentalPlanId] = useState('');
  const [dentalAdditionalInsureds, setDentalAdditionalInsureds] = useState('');
  const [visionOptIn, setVisionOptIn] = useState('');
  const [visionPlanId, setVisionPlanId] = useState('');
  const [visionAdditionalInsureds, setVisionAdditionalInsureds] = useState('');

  const [healthPrice, setHealthPrice] = useState('');
  const [healthBenefits, setHealthBenefits] = useState('');
  const [healthRate, setHealthRate] = useState('');
  const [healthDeduction, setHealthDeduction] = useState('');
  const [dentalPrice, setDentalPrice] = useState('');
  const [dentalBenefits, setDentalBenefits] = useState('');
  const [dentalDeduction, setDentalDeduction] = useState('');
  const [visionPrice, setVisionPrice] = useState('');
  const [visionBenefits, setVisionBenefits] = useState('');
  const [visionDeduction, setVisionDeduction] = useState('');
  const [healthCompanyContrib, setHealthCompanyContrib] = useState('');
  const [dentalCompanyContrib, setDentalCompanyContrib] = useState('');
  const [visionCompanyContrib, setVisionCompanyContrib] = useState('');

  const populateForm = useCallback((data: EmployeeHealthInsurance) => {
    const health = data.elections.find((e) => e.insuranceType === 'Medical');
    const dental = data.elections.find((e) => e.insuranceType === 'Dental');
    const vision = data.elections.find((e) => e.insuranceType === 'Vision');

    const normTier = (v: string | undefined) => {
      const t = v || '';
      return t === 'Employee Only' ? 'Employee' : t;
    };

    setHealthOptIn(health?.optInStatus || '');
    setHealthPlanId(health?.healthPlanId ? String(health.healthPlanId) : '');
    setAdditionalInsureds(normTier(health?.additionalInsureds));
    setHealthPrice(health?.planPrice || '');
    setHealthBenefits(health?.planBenefits || '');
    setHealthRate(health?.monthlyRate || '');
    setHealthDeduction(health?.payrollDeduction || '');

    setDentalOptIn(dental?.optInStatus || '');
    setDentalPlanId(dental?.healthPlanId ? String(dental.healthPlanId) : '');
    setDentalAdditionalInsureds(normTier(dental?.additionalInsureds));
    setDentalPrice(dental?.planPrice || '');
    setDentalBenefits(dental?.planBenefits || '');
    setDentalDeduction(dental?.payrollDeduction || '');

    setVisionOptIn(vision?.optInStatus || '');
    setVisionPlanId(vision?.healthPlanId ? String(vision.healthPlanId) : '');
    setVisionAdditionalInsureds(normTier(vision?.additionalInsureds));
    setVisionPrice(vision?.planPrice || '');
    setVisionBenefits(vision?.planBenefits || '');
    setVisionDeduction(vision?.payrollDeduction || '');
  }, []);

  useEffect(() => {
    if (insuranceQuery.data) populateForm(insuranceQuery.data);
  }, [insuranceQuery.data, populateForm]);

  const saveMutation = useMutation({
    mutationFn: (payload: BulkUpdateHealthInsuranceRequest) =>
      bulkUpdateHealthInsurance(user.email, payload),
    onSuccess: (data) => {
      qc.setQueryData(['employee-health-insurance', user.email], data);
      populateForm(data);
      addToast?.('Health insurance saved.', 'success');
    },
    onError: (error) => {
      addToast?.(friendlyApiError(error, 'Could not save health insurance.'), 'error');
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      medical: {
        optInStatus: healthOptIn || null,
        healthPlanId: healthPlanId ? Number(healthPlanId) : null,
        additionalInsureds: additionalInsureds || null,
      },
      dental: {
        optInStatus: dentalOptIn || null,
        healthPlanId: dentalPlanId ? Number(dentalPlanId) : null,
        additionalInsureds: dentalAdditionalInsureds || null,
      },
      vision: {
        optInStatus: visionOptIn || null,
        healthPlanId: visionPlanId ? Number(visionPlanId) : null,
        additionalInsureds: visionAdditionalInsureds || null,
      },
    });
  };

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

  const plans = insuranceQuery.data?.plans ?? [];
  const insuranceEligibility = insuranceQuery.data?.insuranceEligibility ?? 'Ineligible';
  const tenureTier = insuranceQuery.data?.tenureTier ?? null;
  const companyContribPP = insuranceQuery.data?.companyContributionPerPayPeriod ?? 0;

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <SectionCard title="Health Insurance Information" icon={<Heart className="h-4 w-4 text-ems-coral" />}>
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Health Insurance Status" value={insuranceEligibility} source="calculated" />
            <ReadOnlyField label="Tenure Tier" value={tenureTier || '—'} source="calculated" />
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SavingOverlay visible={saveMutation.isPending} />
      <SectionCard title="Health Insurance Information" icon={<Heart className="h-4 w-4 text-ems-coral" />}>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Health Insurance Status" value={insuranceEligibility} source="calculated" />
          <ReadOnlyField label="Tenure Tier" value={tenureTier || '—'} source="calculated" />
        </div>
      </SectionCard>

      <InsuranceSection
        title="Medical Insurance"
        icon={<Heart className="h-4 w-4 text-ems-coral" />}
        insuranceType="Medical"
        optIn={healthOptIn}
        setOptIn={setHealthOptIn}
        planId={healthPlanId}
        setPlanId={setHealthPlanId}
        plans={plans}
        additionalInsureds={additionalInsureds}
        setAdditionalInsureds={setAdditionalInsureds}
        planPrice={healthPrice}
        setPlanPrice={setHealthPrice}
        planBenefits={healthBenefits}
        setPlanBenefits={setHealthBenefits}
        monthlyRate={healthRate}
        setMonthlyRate={setHealthRate}
        payrollDeduction={healthDeduction}
        setPayrollDeduction={setHealthDeduction}
        companyContribution={healthCompanyContrib}
        setCompanyContribution={setHealthCompanyContrib}
        tenureTier={tenureTier}
        companyContribPP={companyContribPP}
        benchmarkBiweekly={insuranceQuery.data?.benchmarkBiweekly ?? 0}
        showAdditional
      />

      <InsuranceSection
        title="Dental Insurance"
        icon={<Heart className="h-4 w-4 text-ems-blue" />}
        insuranceType="Dental"
        optIn={dentalOptIn}
        setOptIn={setDentalOptIn}
        planId={dentalPlanId}
        setPlanId={setDentalPlanId}
        plans={plans}
        additionalInsureds={dentalAdditionalInsureds}
        setAdditionalInsureds={setDentalAdditionalInsureds}
        planPrice={dentalPrice}
        setPlanPrice={setDentalPrice}
        planBenefits={dentalBenefits}
        setPlanBenefits={setDentalBenefits}
        payrollDeduction={dentalDeduction}
        setPayrollDeduction={setDentalDeduction}
        tenureTier={tenureTier}
        companyContribPP={companyContribPP}
        benchmarkBiweekly={insuranceQuery.data?.benchmarkBiweekly ?? 0}
        showAdditional
      />

      <InsuranceSection
        title="Vision Insurance"
        icon={<Heart className="h-4 w-4 text-ems-green" />}
        insuranceType="Vision"
        optIn={visionOptIn}
        setOptIn={setVisionOptIn}
        planId={visionPlanId}
        setPlanId={setVisionPlanId}
        plans={plans}
        additionalInsureds={visionAdditionalInsureds}
        setAdditionalInsureds={setVisionAdditionalInsureds}
        planPrice={visionPrice}
        setPlanPrice={setVisionPrice}
        planBenefits={visionBenefits}
        setPlanBenefits={setVisionBenefits}
        payrollDeduction={visionDeduction}
        setPayrollDeduction={setVisionDeduction}
        tenureTier={tenureTier}
        companyContribPP={companyContribPP}
        benchmarkBiweekly={insuranceQuery.data?.benchmarkBiweekly ?? 0}
        showAdditional
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-ems-accent px-4 py-2 text-sm font-medium text-white hover:bg-ems-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saveMutation.isPending ? 'Saving…' : 'Save Health Insurance'}
        </button>
      </div>
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
