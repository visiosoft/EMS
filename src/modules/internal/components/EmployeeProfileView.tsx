import { useState, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Briefcase,
  Eye,
  EyeOff,
  HeartPulse,
  KeyRound,
  Laptop,
  Map,
  Pencil,
  Save,
  Ticket,
  Users,
  UserRound,
  X,
} from "lucide-react";
import type {
  LinkedSelfProfile,
  SelfProfileAddress,
  SelfProfileCertification,
  SelfProfileInsuranceElection,
  UpdateMyProfilePayload,
} from "@/api/selfProfileApi";
import {
  updateMyProfile,
  updateEmployeeProfile,
} from "@/api/selfProfileApi";
import { fetchWorkstations, fetchPhoneExtensions, fetchPhoneDevices, fetchPcDevices } from "@/api/employeeEmploymentApi";
import { formatE164ForDisplay } from "@/lib/contactPhoneField";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMMM d, yyyy");
  } catch {
    return value;
  }
}

function textOrDash(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  return trimmed || "—";
}

function hasValue(value: string): boolean {
  return value.trim() !== "" && value !== "—";
}

function phoneOrDash(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "—";
  return formatE164ForDisplay(trimmed) || trimmed;
}

function formatAddress(address: SelfProfileAddress | null): string {
  if (!address) return "—";
  const line = [
    address.line1,
    address.line2,
    [address.city, address.stateProvince].filter(Boolean).join(", "),
    address.postalCode,
    address.country,
  ]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(", ");
  return line || "—";
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-neutral-900">{value}</dd>
    </div>
  );
}

/** Inline-editable field — shows an input when editing, read-only otherwise. */
function EditableField({
  label,
  value,
  editing,
  editValue,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  editValue?: string;
  onChange?: (v: string) => void;
}) {
  if (!editing) return <Field label={label} value={value} />;
  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </label>
      <input
        type="text"
        className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        value={editValue ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}

/** Field masked by default with a Show/Hide toggle — for SSN and Age (spec: hashed with show button). */
function RevealField({ label, value }: { label: string; value: string }) {
  const [shown, setShown] = useState(false);
  const has = hasValue(value);
  return (
    <div>
      <dt className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
        {label}
        {has ? (
          <button
            type="button"
            onClick={() => setShown((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-full border border-neutral-300 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-neutral-600 transition-colors hover:bg-neutral-100"
            aria-label={shown ? `Hide ${label}` : `Show ${label}`}
          >
            {shown ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {shown ? "Hide" : "Show"}
          </button>
        ) : null}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-neutral-900">
        {has ? (shown ? value : "••••••") : "—"}
      </dd>
    </div>
  );
}

/**
 * One of the eight Employee Profiles.xlsx categories, rendered as an unmistakably
 * distinct card: a numbered badge (01–08), an icon, a header strip separated from the
 * body by a hairline, and its own border + shadow so it reads as a separate box at a
 * glance rather than blending into the section above or below it.
 */
function SectionShell({
  number,
  title,
  icon,
  children,
  editActions,
}: {
  number: number;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  editActions?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-5 py-4 sm:px-6">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-bold tabular-nums text-white">
          {String(number).padStart(2, "0")}
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-neutral-700 ring-1 ring-neutral-200" aria-hidden>
          {icon}
        </span>
        <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
        {editActions ? <div className="ml-auto flex items-center gap-2">{editActions}</div> : null}
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

/** A sub-group inside a category card (e.g. Home Address inside Personal). */
function SubGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-6 border-t border-neutral-100 pt-5 first:mt-0 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">{label}</h3>
      {children}
    </div>
  );
}

type FieldItem = { label: string; value: string; kind?: "text" | "reveal"; admin?: boolean };

/**
 * A titled card of label/value fields. When `limited` (a non-admin viewing someone
 * else) the Administrator-only fields are dropped, but every "All"-visibility field is
 * still shown — even when blank — so the page shows the maximum information the viewer
 * is allowed to see. The card disappears only if it has no visible fields at all.
 */
function FieldGrid({ items }: { items: FieldItem[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) =>
        item.kind === "reveal" ? (
          <RevealField key={item.label} label={item.label} value={item.value} />
        ) : (
          <Field key={item.label} label={item.label} value={item.value} />
        ),
      )}
    </dl>
  );
}

function TagList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-sm font-medium text-neutral-500">{empty}</p>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[13px] font-medium text-neutral-800"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function InsuranceCard({ election, companyContributionPerPayPeriod }: { election: SelfProfileInsuranceElection; companyContributionPerPayPeriod?: number }) {
  const optedIn = election.optInStatus.toLowerCase().includes("opt-in");
  const benefits = election.planBenefits
    .split(";")
    .map((b) => b.trim())
    .filter(Boolean);
  return (
    <div className="rounded-md border border-neutral-100 bg-neutral-50/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-neutral-950">{textOrDash(election.insuranceType)}</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            optedIn ? "bg-emerald-600 text-white" : "bg-neutral-300 text-neutral-800"
          }`}
        >
          {textOrDash(election.optInStatus)}
        </span>
      </div>
      {optedIn ? (
        <>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Chosen Plan" value={textOrDash(election.planName)} />
            <Field label="Additional Insureds" value={textOrDash(election.additionalInsureds)} />
            <Field label="Plan Price" value={textOrDash(election.planPrice)} />
            <Field label="Monthly Rate" value={textOrDash(election.monthlyRate)} />
            <Field label="Payroll Deduction" value={textOrDash(election.payrollDeduction)} />
            {companyContributionPerPayPeriod != null && companyContributionPerPayPeriod > 0 ? (
              <Field label="Company Contribution Per Pay Period" value={currency.format(companyContributionPerPayPeriod)} />
            ) : null}
          </dl>
          {benefits.length > 0 ? (
            <div className="mt-4">
              <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                Plan Benefits
              </dt>
              <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {benefits.map((benefit, index) => (
                  <li key={`${benefit}-${index}`} className="text-[13px] font-medium text-neutral-800">
                    • {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm font-medium text-neutral-500">Not enrolled.</p>
      )}
    </div>
  );
}

function CertificationRow({ cert }: { cert: SelfProfileCertification }) {
  return (
    <div className="rounded-md border border-neutral-100 bg-neutral-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-neutral-950">
            {textOrDash(cert.certificationName)}
          </h3>
          <p className="mt-0.5 text-[13px] text-neutral-600">
            {[cert.issuingOrganization, cert.platformName].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        {cert.dateCompleted ? (
          <span className="shrink-0 text-[11px] font-medium text-neutral-500">
            {formatDate(cert.dateCompleted)}
          </span>
        ) : null}
      </div>
      {cert.tags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {cert.tags.map((tag, index) => (
            <li
              key={`${tag}-${index}`}
              className="rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-neutral-700"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
      {cert.credentialUrl ? (
        <a
          href={cert.credentialUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-[13px] font-semibold text-neutral-900 underline underline-offset-2 hover:text-neutral-600"
        >
          View credential
        </a>
      ) : null}
    </div>
  );
}

/**
 * Read-only profile renderer shared by "My Profile" (self) and the directory's
 * "view another employee" page. The data is already visibility-filtered server-side.
 *
 * Rendered as exactly the eight Employee Profiles.xlsx categories — each its own
 * clearly bordered, shadowed, numbered card (01–08) — so the page reads as eight
 * distinct sections rather than a continuous list. Related fields that live under a
 * category in the xlsx (Home Address / Emergency Contacts under Personal, Office
 * Address under Employment) are grouped as labeled sub-sections inside that card
 * instead of spawning extra boxes.
 *
 * When the profile is `limited` (a non-admin viewing another employee), Administrator-
 * only fields/sub-sections are omitted, and categories that are entirely
 * Administrator-only (Health Insurance, Software Assets) are skipped — every
 * "All"-visibility field is still shown, even when blank, so the viewer sees the
 * maximum information they're allowed to.
 */
export function EmployeeProfileView({ profile, editable = false, targetContactId }: { profile: LinkedSelfProfile; editable?: boolean; targetContactId?: number }) {
  const limited = profile.visibility === "limited";
  const canEdit = editable && !limited;
  const queryClient = useQueryClient();

  // ─── Edit state per section ────────────────────────────────────────────────
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingEmployment, setEditingEmployment] = useState(false);
  const [editingProperty, setEditingProperty] = useState(false);

  // ─── Form state: Personal section (phones, home address, emergency contacts)
  const [cellPhone, setCellPhone] = useState(profile.basics.cellPhone || "");
  const [workPhone, setWorkPhone] = useState(profile.basics.workPhone || "");
  const [addrLine1, setAddrLine1] = useState(profile.homeAddress?.line1 || "");
  const [addrLine2, setAddrLine2] = useState(profile.homeAddress?.line2 || "");
  const [addrCity, setAddrCity] = useState(profile.homeAddress?.city || "");
  const [addrState, setAddrState] = useState(profile.homeAddress?.stateProvince || "");
  const [addrPostal, setAddrPostal] = useState(profile.homeAddress?.postalCode || "");
  const [addrCountry, setAddrCountry] = useState(profile.homeAddress?.country || "");
  const [emergencyContacts, setEmergencyContacts] = useState(
    profile.emergencyContacts.map((c) => ({
      fullName: c.fullName || "",
      phoneNumber: c.phoneNumber || "",
      email: c.email || "",
      isPrimary: c.isPrimary,
    })),
  );

  // ─── Form state: Employment section (workstation only)
  const [workstation, setWorkstation] = useState(profile.employment.workstation || "");

  const workstationsQuery = useQuery({
    queryKey: ["workstations"],
    queryFn: fetchWorkstations,
    enabled: canEdit && editingEmployment,
    staleTime: 5 * 60 * 1000,
  });
  const workstationOffices = workstationsQuery.data?.offices ?? [];
  const allWorkstations = workstationOffices.flatMap((o) => o.workstations);

  // ─── Form state: Property section (equipment IDs for dropdown selection)
  const [selectedExtensionId, setSelectedExtensionId] = useState<number | null>(null);
  const [selectedPhoneId, setSelectedPhoneId] = useState<number | null>(null);
  const [selectedComputerId, setSelectedComputerId] = useState<number | null>(null);

  const phoneExtensionsQuery = useQuery({
    queryKey: ["phone-extensions"],
    queryFn: fetchPhoneExtensions,
    enabled: canEdit && editingProperty,
    staleTime: 5 * 60 * 1000,
  });
  const phoneDevicesQuery = useQuery({
    queryKey: ["phone-devices"],
    queryFn: fetchPhoneDevices,
    enabled: canEdit && editingProperty,
    staleTime: 5 * 60 * 1000,
  });
  const pcDevicesQuery = useQuery({
    queryKey: ["pc-devices"],
    queryFn: fetchPcDevices,
    enabled: canEdit && editingProperty,
    staleTime: 5 * 60 * 1000,
  });

  const phoneExtensions = phoneExtensionsQuery.data?.extensions ?? [];
  const phoneDevices = phoneDevicesQuery.data?.phones ?? [];
  const pcDevices = pcDevicesQuery.data?.computers ?? [];

  // ─── Save mutation ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (payload: UpdateMyProfilePayload) =>
      targetContactId
        ? updateEmployeeProfile(targetContactId, payload)
        : updateMyProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: targetContactId ? ["employee-profile", targetContactId] : ["self-profile"],
      });
      setEditingPersonal(false);
      setEditingEmployment(false);
      setEditingProperty(false);
    },
  });

  function savePersonal() {
    const payload: UpdateMyProfilePayload = {
      cellPhone,
      workPhone,
      homeAddress: {
        line1: addrLine1,
        line2: addrLine2,
        city: addrCity,
        stateProvince: addrState,
        postalCode: addrPostal,
        country: addrCountry,
      },
      emergencyContacts: emergencyContacts.map((c) => ({
        fullName: c.fullName,
        phoneNumber: c.phoneNumber,
        email: c.email,
        isPrimary: c.isPrimary,
      })),
    };
    saveMutation.mutate(payload);
  }

  function saveEmployment() {
    saveMutation.mutate({ workstation });
  }

  function saveProperty() {
    saveMutation.mutate({
      deskPhoneExtensionId: selectedExtensionId,
      deskPhoneId: selectedPhoneId,
      pcComputerId: selectedComputerId,
    });
  }

  function cancelPersonal() {
    setCellPhone(profile.basics.cellPhone || "");
    setWorkPhone(profile.basics.workPhone || "");
    setAddrLine1(profile.homeAddress?.line1 || "");
    setAddrLine2(profile.homeAddress?.line2 || "");
    setAddrCity(profile.homeAddress?.city || "");
    setAddrState(profile.homeAddress?.stateProvince || "");
    setAddrPostal(profile.homeAddress?.postalCode || "");
    setAddrCountry(profile.homeAddress?.country || "");
    setEmergencyContacts(
      profile.emergencyContacts.map((c) => ({
        fullName: c.fullName || "",
        phoneNumber: c.phoneNumber || "",
        email: c.email || "",
        isPrimary: c.isPrimary,
      })),
    );
    setEditingPersonal(false);
  }

  function cancelEmployment() {
    setWorkstation(profile.employment.workstation || "");
    setEditingEmployment(false);
  }

  function cancelProperty() {
    setSelectedExtensionId(null);
    setSelectedPhoneId(null);
    setSelectedComputerId(null);
    setEditingProperty(false);
  }

  function addEmergencyContact() {
    setEmergencyContacts((prev) => [
      ...prev,
      { fullName: "", phoneNumber: "", email: "", isPrimary: prev.length === 0 },
    ]);
  }

  function removeEmergencyContact(idx: number) {
    setEmergencyContacts((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateEmergencyContact(idx: number, field: string, value: string | boolean) {
    setEmergencyContacts((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    );
  }

  const health = profile.healthInsurance;
  const experience = profile.experience;
  const certifications = profile.certifications?.certifications ?? [];

  const homeAddress = formatAddress(profile.homeAddress);
  const officeAddress = formatAddress(profile.officeAddress);
  const licenses = profile.entra.microsoftOfficeLicenses;
  const groups = profile.entra.microsoftGroups;

  const personalFields: FieldItem[] = [
    { label: "First Name", value: textOrDash(profile.basics.firstName) },
    { label: "Middle Name", value: textOrDash(profile.basics.middleName) },
    { label: "Last Name", value: textOrDash(profile.basics.lastName) },
    { label: "Personal Email", value: textOrDash(profile.basics.personalEmail), admin: true },
    { label: "Cell Phone Number", value: phoneOrDash(profile.basics.cellPhone) },
    { label: "Work Phone", value: phoneOrDash(profile.basics.workPhone) },
    { label: "Birth Date", value: formatDate(profile.personal.dateOfBirth) },
    {
      label: "Social Security Number",
      value: profile.personal.ssnLast4 ? `•••-••-${profile.personal.ssnLast4}` : "—",
      kind: "reveal",
      admin: true,
    },
    {
      label: "Age",
      value: profile.personal.age != null ? String(profile.personal.age) : "—",
      kind: "reveal",
      admin: true,
    },
  ];

  const employmentFields: FieldItem[] = [
    { label: "Title", value: textOrDash(profile.employment.title) },
    { label: "Access Level", value: textOrDash(profile.employment.accessLevel), admin: true },
    { label: "Work Email", value: textOrDash(profile.basics.email) },
    { label: "Office", value: textOrDash(profile.employment.office), admin: true },
    { label: "Workstation", value: textOrDash(profile.employment.workstation), admin: true },
    { label: "Work Authorization", value: textOrDash(profile.employment.workAuthorization), admin: true },
    { label: "Department", value: textOrDash(profile.basics.department) },
    { label: "Department Rank", value: textOrDash(profile.employment.departmentRank) },
    { label: "Role", value: textOrDash(profile.basics.role) },
    { label: "Company", value: textOrDash(profile.basics.company) },
    { label: "Start Date at IAE", value: formatDate(profile.employment.startDate), admin: true },
    { label: "Years of Service", value: textOrDash(profile.employment.yearsOfService), admin: true },
    { label: "Supervisor", value: textOrDash(profile.employment.supervisor) },
    { label: "Employment Status", value: textOrDash(profile.employment.employmentStatus), admin: true },
    { label: "Employment Type", value: textOrDash(profile.employment.employmentType), admin: true },
    { label: "Paid Time Off Accrual Rate", value: textOrDash(profile.employment.ptoAccrualRate), admin: true },
    {
      label: "Employment Agreement Fully Executed",
      value: textOrDash(profile.employment.employmentAgreement),
      admin: true,
    },
    { label: "Ramp Account", value: textOrDash(profile.employment.rampAccount), admin: true },
    { label: "Ramp Credit Card", value: textOrDash(profile.employment.rampCreditCard), admin: true },
  ];

  const visiblePersonalFields = limited ? personalFields.filter((f) => !f.admin) : personalFields;
  const visibleEmploymentFields = limited ? employmentFields.filter((f) => !f.admin) : employmentFields;

  // Categories that are entirely Administrator-only are skipped for limited viewers.
  const showHealth = !limited;
  const showSoftware = !limited;
  const showHomeAddress = !limited;
  const showEmergency = !limited;
  const showOfficeAddress = !limited;
  const showGroups = !limited;
  const showProperty = !limited;

  // Edit/Save/Cancel buttons
  const editBtn = (onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
    >
      <Pencil className="h-3.5 w-3.5" /> Edit
    </button>
  );
  const saveBtn = (onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      disabled={saveMutation.isPending}
      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-neutral-800 disabled:opacity-50"
    >
      <Save className="h-3.5 w-3.5" /> {saveMutation.isPending ? "Saving…" : "Save"}
    </button>
  );
  const cancelBtn = (onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
    >
      <X className="h-3.5 w-3.5" /> Cancel
    </button>
  );

  return (
    <div className="space-y-6">
      {saveMutation.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          Failed to save changes. Please try again.
        </div>
      ) : null}

      {/* ── 1. Personal ──────────────────────────────────────────── */}
      <SectionShell
        number={1}
        title="Personal"
        icon={<UserRound className="h-4 w-4" />}
        editActions={
          canEdit ? (
            editingPersonal ? (
              <>{cancelBtn(cancelPersonal)}{saveBtn(savePersonal)}</>
            ) : (
              editBtn(() => setEditingPersonal(true))
            )
          ) : undefined
        }
      >
        {editingPersonal ? (
          <>
            {/* Non-editable fields shown as read-only */}
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="First Name" value={textOrDash(profile.basics.firstName)} />
              <Field label="Middle Name" value={textOrDash(profile.basics.middleName)} />
              <Field label="Last Name" value={textOrDash(profile.basics.lastName)} />
              <Field label="Personal Email" value={textOrDash(profile.basics.personalEmail)} />
              <EditableField label="Cell Phone Number" value={phoneOrDash(cellPhone)} editing editValue={cellPhone} onChange={setCellPhone} />
              <EditableField label="Work Phone" value={phoneOrDash(workPhone)} editing editValue={workPhone} onChange={setWorkPhone} />
              <Field label="Birth Date" value={formatDate(profile.personal.dateOfBirth)} />
            </dl>

            <SubGroup label="Home Address">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <EditableField label="Street" value={textOrDash(addrLine1)} editing editValue={addrLine1} onChange={setAddrLine1} />
                <EditableField label="Street 2" value={textOrDash(addrLine2)} editing editValue={addrLine2} onChange={setAddrLine2} />
                <EditableField label="City" value={textOrDash(addrCity)} editing editValue={addrCity} onChange={setAddrCity} />
                <EditableField label="State" value={textOrDash(addrState)} editing editValue={addrState} onChange={setAddrState} />
                <EditableField label="Postal Code" value={textOrDash(addrPostal)} editing editValue={addrPostal} onChange={setAddrPostal} />
                <EditableField label="Country" value={textOrDash(addrCountry)} editing editValue={addrCountry} onChange={setAddrCountry} />
              </dl>
            </SubGroup>

            <SubGroup label="Emergency Contacts">
              <div className="space-y-4">
                {emergencyContacts.map((contact, idx) => (
                  <div
                    key={idx}
                    className="rounded-md border border-neutral-200 bg-neutral-50/60 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-semibold text-neutral-600">
                        <input
                          type="checkbox"
                          checked={contact.isPrimary}
                          onChange={(e) => updateEmergencyContact(idx, "isPrimary", e.target.checked)}
                          className="rounded border-neutral-300"
                        />
                        Primary
                      </label>
                      <button
                        type="button"
                        onClick={() => removeEmergencyContact(idx)}
                        className="text-xs font-semibold text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                      <EditableField label="Full Name" value="" editing editValue={contact.fullName} onChange={(v) => updateEmergencyContact(idx, "fullName", v)} />
                      <EditableField label="Phone" value="" editing editValue={contact.phoneNumber} onChange={(v) => updateEmergencyContact(idx, "phoneNumber", v)} />
                      <EditableField label="Email" value="" editing editValue={contact.email} onChange={(v) => updateEmergencyContact(idx, "email", v)} />
                    </dl>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addEmergencyContact}
                  className="rounded-md border border-dashed border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-600 hover:border-neutral-400 hover:text-neutral-800"
                >
                  + Add Emergency Contact
                </button>
              </div>
            </SubGroup>
          </>
        ) : (
          <>
            <FieldGrid items={visiblePersonalFields} />

            {showHomeAddress ? (
              <SubGroup label="Home Address">
                <Field label="Address" value={homeAddress} />
              </SubGroup>
            ) : null}

            {showEmergency ? (
              <SubGroup label="Emergency Contacts">
                {profile.emergencyContacts.length === 0 ? (
                  <p className="text-sm font-medium text-neutral-500">No emergency contacts on file.</p>
                ) : (
                  <div className="space-y-4">
                    {profile.emergencyContacts.map((contact, index) => (
                      <dl
                        key={`${contact.fullName}-${index}`}
                        className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-md border border-neutral-100 bg-neutral-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
                      >
                        <div className="flex items-center gap-2">
                          <Field label="Name" value={textOrDash(contact.fullName)} />
                          {contact.isPrimary ? (
                            <span className="mt-4 rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              Primary
                            </span>
                          ) : null}
                        </div>
                        <Field label="Phone" value={phoneOrDash(contact.phoneNumber)} />
                        <Field label="Email" value={textOrDash(contact.email)} />
                      </dl>
                    ))}
                  </div>
                )}
              </SubGroup>
            ) : null}
          </>
        )}
      </SectionShell>

      {/* ── 2. Employment information ────────────────────────────── */}
      <SectionShell
        number={2}
        title="Employment information"
        icon={<Briefcase className="h-4 w-4" />}
        editActions={
          canEdit ? (
            editingEmployment ? (
              <>{cancelBtn(cancelEmployment)}{saveBtn(saveEmployment)}</>
            ) : (
              editBtn(() => setEditingEmployment(true))
            )
          ) : undefined
        }
      >
        {editingEmployment ? (
          <>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Title" value={textOrDash(profile.employment.title)} />
              <Field label="Access Level" value={textOrDash(profile.employment.accessLevel)} />
              <Field label="Work Email" value={textOrDash(profile.basics.email)} />
              <Field label="Office" value={textOrDash(profile.employment.office)} />
              <div>
                <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                  Workstation
                </label>
                <select
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  value={workstation}
                  onChange={(e) => setWorkstation(e.target.value)}
                >
                  <option value="">— Select —</option>
                  {workstationOffices.map((office) => (
                    <optgroup key={office.officeCode} label={office.officeCode}>
                      {office.workstations.map((ws) => (
                        <option key={ws.workLocationId} value={ws.locationCode}>
                          {ws.locationCode}{ws.isAssigned && ws.assignedToEmail ? ` (${ws.assignedToEmail})` : ""}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  {workstation && !allWorkstations.some((ws) => ws.locationCode === workstation) ? (
                    <option value={workstation}>{workstation}</option>
                  ) : null}
                </select>
              </div>
              <Field label="Work Authorization" value={textOrDash(profile.employment.workAuthorization)} />
              <Field label="Department" value={textOrDash(profile.basics.department)} />
              <Field label="Department Rank" value={textOrDash(profile.employment.departmentRank)} />
              <Field label="Role" value={textOrDash(profile.basics.role)} />
              <Field label="Company" value={textOrDash(profile.basics.company)} />
              <Field label="Start Date at IAE" value={formatDate(profile.employment.startDate)} />
              <Field label="Years of Service" value={textOrDash(profile.employment.yearsOfService)} />
              <Field label="Supervisor" value={textOrDash(profile.employment.supervisor)} />
              <Field label="Employment Status" value={textOrDash(profile.employment.employmentStatus)} />
              <Field label="Employment Type" value={textOrDash(profile.employment.employmentType)} />
              <Field label="Paid Time Off Accrual Rate" value={textOrDash(profile.employment.ptoAccrualRate)} />
              <Field label="Employment Agreement Fully Executed" value={textOrDash(profile.employment.employmentAgreement)} />
              <Field label="Ramp Account" value={textOrDash(profile.employment.rampAccount)} />
              <Field label="Ramp Credit Card" value={textOrDash(profile.employment.rampCreditCard)} />
            </dl>
            {showOfficeAddress ? (
              <SubGroup label="Office Address">
                <Field label="Address" value={officeAddress} />
              </SubGroup>
            ) : null}
          </>
        ) : (
          <>
            <FieldGrid items={visibleEmploymentFields} />
            {showOfficeAddress ? (
              <SubGroup label="Office Address">
                <Field label="Address" value={officeAddress} />
              </SubGroup>
            ) : null}
          </>
        )}
      </SectionShell>

      {/* ── 3. Health Insurance information ──────────────────────── */}
      {showHealth ? (
        <SectionShell number={3} title="Health Insurance information" icon={<HeartPulse className="h-4 w-4" />}>
          {health ? (
            <>
              <dl className="mb-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Health Insurance Status" value={textOrDash(health.insuranceEligibility)} />
                <Field label="Tenure Tier" value={health.tenureTier || "—"} />
              </dl>
              {health.elections.length === 0 ? (
                <p className="text-sm font-medium text-neutral-500">No insurance elections on file.</p>
              ) : (
                <div className="space-y-4">
                  {health.elections.map((election) => (
                    <InsuranceCard
                      key={election.insuranceType}
                      election={election}
                      companyContributionPerPayPeriod={
                        election.insuranceType === "Medical"
                          ? health.companyContributionPerPayPeriod
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm font-medium text-neutral-500">
              Health insurance information isn't available.
            </p>
          )}
        </SectionShell>
      ) : null}

      {/* ── 4. Company Property Assignments ──────────────────────── */}
      {showProperty ? (
        <SectionShell
          number={4}
          title="Company Property Assignments"
          icon={<Laptop className="h-4 w-4" />}
          editActions={
            canEdit ? (
              editingProperty ? (
                <>{cancelBtn(cancelProperty)}{saveBtn(saveProperty)}</>
              ) : (
                editBtn(() => setEditingProperty(true))
              )
            ) : undefined
          }
        >
          {editingProperty ? (
            <>
              <SubGroup label="Desk Phone">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Desk Phone Number" value={textOrDash(profile.equipment.deskPhoneNumber)} />
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">Desk Phone Extension</label>
                    <select
                      className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                      value={selectedExtensionId ?? ""}
                      onChange={(e) => setSelectedExtensionId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">— Select Extension —</option>
                      {phoneExtensions.map((ext) => (
                        <option key={ext.extensionId} value={ext.extensionId}>
                          {ext.extensionNumber}{ext.isAssigned && ext.assignedToEmail ? ` (${ext.assignedToEmail})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">Desk Phone Device</label>
                    <select
                      className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                      value={selectedPhoneId ?? ""}
                      onChange={(e) => setSelectedPhoneId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">— Select Phone —</option>
                      {phoneDevices.map((phone) => (
                        <option key={phone.phoneId} value={phone.phoneId}>
                          {phone.make} {phone.model} — {phone.macAddress}{phone.isAssigned && phone.assignedToEmail ? ` (${phone.assignedToEmail})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </dl>
              </SubGroup>
              <SubGroup label="PC">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">Computer</label>
                    <select
                      className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                      value={selectedComputerId ?? ""}
                      onChange={(e) => setSelectedComputerId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">— Select Computer —</option>
                      {pcDevices.map((pc) => (
                        <option key={pc.computerId} value={pc.computerId}>
                          {pc.make} {pc.model} — {pc.serviceTag}{pc.isAssigned && pc.assignedToEmail ? ` (${pc.assignedToEmail})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </dl>
              </SubGroup>
            </>
          ) : (
            <FieldGrid items={[
              { label: "Desk Phone Number", value: textOrDash(profile.equipment.deskPhoneNumber) },
              { label: "Desk Phone Extension", value: textOrDash(profile.equipment.deskPhoneExtension) },
              { label: "Desk Phone MAC Address", value: textOrDash(profile.equipment.deskPhoneMac), admin: true },
              { label: "Desk Phone Brand", value: textOrDash(profile.equipment.deskPhoneBrand), admin: true },
              { label: "Desk Phone Model", value: textOrDash(profile.equipment.deskPhoneModel), admin: true },
              { label: "PC Brand", value: textOrDash(profile.equipment.pcBrand), admin: true },
              { label: "PC Model", value: textOrDash(profile.equipment.pcModel), admin: true },
              { label: "PC Service Tag", value: textOrDash(profile.equipment.pcServiceTag), admin: true },
              { label: "Bluetooth Status", value: textOrDash(profile.equipment.bluetoothStatus), admin: true },
              { label: "PC Windows Name", value: textOrDash(profile.equipment.pcWindowsName), admin: true },
            ]} />
          )}
        </SectionShell>
      ) : null}

      {/* ── 5. Software assets ───────────────────────────────────── */}
      {showSoftware ? (
        <SectionShell number={5} title="Software assets" icon={<KeyRound className="h-4 w-4" />}>
          <dt className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
            Microsoft Office License
          </dt>
          <TagList items={licenses} empty="No licenses found." />
        </SectionShell>
      ) : null}

      {/* ── 6. Group Membership ──────────────────────────────────── */}
      {showGroups ? (
        <SectionShell number={6} title="Group Membership" icon={<Users className="h-4 w-4" />}>
          <dt className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
            Microsoft Group Membership
          </dt>
          <TagList items={groups} empty="No group memberships found." />
        </SectionShell>
      ) : null}

      {/* ── 7. Certifications ────────────────────────────────────── */}
      <SectionShell number={7} title="Certifications" icon={<Award className="h-4 w-4" />}>
        {certifications.length === 0 ? (
          <p className="text-sm font-medium text-neutral-500">No certifications on file.</p>
        ) : (
          <div className="space-y-4">
            {certifications.map((cert) => (
              <CertificationRow key={cert.submissionId} cert={cert} />
            ))}
          </div>
        )}
      </SectionShell>

      {/* ── 8. Experience ────────────────────────────────────────── */}
      <SectionShell number={8} title="Experience" icon={<Ticket className="h-4 w-4" />}>
        <div className="space-y-5">
          <div>
            <dt className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
              Engagements Assigned To Work On
            </dt>
            <TagList items={experience?.engagementsAssignedTo ?? []} empty="None assigned." />
          </div>
          <div>
            <dt className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
              Engagements Worked On
            </dt>
            <TagList items={experience?.engagementsWorkedOn ?? []} empty="None yet." />
          </div>
          <div>
            <dt className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
              <Map className="h-3.5 w-3.5" /> Markets Worked In
            </dt>
            <TagList items={experience?.marketsWorkedIn ?? []} empty="No markets yet." />
          </div>
        </div>
      </SectionShell>
    </div>
  );
}
