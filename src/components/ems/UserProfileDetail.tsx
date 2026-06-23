import { useState } from 'react';
import { ArrowLeft, User, Briefcase, Heart, Star, Award, Lock, MapPin } from 'lucide-react';
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

  const age = birthDate ? calculateAge(birthDate) : null;

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
          <EditableField
            label="Street Address"
            value={homeAddress.street}
            onChange={(v) => setHomeAddress((prev) => ({ ...prev, street: v }))}
            placeholder="Start typing to search…"
            source="google"
          />
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
    </div>
  );
}

// ─── Employment Tab ───────────────────────────────────────────────────────────

function EmploymentTab({ user }: { user: UserProfileUser }) {
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

  const yearsOfService = startDate ? calculateYearsOfService(startDate) : null;

  return (
    <div className="space-y-4">
      {/* Entra-fed fields */}
      <SectionCard title="Entra Directory Info (Read-Only)" icon={<Briefcase className="h-4 w-4 text-ems-accent" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="Title" value={user.jobTitle || ''} source="entra" />
          <ReadOnlyField label="Work Email" value={user.email} source="entra" />
          <ReadOnlyField label="Office" value={user.officeLocation || ''} source="entra" />
          <ReadOnlyField label="Microsoft Office License" value="—" source="entra" />
          <div className="md:col-span-2">
            <ReadOnlyField label="Microsoft Group Membership" value="—" source="entra" />
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
          <EditableField label="Workstation" value={workstation} onChange={setWorkstation} placeholder="Select from office list" source="inventory" />
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
          <EditableField
            label="Street Address"
            value={officeAddress.street}
            onChange={(v) => setOfficeAddress((prev) => ({ ...prev, street: v }))}
            placeholder="Start typing to search…"
            source="google"
          />
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

      {/* Desk Phone & Equipment */}
      <SectionCard title="Desk Phone & Equipment" icon={<Briefcase className="h-4 w-4 text-ems-green" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="Desk Phone Number" value="(312) 274-1800" source="admin" />
          <EditableField label="Desk Phone Extension" value={deskPhoneExtension} onChange={setDeskPhoneExtension} placeholder="Choose from extension list" source="inventory" />
          <EditableField label="Desk Phone MAC Address" value={deskPhoneMac} onChange={setDeskPhoneMac} placeholder="Choose from Phone Inventory" source="inventory" />
          <EditableField label="Desk Phone Brand" value={deskPhoneBrand} onChange={setDeskPhoneBrand} source="admin" />
          <EditableField label="Desk Phone Model" value={deskPhoneModel} onChange={setDeskPhoneModel} source="admin" />
          <EditableField label="PC Brand" value={pcBrand} onChange={setPcBrand} source="admin" />
          <EditableField label="PC Model" value={pcModel} onChange={setPcModel} source="admin" />
          <EditableField label="PC Service Tag" value={pcServiceTag} onChange={setPcServiceTag} placeholder="Choose from PC Inventory" source="inventory" />
          <EditableField label="Bluetooth Status" value={bluetoothStatus} onChange={setBluetoothStatus} source="admin" />
          <EditableField label="PC Windows Name" value={pcWindowsName} onChange={setPcWindowsName} source="admin" />
        </div>
      </SectionCard>
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
