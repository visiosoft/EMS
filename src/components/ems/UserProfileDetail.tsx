import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, Briefcase, Heart, Star, Award, Lock, MapPin, Loader2, Save, Eye, EyeOff } from 'lucide-react';
import {
  fetchEmployeePersonalProfile,
  updateEmployeePersonalProfile,
  type EmployeePersonalProfile,
  type UpdateEmployeePersonalProfileRequest,
} from '@/api/employeeProfileApi';
import {
  fetchEmployeeEmploymentProfile,
  updateEmployeeEmploymentProfile,
  fetchWorkstations,
  fetchPhoneExtensions,
  fetchPhoneDevices,
  fetchPcDevices,
  fetchUserLicenses,
  fetchUserGroups,
  type EmployeeEmploymentProfile,
  type UpdateEmployeeEmploymentProfileRequest,
} from '@/api/employeeEmploymentApi';
import {
  fetchEmployeeHealthInsurance,
  updateEmployeeHealthInsurance,
  type EmployeeHealthInsurance,
  type UpdateEmployeeHealthInsuranceRequest,
  type HealthPlanOption,
} from '@/api/employeeHealthInsuranceApi';
import {
  fetchEmployeeExperience,
} from '@/api/employeeExperienceApi';
import { fetchEmployeeCertifications } from '@/api/employeeCertificationsApi';
import { fetchIaeStaffEmployees } from '@/api/iaeEmployeesApi';
import {
  fetchMyProfile,
  updateMyProfile,
  type MyProfile,
  type UpdateMyProfileRequest,
} from '@/api/myProfileApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { useAddressAutofill } from '@/hooks/useAddressAutofill';
import { getActiveAccount, getAccountEmail } from '@/auth/entra';
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

function EditableField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled,
  source,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  source?: DataSource;
  maxLength?: number;
}) {
  const isEntra = source === 'entra';
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-text-muted">{label}</label>
        {isEntra && <SourceBadge source={source!} />}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        autoComplete="off"
        className={`w-full rounded-md border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-ems-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${isEntra ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-white/5'}`}
      />
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
        {isEntra && <SourceBadge source={source!} />}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full rounded-md border border-border px-3 py-2 text-sm text-text-primary focus:border-ems-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${isEntra ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-white/5'}`}
      >
        <option value="">— Select —</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

/** Full-screen saving overlay */
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

/** An editable field that masks its value by default with a Show/Hide toggle button */
function HashedEditableField({
  label,
  value,
  onChange,
  placeholder,
  source,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  source?: DataSource;
  maxLength?: number;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-text-muted">{label}</label>
        {source && <SourceBadge source={source} />}
      </div>
      <div className="flex items-center gap-2">
        {revealed ? (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            autoComplete="one-time-code"
            name="ssn_field_no_autofill"
            className="flex-1 rounded-md border border-border bg-white dark:bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-ems-accent focus:outline-none"
          />
        ) : (
          <div
            className="flex-1 rounded-md border border-border bg-white dark:bg-white/5 px-3 py-2 text-sm text-text-secondary cursor-text"
            onClick={() => setRevealed(true)}
          >
            {value ? '••••••••' : <span className="text-text-muted">{placeholder || '—'}</span>}
          </div>
        )}
        <button
          type="button"
          onClick={() => setRevealed(!revealed)}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-2 text-xs font-medium text-text-secondary hover:bg-hover transition-colors"
          title={revealed ? 'Hide' : 'Show'}
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {revealed ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ user, addToast }: { user: UserProfileUser; addToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void }) {
  const qc = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['my-profile'],
    queryFn: fetchMyProfile,
    staleTime: 30_000,
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [workPhone, setWorkPhone] = useState('');

  const populateForm = useCallback((data: MyProfile) => {
    setFirstName(data.firstName || '');
    setLastName(data.lastName || '');
    setDepartment(data.departmentName || '');
    setMobilePhone(data.cellPhone || '');
    setWorkPhone(data.workPhone || '');
  }, []);

  useEffect(() => {
    if (profileQuery.data) populateForm(profileQuery.data);
  }, [profileQuery.data, populateForm]);

  const saveMutation = useMutation({
    mutationFn: (payload: UpdateMyProfileRequest) => updateMyProfile(payload),
    onSuccess: (data) => {
      qc.setQueryData(['my-profile'], data);
      populateForm(data);
      addToast?.('Profile saved.', 'success');
    },
    onError: (error) => {
      addToast?.(friendlyApiError(error, 'Could not save profile.'), 'error');
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      firstName,
      lastName,
      cellPhone: mobilePhone,
      workPhone,
      departmentName: department,
    });
  };

  const handleReset = () => {
    if (profileQuery.data) populateForm(profileQuery.data);
  };

  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading profile…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SavingOverlay visible={saveMutation.isPending} />
      <SectionCard title="Profile" icon={<User className="h-4 w-4 text-ems-accent" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <EditableField label="First Name *" value={firstName} onChange={setFirstName} source="ems" maxLength={100} />
          <EditableField label="Last Name" value={lastName} onChange={setLastName} source="ems" maxLength={100} />
          <ReadOnlyField label="Email" value={user.email} source="entra" />
          <EditableField label="Department *" value={department} onChange={setDepartment} source="ems" maxLength={100} />
          <ReadOnlyField label="Roles" value={profileQuery.data?.roleNames?.join(', ') || ''} source="ems" />
          <EditableField label="Mobile Phone" value={mobilePhone} onChange={setMobilePhone} source="ems" maxLength={30} />
          <EditableField label="Work Phone" value={workPhone} onChange={setWorkPhone} source="ems" maxLength={30} />
        </div>
      </SectionCard>

      {/* Save / Reset Bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-hover transition-colors"
        >
          Reset
        </button>
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
          {saveMutation.isPending ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}

// ─── Personal Tab ─────────────────────────────────────────────────────────────

function PersonalTab({ user, isAdmin, addToast }: { user: UserProfileUser; isAdmin: boolean; addToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void }) {
  const qc = useQueryClient();

  // Determine if the logged-in user is viewing their own profile
  const currentUserEmail = getAccountEmail(getActiveAccount()) || '';
  const isSelf = currentUserEmail.toLowerCase() === user.email.toLowerCase();
  const canEditPersonal = isAdmin || isSelf;

  // ── Fetch existing profile ────────────────────────────────────────────────
  const profileQuery = useQuery({
    queryKey: ['employee-personal-profile', user.email],
    queryFn: () => fetchEmployeePersonalProfile(user.email),
    enabled: !!user.email,
    staleTime: 30_000,
  });

  // ── Local form state ──────────────────────────────────────────────────────
  const [middleName, setMiddleName] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [ssn, setSsn] = useState('');
  const [homeAddress, setHomeAddress] = useState({
    street: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  });
  const [emergencyContact, setEmergencyContact] = useState({
    firstName: '',
    lastName: '',
    email: '',
    cellPhone: '',
  });

  // ── Sync fetched data into form state ─────────────────────────────────────
  const populateForm = useCallback((data: EmployeePersonalProfile) => {
    setMiddleName(data.middleName || '');
    setPersonalEmail(data.personalEmail || '');
    setBirthDate(data.birthDate || '');
    setSsn(data.ssn || '');
    setHomeAddress({
      street: data.homeStreet || '',
      address2: data.homeAddress2 || '',
      city: data.homeCity || '',
      state: data.homeState || '',
      postalCode: data.homePostalCode || '',
      country: data.homeCountry || '',
    });
    setEmergencyContact({
      firstName: data.emergencyFirstName || '',
      lastName: data.emergencyLastName || '',
      email: data.emergencyEmail || '',
      cellPhone: data.emergencyCellPhone || '',
    });
  }, []);

  useEffect(() => {
    if (profileQuery.data) populateForm(profileQuery.data);
  }, [profileQuery.data, populateForm]);

  // ── Save mutation ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (payload: UpdateEmployeePersonalProfileRequest) =>
      updateEmployeePersonalProfile(user.email, payload),
    onSuccess: (data) => {
      qc.setQueryData(['employee-personal-profile', user.email], data);
      populateForm(data);
      addToast?.('Personal profile saved.', 'success');
    },
    onError: (error) => {
      addToast?.(friendlyApiError(error, 'Could not save profile.'), 'error');
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      middleName: middleName || null,
      personalEmail: personalEmail || null,
      birthDate: birthDate || null,
      ssn: ssn || null,
      homeStreet: homeAddress.street || null,
      homeAddress2: homeAddress.address2 || null,
      homeCity: homeAddress.city || null,
      homeState: homeAddress.state || null,
      homePostalCode: homeAddress.postalCode || null,
      homeCountry: homeAddress.country || null,
      emergencyFirstName: emergencyContact.firstName || null,
      emergencyLastName: emergencyContact.lastName || null,
      emergencyEmail: emergencyContact.email || null,
      emergencyCellPhone: emergencyContact.cellPhone || null,
    });
  };

  const age = birthDate ? calculateAge(birthDate) : null;

  // ── Address autofill (Google Places) ──────────────────────────────────────
  const homeAutofill = useAddressAutofill({
    value: {
      street: homeAddress.street,
      city: homeAddress.city,
      state: homeAddress.state,
      postalCode: homeAddress.postalCode,
      country: '', // keep unrestricted — allow searching any country
    },
    onPatch: (patch) => {
      setHomeAddress((prev) => ({ ...prev, ...patch }));
    },
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

  return (
    <div className="space-y-4">
      <SavingOverlay visible={saveMutation.isPending} />
      {/* Basic Info */}
      <SectionCard title="Basic Information" icon={<User className="h-4 w-4 text-ems-accent" />}>
        <div className="grid gap-4 md:grid-cols-3">
          <ReadOnlyField label="First Name" value={user.name.split(' ')[0] || ''} source="entra" />
          <EditableField label="Middle Name" value={middleName} onChange={setMiddleName} placeholder="Enter middle name" source="employee" maxLength={100} />
          <ReadOnlyField label="Last Name" value={user.name.split(' ').slice(1).join(' ') || ''} source="entra" />
          {canEditPersonal && (
            <EditableField label="Personal Email" value={personalEmail} onChange={setPersonalEmail} type="text" placeholder="personal@example.com" source="employee" maxLength={254} />
          )}
          <ReadOnlyField label="Cell Phone Number" value={user.mobilePhone || ''} source="entra" />
          <EditableField label="Birth Date" value={birthDate} onChange={setBirthDate} type="date" source="employee" />
          {canEditPersonal && (
            <HashedEditableField label="Social Security Number" value={ssn} onChange={setSsn} placeholder="•••-••-••••" source="employee" maxLength={11} />
          )}
          {isAdmin && (
            age !== null ? (
              <HashedField label="Age" value={`${age} years`} source="calculated" />
            ) : (
              <ReadOnlyField label="Age" value="Enter birth date" source="calculated" />
            )
          )}
        </div>
      </SectionCard>

      {/* Home Address (Admin or Self) */}
      {canEditPersonal && (
      <SectionCard title="Home Address" icon={<MapPin className="h-4 w-4 text-ems-accent" />}>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Street Address with Google Places autocomplete */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-text-muted">Street Address</label>
            </div>
            <div className="relative">
              <input
                type="text"
                value={homeAddress.street}
                onChange={(e) => setHomeAddress((prev) => ({ ...prev, street: e.target.value }))}
                onFocus={homeAutofill.onStreetFocus}
                onBlur={homeAutofill.onStreetBlur}
                placeholder="Start typing to search…"
                className="w-full rounded-md border border-border bg-white dark:bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-ems-accent focus:outline-none"
              />
              {homeAutofill.showSuggestions && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-48 overflow-auto">
                  {homeAutofill.suggestions.map((suggestion) => (
                    <button
                      key={suggestion.placeId}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-hover"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        homeAutofill.selectSuggestion(suggestion);
                      }}
                    >
                      {suggestion.description}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <EditableField
            label="Address Line 2"
            value={homeAddress.address2}
            onChange={(v) => setHomeAddress((prev) => ({ ...prev, address2: v }))}
            placeholder="Apartment, unit, etc."
            source="google"
            maxLength={200}
          />
          <EditableField
            label="City"
            value={homeAddress.city}
            onChange={(v) => setHomeAddress((prev) => ({ ...prev, city: v }))}
            source="google"
            maxLength={100}
          />
          <EditableField
            label="State"
            value={homeAddress.state}
            onChange={(v) => setHomeAddress((prev) => ({ ...prev, state: v }))}
            source="google"
            maxLength={100}
          />
          <EditableField
            label="Postal Code"
            value={homeAddress.postalCode}
            onChange={(v) => setHomeAddress((prev) => ({ ...prev, postalCode: v }))}
            source="google"
            maxLength={20}
          />
          <EditableField
            label="Country"
            value={homeAddress.country}
            onChange={(v) => setHomeAddress((prev) => ({ ...prev, country: v }))}
            source="google"
            maxLength={100}
          />
        </div>
      </SectionCard>
      )}

      {/* Emergency Contact (Admin or Self) */}
      {canEditPersonal && (
      <SectionCard title="Emergency Contact" icon={<User className="h-4 w-4 text-ems-coral" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <EditableField
            label="First Name"
            value={emergencyContact.firstName}
            onChange={(v) => setEmergencyContact((prev) => ({ ...prev, firstName: v }))}
            source="employee"
            maxLength={100}
          />
          <EditableField
            label="Last Name"
            value={emergencyContact.lastName}
            onChange={(v) => setEmergencyContact((prev) => ({ ...prev, lastName: v }))}
            source="employee"
            maxLength={100}
          />
          <EditableField
            label="Email"
            value={emergencyContact.email}
            onChange={(v) => setEmergencyContact((prev) => ({ ...prev, email: v }))}
            type="email"
            source="employee"
            maxLength={200}
          />
          <EditableField
            label="Cell Phone"
            value={emergencyContact.cellPhone}
            onChange={(v) => setEmergencyContact((prev) => ({ ...prev, cellPhone: v }))}
            source="employee"
            maxLength={30}
          />
        </div>
      </SectionCard>
      )}

      {/* Save Bar */}
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
          {saveMutation.isPending ? 'Saving…' : 'Save Personal Info'}
        </button>
      </div>
    </div>
  );
}

// ─── Employment Tab ───────────────────────────────────────────────────────────

function EmploymentTab({ user, isAdmin, addToast }: { user: UserProfileUser; isAdmin: boolean; addToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void }) {
  const qc = useQueryClient();

  // ── Fetch existing employment profile ─────────────────────────────────────
  const profileQuery = useQuery({
    queryKey: ['employee-employment-profile', user.email],
    queryFn: () => fetchEmployeeEmploymentProfile(user.email),
    enabled: !!user.email,
    staleTime: 30_000,
  });

  // ── Fetch workstation options ─────────────────────────────────────────────
  const workstationsQuery = useQuery({
    queryKey: ['workstations'],
    queryFn: fetchWorkstations,
    staleTime: 60_000,
    enabled: isAdmin,
  });

  // ── Fetch phone extension options ─────────────────────────────────────────
  const phoneExtensionsQuery = useQuery({
    queryKey: ['phone-extensions'],
    queryFn: fetchPhoneExtensions,
    staleTime: 60_000,
    enabled: isAdmin,
  });

  // ── Fetch phone device options ────────────────────────────────────────────
  const phoneDevicesQuery = useQuery({
    queryKey: ['phone-devices'],
    queryFn: fetchPhoneDevices,
    staleTime: 60_000,
    enabled: isAdmin,
  });

  // ── Fetch PC device options ───────────────────────────────────────────────
  const pcDevicesQuery = useQuery({
    queryKey: ['pc-devices'],
    queryFn: fetchPcDevices,
    staleTime: 60_000,
    enabled: isAdmin,
  });

  // ── Fetch internal employees (for Supervisor dropdown) ────────────────────
  const employeesQuery = useQuery({
    queryKey: ['iae-staff-employees'],
    queryFn: fetchIaeStaffEmployees,
    staleTime: 60_000,
    enabled: isAdmin,
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

  // ── Local form state ──────────────────────────────────────────────────────
  const [accessLevel, setAccessLevel] = useState('');
  const [workAuthorization, setWorkAuthorization] = useState('');
  const [workstation, setWorkstation] = useState('');
  const [officeAddress, setOfficeAddress] = useState({
    street: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  });
  const [deskPhoneExtension, setDeskPhoneExtension] = useState('');
  const [deskPhoneMac, setDeskPhoneMac] = useState('');
  const [deskPhoneBrand, setDeskPhoneBrand] = useState('');
  const [deskPhoneModel, setDeskPhoneModel] = useState('');
  const [pcBrand, setPcBrand] = useState('');
  const [pcModel, setPcModel] = useState('');
  const [pcServiceTag, setPcServiceTag] = useState('');
  const [bluetoothStatus, setBluetoothStatus] = useState('');
  const [pcWindowsName, setPcWindowsName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [ptoAccrualRate, setPtoAccrualRate] = useState('');
  const [employmentAgreement, setEmploymentAgreement] = useState('');
  const [rampAccount, setRampAccount] = useState('');
  const [rampCreditCard, setRampCreditCard] = useState('');
  // Track selected equipment IDs for save
  const [selectedExtensionId, setSelectedExtensionId] = useState<number | null>(null);
  const [selectedPhoneId, setSelectedPhoneId] = useState<number | null>(null);
  const [selectedComputerId, setSelectedComputerId] = useState<number | null>(null);

  // ── Sync fetched data into form ───────────────────────────────────────────
  const populateForm = useCallback((data: EmployeeEmploymentProfile) => {
    setAccessLevel(data.accessLevel || '');
    setWorkAuthorization(data.workAuthorization || '');
    setWorkstation(data.workstation || '');
    setStartDate(data.startDate || '');
    setSupervisor(data.supervisor || '');
    setPtoAccrualRate(data.ptoAccrualRate || '');
    setEmploymentAgreement(data.employmentAgreement || '');
    setRampAccount(data.rampAccount || '');
    setRampCreditCard(data.rampCreditCard || '');
    setOfficeAddress({
      street: data.officeStreet || '',
      address2: data.officeAddress2 || '',
      city: data.officeCity || '',
      state: data.officeState || '',
      postalCode: data.officePostalCode || '',
      country: data.officeCountry || '',
    });
    setDeskPhoneExtension(data.deskPhoneExtension || '');
    setDeskPhoneMac(data.deskPhoneMac || '');
    setDeskPhoneBrand(data.deskPhoneBrand || '');
    setDeskPhoneModel(data.deskPhoneModel || '');
    setPcBrand(data.pcBrand || '');
    setPcModel(data.pcModel || '');
    setPcServiceTag(data.pcServiceTag || '');
    setBluetoothStatus(data.bluetoothStatus || '');
    setPcWindowsName(data.pcWindowsName || '');
  }, []);

  useEffect(() => {
    if (profileQuery.data) populateForm(profileQuery.data);
  }, [profileQuery.data, populateForm]);

  // ── Address autofill ──────────────────────────────────────────────────────
  const officeAutofill = useAddressAutofill({
    value: {
      street: officeAddress.street,
      city: officeAddress.city,
      state: officeAddress.state,
      postalCode: officeAddress.postalCode,
      country: '',
    },
    onPatch: (patch) => {
      setOfficeAddress((prev) => ({ ...prev, ...patch }));
    },
  });

  // ── Save mutation ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (payload: UpdateEmployeeEmploymentProfileRequest) =>
      updateEmployeeEmploymentProfile(user.email, payload),
    onSuccess: (data) => {
      qc.setQueryData(['employee-employment-profile', user.email], data);
      populateForm(data);
      addToast?.('Employment profile saved.', 'success');
    },
    onError: (error) => {
      addToast?.(friendlyApiError(error, 'Could not save employment profile.'), 'error');
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      accessLevel: accessLevel || null,
      workAuthorization: workAuthorization || null,
      workstation: workstation || null,
      startDate: startDate || null,
      supervisor: supervisor || null,
      ptoAccrualRate: ptoAccrualRate || null,
      employmentAgreement: employmentAgreement || null,
      rampAccount: rampAccount || null,
      rampCreditCard: rampCreditCard || null,
      officeStreet: officeAddress.street || null,
      officeAddress2: officeAddress.address2 || null,
      officeCity: officeAddress.city || null,
      officeState: officeAddress.state || null,
      officePostalCode: officeAddress.postalCode || null,
      officeCountry: officeAddress.country || null,
      deskPhoneExtensionId: selectedExtensionId,
      deskPhoneId: selectedPhoneId,
      pcComputerId: selectedComputerId,
    });
  };

  const yearsOfService = startDate ? calculateYearsOfService(startDate) : null;

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

  return (
    <div className="space-y-4">
      <SavingOverlay visible={saveMutation.isPending} />
      {/* Entra-fed fields */}
      <SectionCard title="Entra Directory Info (Read-Only)" icon={<Briefcase className="h-4 w-4 text-ems-accent" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="Title" value={user.jobTitle || ''} source="entra" />
          <ReadOnlyField label="Work Email" value={user.email} source="entra" />
          <ReadOnlyField label="Office" value={user.officeLocation || ''} source="entra" />
          {isAdmin && (
            <ReadOnlyField
              label="Microsoft Office License"
              value={licensesQuery.isLoading ? 'Loading…' : licensesQuery.data?.length ? licensesQuery.data.join(', ') : 'None'}
              source="entra"
            />
          )}
          <div className="md:col-span-2">
            <ReadOnlyField
              label="Microsoft Group Membership"
              value={groupsQuery.isLoading ? 'Loading…' : groupsQuery.data?.length ? groupsQuery.data.join(', ') : 'None'}
              source="entra"
            />
          </div>
        </div>
      </SectionCard>

      {/* Admin-entered fields */}
      <SectionCard title="Employment Details" icon={<Briefcase className="h-4 w-4 text-ems-blue" />}>
        <div className="grid gap-4 md:grid-cols-2">
          {isAdmin && (
            <SelectField
              label="Access Level"
              value={accessLevel}
              onChange={setAccessLevel}
              options={[
                { value: 'Administrator', label: 'Administrator' },
                { value: 'Employee', label: 'Employee' },
              ]}
              source="admin"
            />
          )}
          {isAdmin && (
            <SelectField
              label="Work Authorization"
              value={workAuthorization}
              onChange={setWorkAuthorization}
              options={[
                { value: 'US Citizen', label: 'US Citizen' },
                { value: 'Foreign National with Work Authorization', label: 'Foreign National with Work Authorization' },
              ]}
              source="admin"
            />
          )}
          {/* Workstation grouped select */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-text-muted">Workstation</label>
            </div>
            <select
              value={workstation}
              onChange={(e) => setWorkstation(e.target.value)}
              disabled={!isAdmin}
              className="w-full rounded-md border border-border bg-white dark:bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ems-blue disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select workstation…</option>
              {workstationsQuery.data?.offices.map((office) => (
                <optgroup key={office.officeCode} label={office.officeCode}>
                  {office.workstations.map((ws) => (
                    <option
                      key={ws.workLocationId}
                      value={ws.locationCode}
                      disabled={ws.isAssigned}
                    >
                      {ws.locationCode}{ws.isAssigned ? ' (assigned)' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <EditableField label="Start Date at IAE" value={startDate} onChange={setStartDate} type="date" source="admin" disabled={!isAdmin} />
          {yearsOfService !== null ? (
            <ReadOnlyField label="Years of Service" value={yearsOfService} source="calculated" />
          ) : (
            <ReadOnlyField label="Years of Service" value="Enter start date" source="calculated" />
          )}
          {/* Supervisor dropdown from employee list */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-text-muted">Supervisor</label>
            </div>
            <select
              value={supervisor}
              onChange={(e) => setSupervisor(e.target.value)}
              disabled={!isAdmin}
              className="w-full rounded-md border border-border bg-white dark:bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ems-blue disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select supervisor…</option>
              {employeesQuery.data
                ?.filter((emp) => emp.email.toLowerCase() !== user.email.toLowerCase())
                .map((emp) => {
                  const fullName = `${emp.firstName} ${emp.lastName}`.trim();
                  return (
                    <option key={emp.contactId} value={fullName}>
                      {fullName}{emp.roleName ? ` — ${emp.roleName}` : ''}
                    </option>
                  );
                })}
            </select>
          </div>
          {isAdmin && (
            <EditableField label="Paid Time Off Accrual Rate (days/year)" value={ptoAccrualRate} onChange={setPtoAccrualRate} type="number" placeholder="e.g. 15" source="admin" maxLength={100} />
          )}
          {isAdmin && (
            <SelectField
              label="Employment Agreement Fully Executed"
              value={employmentAgreement}
              onChange={setEmploymentAgreement}
              options={[
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
              ]}
              source="admin"
            />
          )}
          {isAdmin && (
            <SelectField
              label="Ramp Account"
              value={rampAccount}
              onChange={setRampAccount}
              options={[
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
              ]}
              source="admin"
            />
          )}
          {isAdmin && (
            <SelectField
              label="Ramp Credit Card"
              value={rampCreditCard}
              onChange={setRampCreditCard}
              options={[
                { value: 'Assigned', label: 'Assigned' },
                { value: 'Unassigned', label: 'Unassigned' },
              ]}
              source="admin"
            />
          )}
        </div>
      </SectionCard>

      {/* Office Address */}
      <SectionCard title="Office Address" icon={<MapPin className="h-4 w-4 text-ems-accent" />}>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Street Address with Google Places autocomplete */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-text-muted">Street Address</label>
            </div>
            <div className="relative">
              <input
                type="text"
                value={officeAddress.street}
                onChange={(e) => setOfficeAddress((prev) => ({ ...prev, street: e.target.value }))}
                onFocus={officeAutofill.onStreetFocus}
                onBlur={officeAutofill.onStreetBlur}
                placeholder="Start typing to search…"
                disabled={!isAdmin}
                className="w-full rounded-md border border-border bg-white dark:bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-ems-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
              {officeAutofill.showSuggestions && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-48 overflow-auto">
                  {officeAutofill.suggestions.map((suggestion) => (
                    <button
                      key={suggestion.placeId}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-hover"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        officeAutofill.selectSuggestion(suggestion);
                      }}
                    >
                      {suggestion.description}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <EditableField
            label="Address Line 2"
            value={officeAddress.address2}
            onChange={(v) => setOfficeAddress((prev) => ({ ...prev, address2: v }))}
            placeholder="Suite, floor, etc."
            disabled={!isAdmin}
            source="google"
            maxLength={200}
          />
          <EditableField
            label="City"
            value={officeAddress.city}
            onChange={(v) => setOfficeAddress((prev) => ({ ...prev, city: v }))}
            disabled={!isAdmin}
            source="google"
            maxLength={100}
          />
          <EditableField
            label="State"
            value={officeAddress.state}
            onChange={(v) => setOfficeAddress((prev) => ({ ...prev, state: v }))}
            disabled={!isAdmin}
            source="google"
            maxLength={100}
          />
          <EditableField
            label="Postal Code"
            value={officeAddress.postalCode}
            onChange={(v) => setOfficeAddress((prev) => ({ ...prev, postalCode: v }))}
            disabled={!isAdmin}
            source="google"
            maxLength={20}
          />
          <EditableField
            label="Country"
            value={officeAddress.country}
            onChange={(v) => setOfficeAddress((prev) => ({ ...prev, country: v }))}
            disabled={!isAdmin}
            source="google"
            maxLength={100}
          />
        </div>
      </SectionCard>

      {/* Desk Phone & Equipment */}
      <SectionCard title="Desk Phone & Equipment" icon={<Briefcase className="h-4 w-4 text-ems-green" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="Desk Phone Number" value="(312) 274-1800" source="admin" />
          {/* Desk Phone Extension dropdown */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-text-muted">Desk Phone Extension</label>
            </div>
            <select
              value={deskPhoneExtension}
              onChange={(e) => {
                const extNumber = e.target.value;
                setDeskPhoneExtension(extNumber);
                const ext = phoneExtensionsQuery.data?.extensions.find(
                  (x) => x.extensionNumber === extNumber,
                );
                setSelectedExtensionId(ext?.extensionId ?? null);
              }}
              disabled={!isAdmin}
              className="w-full rounded-md border border-border bg-white dark:bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ems-blue disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select extension…</option>
              {phoneExtensionsQuery.data?.extensions.map((ext) => (
                <option
                  key={ext.extensionId}
                  value={ext.extensionNumber}
                  disabled={ext.isAssigned}
                >
                  {ext.extensionNumber}{ext.isAssigned ? ' (assigned)' : ''}
                </option>
              ))}
            </select>
          </div>
          {/* Admin-only: Desk Phone MAC dropdown */}
          {isAdmin && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-text-muted">Desk Phone MAC Address</label>
              </div>
              <select
                value={deskPhoneMac}
                onChange={(e) => {
                  const mac = e.target.value;
                  setDeskPhoneMac(mac);
                  const phone = phoneDevicesQuery.data?.phones.find(
                    (p) => p.macAddress === mac,
                  );
                  if (phone) {
                    setDeskPhoneBrand(phone.make || '');
                    setDeskPhoneModel(phone.model || '');
                    setSelectedPhoneId(phone.phoneId);
                  } else {
                    setDeskPhoneBrand('');
                    setDeskPhoneModel('');
                    setSelectedPhoneId(null);
                  }
                }}
                className="w-full rounded-md border border-border bg-white dark:bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ems-blue"
              >
                <option value="">Select phone…</option>
                {phoneDevicesQuery.data?.phones.map((phone) => (
                  <option
                    key={phone.phoneId}
                    value={phone.macAddress}
                    disabled={phone.isAssigned}
                  >
                    {phone.macAddress} — {phone.make} {phone.model}{phone.isAssigned ? ' (assigned)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          {isAdmin && <ReadOnlyField label="Desk Phone Brand" value={deskPhoneBrand || '—'} source="inventory" />}
          {isAdmin && <ReadOnlyField label="Desk Phone Model" value={deskPhoneModel || '—'} source="inventory" />}
          {/* Admin-only: PC Service Tag dropdown */}
          {isAdmin && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-text-muted">PC Service Tag</label>
              </div>
              <select
                value={pcServiceTag}
                onChange={(e) => {
                  const tag = e.target.value;
                  setPcServiceTag(tag);
                  const pc = pcDevicesQuery.data?.computers.find(
                    (c) => c.serviceTag === tag,
                  );
                  if (pc) {
                    setPcBrand(pc.make || '');
                    setPcModel(pc.model || '');
                    setBluetoothStatus(pc.bluetoothStatus || '');
                    setPcWindowsName(pc.pcName || '');
                    setSelectedComputerId(pc.computerId);
                  } else {
                    setPcBrand('');
                    setPcModel('');
                    setBluetoothStatus('');
                    setPcWindowsName('');
                    setSelectedComputerId(null);
                  }
                }}
                className="w-full rounded-md border border-border bg-white dark:bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ems-blue"
              >
                <option value="">Select PC…</option>
                {pcDevicesQuery.data?.computers.map((pc) => (
                  <option
                    key={pc.computerId}
                    value={pc.serviceTag}
                    disabled={pc.isAssigned}
                  >
                    {pc.serviceTag} — {pc.pcName}{pc.isAssigned ? ' (assigned)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          {isAdmin && <ReadOnlyField label="PC Brand" value={pcBrand || '—'} source="inventory" />}
          {isAdmin && <ReadOnlyField label="PC Model" value={pcModel || '—'} source="inventory" />}
          {isAdmin && <ReadOnlyField label="Bluetooth Status" value={bluetoothStatus || '—'} source="inventory" />}
          {isAdmin && <ReadOnlyField label="PC Windows Name" value={pcWindowsName || '—'} source="inventory" />}
        </div>
      </SectionCard>

      {/* Save Bar */}
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
          {saveMutation.isPending ? 'Saving…' : 'Save Employment Info'}
        </button>
      </div>
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
  tenureTier,
  companyContribPP,
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
  tenureTier?: '<1 yr' | '1+ yr' | null;
  companyContribPP?: number;
  showAdditional?: boolean;
}) {
  const typePlans = plans.filter((p) => p.planType === insuranceType);

  // Derive coverage options dynamically from the selected plan's pricing data
  const coverageOptions = useMemo(() => {
    if (!planId) return [];
    const plan = plans.find((p) => String(p.healthPlanId) === planId);
    if (!plan) return [];
    // Extract base coverage types (strip tenure suffix for Health plans)
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
      return;
    }
    const plan = plans.find((p) => String(p.healthPlanId) === currentPlanId);
    if (plan) {
      setPlanBenefits?.(plan.benefits.join('; '));

      // Build coverage type: use selected value directly as base
      let base = currentAdditionalInsureds || 'Employee';
      // Support legacy stored values
      if (base === 'Spouse') base = 'Employee + Spouse';
      else if (base === 'Child' || base === 'Children') base = 'Employee + Child(ren)';
      else if (base === 'Family') base = 'Employee + Family';
      else if (base === 'N/A') base = 'Employee';
      // For Health plans, append tenure suffix
      const coverageType = tenureTier ? `${base} (${tenureTier})` : base;

      const priceEntry = plan.pricing.find((p) => p.coverageType === coverageType);
      if (priceEntry) {
        const empMonthly = priceEntry.monthlyPremium;
        const empPP = (empMonthly * 12) / 26;

        // Plan Price and Monthly Rate both show MonthlyPremium from pricing table
        setPlanPrice?.(`$${empMonthly.toFixed(2)}/mo`);
        setMonthlyRate?.(`$${empMonthly.toFixed(2)}/mo`);
        // Payroll Deduction = per pay period cost
        setPayrollDeduction?.(`$${empPP.toFixed(2)}/pay period`);
      } else {
        setPlanPrice?.('');
        setMonthlyRate?.('');
        setPayrollDeduction?.('');
      }
    }
  }, [plans, tenureTier, companyContribPP, setPlanPrice, setPlanBenefits, setPayrollDeduction, setMonthlyRate]);

  // Recalculate pricing when additionalInsureds changes
  useEffect(() => {
    if (planId) recalcPricing(planId, additionalInsureds);
  }, [additionalInsureds]);

  const handlePlanChange = (newPlanId: string) => {
    setPlanId(newPlanId);
    recalcPricing(newPlanId, additionalInsureds);
  };

  return (
    <SectionCard title={title} icon={icon}>
      <div className="grid gap-4 md:grid-cols-2">
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
          disabled={optIn === 'Opt-Out'}
          options={[
            ...typePlans.map((p) => ({ value: String(p.healthPlanId), label: p.planName })),
            { value: '', label: 'Declined' },
          ]}
          source="admin"
        />
        <ReadOnlyField label="Plan Price" value={optIn === 'Opt-Out' ? '—' : (planPrice || '— From Pricing Table —')} source="calculated" />
        <ReadOnlyField label="Plan Benefits" value={optIn === 'Opt-Out' ? '—' : (planBenefits || '— From Benefits Table —')} source="calculated" />
        {monthlyRate !== undefined && (
          <ReadOnlyField label="Monthly Rate" value={optIn === 'Opt-Out' ? '—' : (monthlyRate || '— From Pricing Table —')} source="calculated" />
        )}
        {showAdditional && setAdditionalInsureds && (
          <SelectField
            label="Additional Insureds"
            value={additionalInsureds || ''}
            onChange={(v) => { setAdditionalInsureds(v); }}
            options={coverageOptions.map((ct) => ({ value: ct, label: ct }))}
            source="admin"
          />
        )}
        {showAdditional && (
          <ReadOnlyField label="Payroll Deduction" value={optIn === 'Opt-Out' ? '—' : (payrollDeduction || '—')} source="calculated" />
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

  // Local form state per insurance type
  const [healthOptIn, setHealthOptIn] = useState('');
  const [healthPlanId, setHealthPlanId] = useState('');
  const [additionalInsureds, setAdditionalInsureds] = useState('');
  const [dentalOptIn, setDentalOptIn] = useState('');
  const [dentalPlanId, setDentalPlanId] = useState('');
  const [visionOptIn, setVisionOptIn] = useState('');
  const [visionPlanId, setVisionPlanId] = useState('');

  // Derived from fetched data
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

  const populateForm = useCallback((data: EmployeeHealthInsurance) => {
    const health = data.elections.find((e) => e.insuranceType === 'Health');
    const dental = data.elections.find((e) => e.insuranceType === 'Dental');
    const vision = data.elections.find((e) => e.insuranceType === 'Vision');

    setHealthOptIn(health?.optInStatus || '');
    setHealthPlanId(health?.healthPlanId ? String(health.healthPlanId) : '');
    setAdditionalInsureds(health?.additionalInsureds || '');
    setHealthPrice(health?.planPrice || '');
    setHealthBenefits(health?.planBenefits || '');
    setHealthRate(health?.monthlyRate || '');
    setHealthDeduction(health?.payrollDeduction || '');

    setDentalOptIn(dental?.optInStatus || '');
    setDentalPlanId(dental?.healthPlanId ? String(dental.healthPlanId) : '');
    setDentalPrice(dental?.planPrice || '');
    setDentalBenefits(dental?.planBenefits || '');
    setDentalDeduction(dental?.payrollDeduction || '');

    setVisionOptIn(vision?.optInStatus || '');
    setVisionPlanId(vision?.healthPlanId ? String(vision.healthPlanId) : '');
    setVisionPrice(vision?.planPrice || '');
    setVisionBenefits(vision?.planBenefits || '');
    setVisionDeduction(vision?.payrollDeduction || '');
  }, []);

  useEffect(() => {
    if (insuranceQuery.data) populateForm(insuranceQuery.data);
  }, [insuranceQuery.data, populateForm]);

  const saveMutation = useMutation({
    mutationFn: (payload: UpdateEmployeeHealthInsuranceRequest) =>
      updateEmployeeHealthInsurance(user.email, payload),
    onSuccess: (data) => {
      qc.setQueryData(['employee-health-insurance', user.email], data);
      populateForm(data);
      addToast?.('Health insurance saved.', 'success');
    },
    onError: (error) => {
      addToast?.(friendlyApiError(error, 'Could not save health insurance.'), 'error');
    },
  });

  const handleSave = async () => {
    const saves: UpdateEmployeeHealthInsuranceRequest[] = [
      {
        insuranceType: 'Health',
        optInStatus: healthOptIn || null,
        healthPlanId: healthPlanId ? Number(healthPlanId) : null,
        additionalInsureds: additionalInsureds || null,
      },
      {
        insuranceType: 'Dental',
        optInStatus: dentalOptIn || null,
        healthPlanId: dentalPlanId ? Number(dentalPlanId) : null,
        additionalInsureds: additionalInsureds || null,
      },
      {
        insuranceType: 'Vision',
        optInStatus: visionOptIn || null,
        healthPlanId: visionPlanId ? Number(visionPlanId) : null,
        additionalInsureds: additionalInsureds || null,
      },
    ];
    for (const payload of saves) {
      saveMutation.mutate(payload);
    }
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

  // Non-admin users only see Health Insurance Status
  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <SectionCard title="Health Insurance Information" icon={<Heart className="h-4 w-4 text-ems-coral" />}>
          <div className="grid gap-4 md:grid-cols-2">
            <ReadOnlyField label="Health Insurance Status" value={insuranceEligibility} source="calculated" />
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SavingOverlay visible={saveMutation.isPending} />
      <SectionCard title="Health Insurance Information" icon={<Heart className="h-4 w-4 text-ems-coral" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="Health Insurance Status" value={insuranceEligibility} source="calculated" />
          <ReadOnlyField label="Company Contribution Per Pay Period" value={`$${companyContribPP.toFixed(2)}`} source="calculated" />
        </div>
      </SectionCard>

      <InsuranceSection
        title="Health Insurance"
        icon={<Heart className="h-4 w-4 text-ems-coral" />}
        insuranceType="Health"
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
        tenureTier={tenureTier}
        companyContribPP={companyContribPP}
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
        additionalInsureds={additionalInsureds}
        planPrice={dentalPrice}
        setPlanPrice={setDentalPrice}
        planBenefits={dentalBenefits}
        setPlanBenefits={setDentalBenefits}
        payrollDeduction={dentalDeduction}
        setPayrollDeduction={setDentalDeduction}
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
        additionalInsureds={additionalInsureds}
        planPrice={visionPrice}
        setPlanPrice={setVisionPrice}
        planBenefits={visionBenefits}
        setPlanBenefits={setVisionBenefits}
        payrollDeduction={visionDeduction}
        setPayrollDeduction={setVisionDeduction}
        showAdditional
      />

      {/* Save Bar */}
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
