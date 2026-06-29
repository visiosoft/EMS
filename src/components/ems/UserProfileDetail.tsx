import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, Briefcase, Heart, Star, Award, Lock, MapPin, Loader2, Save } from 'lucide-react';
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
  fetchUserLicenses,
  fetchUserGroups,
  type EmployeeEmploymentProfile,
  type UpdateEmployeeEmploymentProfileRequest,
} from '@/api/employeeEmploymentApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { useAddressAutofill } from '@/hooks/useAddressAutofill';
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
  onBack: () => void;
}

type ProfileTab = 'Personal' | 'Employment' | 'Health Insurance' | 'Experience' | 'Certifications';

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

export function UserProfileDetail({ user, onBack }: UserProfileDetailProps) {
  const [profileTab, setProfileTab] = useState<ProfileTab>('Personal');

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-text-secondary hover:bg-hover hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-text-primary truncate">{user.name}</h1>
          <p className="text-sm text-text-secondary truncate">{user.email}</p>
        </div>
      </div>

      {/* Profile Tabs */}
      <TabBar
        tabs={['Personal', 'Employment', 'Health Insurance', 'Experience', 'Certifications']}
        active={profileTab}
        onChange={(t) => setProfileTab(t as ProfileTab)}
      />

      {/* Tab Content */}
      {profileTab === 'Personal' && <PersonalTab user={user} />}
      {profileTab === 'Employment' && <EmploymentTab user={user} />}
      {profileTab === 'Health Insurance' && <HealthInsuranceTab />}
      {profileTab === 'Experience' && <ExperienceTab />}
      {profileTab === 'Certifications' && <CertificationsTab />}
    </div>
  );
}

// ─── Shared Field Components ──────────────────────────────────────────────────

function ReadOnlyField({ label, value, source }: { label: string; value: string; source?: DataSource }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-text-muted">{label}</label>
        {source && <SourceBadge source={source} />}
        <Lock className="h-3 w-3 text-text-muted/50" />
      </div>
      <div className="rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-secondary">
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  source?: DataSource;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-text-muted">{label}</label>
        {source && <SourceBadge source={source} />}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-ems-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-text-muted">{label}</label>
        {source && <SourceBadge source={source} />}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-ems-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">— Select —</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
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

// ─── Personal Tab ─────────────────────────────────────────────────────────────

function PersonalTab({ user }: { user: UserProfileUser }) {
  const qc = useQueryClient();

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
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
      setSaveMessage({ text: 'Personal profile saved.', type: 'success' });
      setTimeout(() => setSaveMessage(null), 4000);
    },
    onError: (error) => {
      setSaveMessage({ text: friendlyApiError(error, 'Could not save profile.'), type: 'error' });
      setTimeout(() => setSaveMessage(null), 6000);
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
      {/* Basic Info */}
      <SectionCard title="Basic Information" icon={<User className="h-4 w-4 text-ems-accent" />}>
        <div className="grid gap-4 md:grid-cols-3">
          <ReadOnlyField label="First Name" value={user.name.split(' ')[0] || ''} source="entra" />
          <EditableField label="Middle Name" value={middleName} onChange={setMiddleName} placeholder="Enter middle name" source="employee" />
          <ReadOnlyField label="Last Name" value={user.name.split(' ').slice(1).join(' ') || ''} source="entra" />
          <EditableField label="Personal Email" value={personalEmail} onChange={setPersonalEmail} type="email" placeholder="personal@example.com" source="employee" />
          <ReadOnlyField label="Cell Phone Number" value={user.mobilePhone || ''} source="entra" />
          <EditableField label="Birth Date" value={birthDate} onChange={setBirthDate} type="date" source="employee" />
          <EditableField label="Social Security Number" value={ssn} onChange={setSsn} placeholder="•••-••-••••" source="employee" />
          {age !== null ? (
            <ReadOnlyField label="Age" value={`${age} years`} source="calculated" />
          ) : (
            <ReadOnlyField label="Age" value="Enter birth date" source="calculated" />
          )}
        </div>
      </SectionCard>

      {/* Home Address */}
      <SectionCard title="Home Address" icon={<MapPin className="h-4 w-4 text-ems-accent" />}>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Street Address with Google Places autocomplete */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-text-muted">Street Address</label>
              <SourceBadge source="google" />
            </div>
            <div className="relative">
              <input
                type="text"
                value={homeAddress.street}
                onChange={(e) => setHomeAddress((prev) => ({ ...prev, street: e.target.value }))}
                onFocus={homeAutofill.onStreetFocus}
                onBlur={homeAutofill.onStreetBlur}
                placeholder="Start typing to search…"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-ems-accent focus:outline-none"
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
          />
          <EditableField
            label="City"
            value={homeAddress.city}
            onChange={(v) => setHomeAddress((prev) => ({ ...prev, city: v }))}
            source="google"
          />
          <EditableField
            label="State"
            value={homeAddress.state}
            onChange={(v) => setHomeAddress((prev) => ({ ...prev, state: v }))}
            source="google"
          />
          <EditableField
            label="Postal Code"
            value={homeAddress.postalCode}
            onChange={(v) => setHomeAddress((prev) => ({ ...prev, postalCode: v }))}
            source="google"
          />
          <EditableField
            label="Country"
            value={homeAddress.country}
            onChange={(v) => setHomeAddress((prev) => ({ ...prev, country: v }))}
            source="google"
          />
        </div>
      </SectionCard>

      {/* Emergency Contact */}
      <SectionCard title="Emergency Contact" icon={<User className="h-4 w-4 text-ems-coral" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <EditableField
            label="First Name"
            value={emergencyContact.firstName}
            onChange={(v) => setEmergencyContact((prev) => ({ ...prev, firstName: v }))}
            source="employee"
          />
          <EditableField
            label="Last Name"
            value={emergencyContact.lastName}
            onChange={(v) => setEmergencyContact((prev) => ({ ...prev, lastName: v }))}
            source="employee"
          />
          <EditableField
            label="Email"
            value={emergencyContact.email}
            onChange={(v) => setEmergencyContact((prev) => ({ ...prev, email: v }))}
            type="email"
            source="employee"
          />
          <EditableField
            label="Cell Phone"
            value={emergencyContact.cellPhone}
            onChange={(v) => setEmergencyContact((prev) => ({ ...prev, cellPhone: v }))}
            source="employee"
          />
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
          {saveMutation.isPending ? 'Saving…' : 'Save Personal Info'}
        </button>
        {saveMessage && (
          <span className={`text-sm ${saveMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {saveMessage.text}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Employment Tab ───────────────────────────────────────────────────────────

function EmploymentTab({ user }: { user: UserProfileUser }) {
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
  });

  // ── Fetch phone extension options ─────────────────────────────────────────
  const phoneExtensionsQuery = useQuery({
    queryKey: ['phone-extensions'],
    queryFn: fetchPhoneExtensions,
    staleTime: 60_000,
  });

  // ── Fetch phone device options ────────────────────────────────────────────
  const phoneDevicesQuery = useQuery({
    queryKey: ['phone-devices'],
    queryFn: fetchPhoneDevices,
    staleTime: 60_000,
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
  const [accessLevel, setAccessLevel] = useState('Employee');
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
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // ── Sync fetched data into form ───────────────────────────────────────────
  const populateForm = useCallback((data: EmployeeEmploymentProfile) => {
    setAccessLevel(data.accessLevel || 'Employee');
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
      setSaveMessage({ text: 'Employment profile saved.', type: 'success' });
      setTimeout(() => setSaveMessage(null), 4000);
    },
    onError: (error) => {
      setSaveMessage({ text: friendlyApiError(error, 'Could not save employment profile.'), type: 'error' });
      setTimeout(() => setSaveMessage(null), 6000);
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
      {/* Entra-fed fields */}
      <SectionCard title="Entra Directory Info (Read-Only)" icon={<Briefcase className="h-4 w-4 text-ems-accent" />}>
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

      {/* Admin-entered fields */}
      <SectionCard title="Employment Details" icon={<Briefcase className="h-4 w-4 text-ems-blue" />}>
        <div className="grid gap-4 md:grid-cols-2">
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
          {/* Workstation grouped select */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-text-muted">Workstation</label>
              <SourceBadge source="inventory" />
            </div>
            <select
              value={workstation}
              onChange={(e) => setWorkstation(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ems-blue"
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
          <EditableField label="Start Date at IAE" value={startDate} onChange={setStartDate} type="date" source="admin" />
          {yearsOfService !== null ? (
            <ReadOnlyField label="Years of Service" value={yearsOfService} source="calculated" />
          ) : (
            <ReadOnlyField label="Years of Service" value="Enter start date" source="calculated" />
          )}
          <EditableField label="Supervisor" value={supervisor} onChange={setSupervisor} source="admin" />
          <EditableField label="Paid Time Off Accrual Rate" value={ptoAccrualRate} onChange={setPtoAccrualRate} source="admin" />
          <EditableField label="Employment Agreement Fully Executed" value={employmentAgreement} onChange={setEmploymentAgreement} source="admin" />
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
        </div>
      </SectionCard>

      {/* Office Address */}
      <SectionCard title="Office Address" icon={<MapPin className="h-4 w-4 text-ems-accent" />}>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Street Address with Google Places autocomplete */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-text-muted">Street Address</label>
              <SourceBadge source="google" />
            </div>
            <div className="relative">
              <input
                type="text"
                value={officeAddress.street}
                onChange={(e) => setOfficeAddress((prev) => ({ ...prev, street: e.target.value }))}
                onFocus={officeAutofill.onStreetFocus}
                onBlur={officeAutofill.onStreetBlur}
                placeholder="Start typing to search…"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-ems-accent focus:outline-none"
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
            source="google"
          />
          <EditableField
            label="City"
            value={officeAddress.city}
            onChange={(v) => setOfficeAddress((prev) => ({ ...prev, city: v }))}
            source="google"
          />
          <EditableField
            label="State"
            value={officeAddress.state}
            onChange={(v) => setOfficeAddress((prev) => ({ ...prev, state: v }))}
            source="google"
          />
          <EditableField
            label="Postal Code"
            value={officeAddress.postalCode}
            onChange={(v) => setOfficeAddress((prev) => ({ ...prev, postalCode: v }))}
            source="google"
          />
          <EditableField
            label="Country"
            value={officeAddress.country}
            onChange={(v) => setOfficeAddress((prev) => ({ ...prev, country: v }))}
            source="google"
          />
        </div>
      </SectionCard>

      {/* Desk Phone & Equipment (read-only from inventory) */}
      <SectionCard title="Desk Phone & Equipment" icon={<Briefcase className="h-4 w-4 text-ems-green" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="Desk Phone Number" value="(312) 274-1800" source="admin" />
          {/* Desk Phone Extension dropdown */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-text-muted">Desk Phone Extension</label>
              <SourceBadge source="inventory" />
            </div>
            <select
              value={deskPhoneExtension}
              onChange={(e) => setDeskPhoneExtension(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ems-blue"
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
          {/* Desk Phone MAC dropdown */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-text-muted">Desk Phone MAC Address</label>
              <SourceBadge source="inventory" />
            </div>
            <select
              value={deskPhoneMac}
              onChange={(e) => setDeskPhoneMac(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ems-blue"
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
          <ReadOnlyField label="Desk Phone Brand" value={deskPhoneBrand || '—'} source="inventory" />
          <ReadOnlyField label="Desk Phone Model" value={deskPhoneModel || '—'} source="inventory" />
          <ReadOnlyField label="PC Brand" value={pcBrand || '—'} source="inventory" />
          <ReadOnlyField label="PC Model" value={pcModel || '—'} source="inventory" />
          <ReadOnlyField label="PC Service Tag" value={pcServiceTag || '—'} source="inventory" />
          <ReadOnlyField label="Bluetooth Status" value={bluetoothStatus || '—'} source="inventory" />
          <ReadOnlyField label="PC Windows Name" value={pcWindowsName || '—'} source="inventory" />
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
        {saveMessage && (
          <span className={`text-sm ${saveMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {saveMessage.text}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Health Insurance Tab ─────────────────────────────────────────────────────

function HealthInsuranceTab() {
  const [healthOptIn, setHealthOptIn] = useState('');
  const [healthPlan, setHealthPlan] = useState('');
  const [dentalOptIn, setDentalOptIn] = useState('');
  const [dentalPlan, setDentalPlan] = useState('');
  const [visionOptIn, setVisionOptIn] = useState('');
  const [visionPlan, setVisionPlan] = useState('');
  const [additionalInsureds, setAdditionalInsureds] = useState('');

  return (
    <div className="space-y-4">
      {/* Health Insurance */}
      <SectionCard title="Health Insurance" icon={<Heart className="h-4 w-4 text-ems-coral" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="Health Insurance Status" value="—" source="calculated" />
          <SelectField
            label="Health Insurance Opt-In / Opt-Out"
            value={healthOptIn}
            onChange={(v) => {
              setHealthOptIn(v);
              if (v === 'Opt-Out') setHealthPlan('Declined');
            }}
            options={[
              { value: 'Opt-In', label: 'Opt-In' },
              { value: 'Opt-Out', label: 'Opt-Out' },
            ]}
            source="admin"
          />
          <SelectField
            label="Chosen Plan"
            value={healthPlan}
            onChange={setHealthPlan}
            disabled={healthOptIn === 'Opt-Out'}
            options={[
              { value: 'Plan A', label: 'Plan A' },
              { value: 'Plan B', label: 'Plan B' },
              { value: 'Plan C', label: 'Plan C' },
              { value: 'Declined', label: 'Declined' },
            ]}
            source="admin"
          />
          <ReadOnlyField label="Chosen Plan Price" value={healthOptIn === 'Opt-Out' ? '—' : '— From Pricing Table —'} source="calculated" />
          <ReadOnlyField label="Benefits of Chosen Plan" value={healthOptIn === 'Opt-Out' ? '—' : '— From Benefits Table —'} source="calculated" />
          <ReadOnlyField label="Monthly Rate (based on Age)" value="— From Rate Table —" source="calculated" />
          <SelectField
            label="Additional Insureds"
            value={additionalInsureds}
            onChange={setAdditionalInsureds}
            options={[
              { value: 'Spouse', label: 'Spouse' },
              { value: 'Child', label: 'Child' },
              { value: 'Family', label: 'Family' },
              { value: 'N/A', label: 'N/A' },
            ]}
            source="admin"
          />
          <ReadOnlyField label="Payroll Deduction" value="— Calculation stub (TBD) —" source="calculated" />
        </div>
      </SectionCard>

      {/* Dental */}
      <SectionCard title="Dental Insurance" icon={<Heart className="h-4 w-4 text-ems-blue" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Dental Insurance Opt-In / Opt-Out"
            value={dentalOptIn}
            onChange={(v) => {
              setDentalOptIn(v);
              if (v === 'Opt-Out') setDentalPlan('Declined');
            }}
            options={[
              { value: 'Opt-In', label: 'Opt-In' },
              { value: 'Opt-Out', label: 'Opt-Out' },
            ]}
            source="admin"
          />
          <SelectField
            label="Chosen Plan"
            value={dentalPlan}
            onChange={setDentalPlan}
            disabled={dentalOptIn === 'Opt-Out'}
            options={[
              { value: 'Dental Plan A', label: 'Dental Plan A' },
              { value: 'Dental Plan B', label: 'Dental Plan B' },
              { value: 'Declined', label: 'Declined' },
            ]}
            source="admin"
          />
          <ReadOnlyField label="Plan Benefits" value={dentalOptIn === 'Opt-Out' ? '—' : '— From Benefits Table —'} source="calculated" />
          <ReadOnlyField label="Plan Price" value={dentalOptIn === 'Opt-Out' ? '—' : '— From Pricing Table —'} source="calculated" />
        </div>
      </SectionCard>

      {/* Vision */}
      <SectionCard title="Vision Insurance" icon={<Heart className="h-4 w-4 text-ems-green" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Vision Insurance Opt-In / Opt-Out"
            value={visionOptIn}
            onChange={(v) => {
              setVisionOptIn(v);
              if (v === 'Opt-Out') setVisionPlan('Declined');
            }}
            options={[
              { value: 'Opt-In', label: 'Opt-In' },
              { value: 'Opt-Out', label: 'Opt-Out' },
            ]}
            source="admin"
          />
          <SelectField
            label="Chosen Plan"
            value={visionPlan}
            onChange={setVisionPlan}
            disabled={visionOptIn === 'Opt-Out'}
            options={[
              { value: 'Vision Plan A', label: 'Vision Plan A' },
              { value: 'Vision Plan B', label: 'Vision Plan B' },
              { value: 'Declined', label: 'Declined' },
            ]}
            source="admin"
          />
          <ReadOnlyField label="Plan Benefits" value={visionOptIn === 'Opt-Out' ? '—' : '— From Benefits Table —'} source="calculated" />
          <ReadOnlyField label="Plan Price" value={visionOptIn === 'Opt-Out' ? '—' : '— From Pricing Table —'} source="calculated" />
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Experience Tab ───────────────────────────────────────────────────────────

function ExperienceTab() {
  return (
    <div className="space-y-4">
      <SectionCard title="Experience (from EMS)" icon={<Star className="h-4 w-4 text-ems-amber" />}>
        <div className="grid gap-4 md:grid-cols-1">
          <ReadOnlyField label="Engagements Assigned To" value="— Pulled from EMS —" source="ems" />
          <ReadOnlyField label="Engagements Worked On" value="— Pulled from EMS —" source="ems" />
          <ReadOnlyField label="Markets Worked In" value="— Pulled from EMS —" source="ems" />
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Certifications Tab ───────────────────────────────────────────────────────

function CertificationsTab() {
  // Placeholder certifications — will be admin-entered in future
  const certifications: { id: string; name: string; issuer: string; dateAwarded: string; tags: string[] }[] = [];

  return (
    <div className="space-y-4">
      <SectionCard title="Completed / Awarded Credentials & Certifications" icon={<Award className="h-4 w-4 text-ems-accent" />}>
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs text-text-muted">Data entry:</span>
            <SourceBadge source="admin" />
          </div>

          {certifications.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-elevated/50 px-6 py-10 text-center">
              <Award className="mx-auto h-10 w-10 text-text-muted/40" />
              <p className="mt-3 text-sm font-medium text-text-secondary">No certifications on file</p>
              <p className="mt-1 text-xs text-text-muted">
                Certifications and credentials will appear here as cards once entered by an administrator.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {certifications.map((cert) => (
                <div
                  key={cert.id}
                  className="rounded-lg border border-border bg-surface p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ems-accent/10 text-ems-accent">
                      <Award className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-text-primary truncate">{cert.name}</h4>
                      <p className="text-xs text-text-secondary">{cert.issuer}</p>
                      <p className="mt-1 text-xs text-text-muted">Awarded: {cert.dateAwarded}</p>
                    </div>
                  </div>
                  {cert.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {cert.tags.map((tag) => (
                        <span key={tag} className="inline-flex rounded-full bg-ems-accent/10 px-2 py-0.5 text-[10px] font-medium text-ems-accent">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
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
