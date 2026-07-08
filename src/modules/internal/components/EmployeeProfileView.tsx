import { useState, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import {
  Award,
  Briefcase,
  Eye,
  EyeOff,
  HeartPulse,
  KeyRound,
  Laptop,
  Map,
  Ticket,
  Users,
  UserRound,
} from "lucide-react";
import type {
  LinkedSelfProfile,
  SelfProfileAddress,
  SelfProfileCertification,
  SelfProfileInsuranceElection,
} from "@/api/selfProfileApi";
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
}: {
  number: number;
  title: string;
  icon: ReactNode;
  children: ReactNode;
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

function InsuranceCard({ election }: { election: SelfProfileInsuranceElection }) {
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
export function EmployeeProfileView({ profile }: { profile: LinkedSelfProfile }) {
  const limited = profile.visibility === "limited";

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
    { label: "Gender", value: textOrDash(profile.personal.gender), admin: true },
    { label: "Marital Status", value: textOrDash(profile.personal.maritalStatus), admin: true },
    { label: "Ethnicity", value: textOrDash(profile.personal.ethnicity), admin: true },
  ];

  const employmentFields: FieldItem[] = [
    { label: "Title", value: textOrDash(profile.employment.title) },
    { label: "Access Level", value: textOrDash(profile.employment.accessLevel), admin: true },
    { label: "Work Email", value: textOrDash(profile.basics.email) },
    { label: "Office", value: textOrDash(profile.employment.office) },
    { label: "Workstation", value: textOrDash(profile.employment.workstation) },
    { label: "Work Authorization", value: textOrDash(profile.employment.workAuthorization), admin: true },
    { label: "Department", value: textOrDash(profile.basics.department) },
    { label: "Role", value: textOrDash(profile.basics.role) },
    { label: "Company", value: textOrDash(profile.basics.company) },
    { label: "Start Date at IAE", value: formatDate(profile.employment.startDate) },
    { label: "Years of Service", value: textOrDash(profile.employment.yearsOfService) },
    { label: "Supervisor", value: textOrDash(profile.employment.supervisor) },
    { label: "Paid Time Off Accrual Rate", value: textOrDash(profile.employment.ptoAccrualRate), admin: true },
    {
      label: "Employment Agreement Fully Executed",
      value: textOrDash(profile.employment.employmentAgreement),
      admin: true,
    },
    { label: "Ramp Account", value: textOrDash(profile.employment.rampAccount), admin: true },
    { label: "Ramp Credit Card", value: textOrDash(profile.employment.rampCreditCard), admin: true },
  ];

  const propertyFields: FieldItem[] = [
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
  ];

  const visiblePersonalFields = limited ? personalFields.filter((f) => !f.admin) : personalFields;
  const visibleEmploymentFields = limited ? employmentFields.filter((f) => !f.admin) : employmentFields;
  const visiblePropertyFields = limited ? propertyFields.filter((f) => !f.admin) : propertyFields;

  // Categories that are entirely Administrator-only (per xlsx) are skipped for limited viewers.
  const showHealth = !limited;
  const showSoftware = !limited;
  const showHomeAddress = !limited;
  const showEmergency = !limited;

  return (
    <div className="space-y-6">
      {/* ── 1. Personal ──────────────────────────────────────────── */}
      <SectionShell number={1} title="Personal" icon={<UserRound className="h-4 w-4" />}>
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
                    <Field label="Relationship" value={textOrDash(contact.relationship)} />
                    <Field label="Phone" value={phoneOrDash(contact.phoneNumber)} />
                    <Field label="Email" value={textOrDash(contact.email)} />
                  </dl>
                ))}
              </div>
            )}
          </SubGroup>
        ) : null}
      </SectionShell>

      {/* ── 2. Employment information ────────────────────────────── */}
      <SectionShell number={2} title="Employment information" icon={<Briefcase className="h-4 w-4" />}>
        <FieldGrid items={visibleEmploymentFields} />
        <SubGroup label="Office Address">
          <Field label="Address" value={officeAddress} />
        </SubGroup>
      </SectionShell>

      {/* ── 3. Health Insurance information ──────────────────────── */}
      {showHealth ? (
        <SectionShell number={3} title="Health Insurance information" icon={<HeartPulse className="h-4 w-4" />}>
          {health ? (
            <>
              <dl className="mb-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Health Insurance Status" value={textOrDash(health.insuranceEligibility)} />
                <Field
                  label="Company Contribution Per Pay Period"
                  value={
                    health.companyContributionPerPayPeriod > 0
                      ? currency.format(health.companyContributionPerPayPeriod)
                      : "—"
                  }
                />
              </dl>
              {health.elections.length === 0 ? (
                <p className="text-sm font-medium text-neutral-500">No insurance elections on file.</p>
              ) : (
                <div className="space-y-4">
                  {health.elections.map((election) => (
                    <InsuranceCard key={election.insuranceType} election={election} />
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
      <SectionShell number={4} title="Company Property Assignments" icon={<Laptop className="h-4 w-4" />}>
        <FieldGrid items={visiblePropertyFields} />
      </SectionShell>

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
      <SectionShell number={6} title="Group Membership" icon={<Users className="h-4 w-4" />}>
        <dt className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
          Microsoft Group Membership
        </dt>
        <TagList items={groups} empty="No group memberships found." />
      </SectionShell>

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
