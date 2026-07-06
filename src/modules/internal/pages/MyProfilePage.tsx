import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  BadgeCheck,
  Briefcase,
  Eye,
  EyeOff,
  HeartPulse,
  Home,
  KeyRound,
  Laptop,
  Loader2,
  Map,
  MapPin,
  ShieldAlert,
  Ticket,
  Users,
  UserRound,
} from "lucide-react";
import {
  fetchMySelfProfile,
  type SelfProfileAddress,
  type SelfProfileInsuranceElection,
} from "@/api/selfProfileApi";
import { formatE164ForDisplay } from "@/lib/contactPhoneField";
import { InternalPageHero } from "../components/InternalPageHero";
import { InternalPageFrame } from "../layout/InternalPageFrame";

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
  const hasValue = value.trim() !== "" && value !== "—";
  return (
    <div>
      <dt className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
        {label}
        {hasValue ? (
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
        {hasValue ? (shown ? value : "••••••") : "—"}
      </dd>
    </div>
  );
}

function ProfileCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-neutral-950">
        <span className="rounded-md bg-neutral-100 p-1.5 text-neutral-800" aria-hidden>
          {icon}
        </span>
        {title}
      </h2>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
    </section>
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

export function MyProfilePage() {
  const profileQuery = useQuery({
    queryKey: ["self-profile"],
    queryFn: fetchMySelfProfile,
    retry: 1,
  });

  const data = profileQuery.data;
  const profile = data && data.linked ? data : null;
  const notLinked = data ? !data.linked : false;

  const fullName = profile
    ? [profile.basics.firstName, profile.basics.middleName, profile.basics.lastName]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(" ")
    : "";

  const health = profile?.healthInsurance ?? null;
  const experience = profile?.experience ?? null;

  return (
    <InternalPageFrame>
      <InternalPageHero
        title="My Profile"
        subtitle="Your personal, contact, and employment details on file with iAE."
      />

      <main className="mx-auto w-full max-w-[1060px] px-5 pb-16 pt-14 sm:px-8 lg:px-0">
        {profileQuery.isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" aria-hidden />
            <span className="sr-only">Loading your profile</span>
          </div>
        ) : null}

        {profileQuery.isError ? (
          <div className="mx-auto max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-6 py-8 text-center">
            <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-amber-600" aria-hidden />
            <h2 className="text-base font-semibold text-amber-900">Couldn't load your profile</h2>
            <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
              Something went wrong reaching the iAE directory. Please refresh the page, or try again
              in a moment.
            </p>
          </div>
        ) : null}

        {notLinked ? (
          <div className="mx-auto max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-6 py-8 text-center">
            <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-amber-600" aria-hidden />
            <h2 className="text-base font-semibold text-amber-900">No employee profile linked yet</h2>
            <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
              Your sign-in isn't linked to an iAE employee record, so profile details can't be
              shown. Contact HR or your administrator to have your account connected.
            </p>
          </div>
        ) : null}

        {profile ? (
          <div className="space-y-5">
            {/* ── Personal ─────────────────────────────────────────────── */}
            <ProfileCard title="Personal Information" icon={<UserRound className="h-4 w-4" />}>
              <Field label="First Name" value={textOrDash(profile.basics.firstName)} />
              <Field label="Middle Name" value={textOrDash(profile.basics.middleName)} />
              <Field label="Last Name" value={textOrDash(profile.basics.lastName)} />
              <Field label="Personal Email" value={textOrDash(profile.basics.personalEmail)} />
              <Field label="Cell Phone Number" value={phoneOrDash(profile.basics.cellPhone)} />
              <Field label="Birth Date" value={formatDate(profile.personal.dateOfBirth)} />
              <RevealField
                label="Social Security Number"
                value={profile.personal.ssnLast4 ? `•••-••-${profile.personal.ssnLast4}` : "—"}
              />
              <RevealField
                label="Age"
                value={profile.personal.age != null ? String(profile.personal.age) : "—"}
              />
              <Field label="Gender" value={textOrDash(profile.personal.gender)} />
              <Field label="Marital Status" value={textOrDash(profile.personal.maritalStatus)} />
              <Field label="Ethnicity" value={textOrDash(profile.personal.ethnicity)} />
            </ProfileCard>

            <ProfileCard title="Home Address" icon={<Home className="h-4 w-4" />}>
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Address" value={formatAddress(profile.homeAddress)} />
              </div>
            </ProfileCard>

            <section className="rounded-lg border border-neutral-200 bg-white p-5 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-neutral-950">
                <span className="rounded-md bg-neutral-100 p-1.5 text-neutral-800" aria-hidden>
                  <Users className="h-4 w-4" />
                </span>
                Emergency Contacts
              </h2>
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
            </section>

            {/* ── Employment ───────────────────────────────────────────── */}
            <ProfileCard title="Employment Information" icon={<Briefcase className="h-4 w-4" />}>
              <Field label="Title" value={textOrDash(profile.employment.title)} />
              <Field label="Access Level" value={textOrDash(profile.employment.accessLevel)} />
              <Field label="Work Email" value={textOrDash(profile.basics.email)} />
              <Field label="Office" value={textOrDash(profile.employment.office)} />
              <Field label="Workstation" value={textOrDash(profile.employment.workstation)} />
              <Field label="Work Authorization" value={textOrDash(profile.employment.workAuthorization)} />
              <Field label="Department" value={textOrDash(profile.basics.department)} />
              <Field label="Role" value={textOrDash(profile.basics.role)} />
              <Field label="Company" value={textOrDash(profile.basics.company)} />
              <Field label="Start Date at IAE" value={formatDate(profile.employment.startDate)} />
              <Field label="Years of Service" value={textOrDash(profile.employment.yearsOfService)} />
              <Field label="Supervisor" value={textOrDash(profile.employment.supervisor)} />
              <Field label="Paid Time Off Accrual Rate" value={textOrDash(profile.employment.ptoAccrualRate)} />
              <Field
                label="Employment Agreement Fully Executed"
                value={textOrDash(profile.employment.employmentAgreement)}
              />
              <Field label="Ramp Account" value={textOrDash(profile.employment.rampAccount)} />
              <Field label="Ramp Credit Card" value={textOrDash(profile.employment.rampCreditCard)} />
            </ProfileCard>

            <ProfileCard title="Office Address" icon={<MapPin className="h-4 w-4" />}>
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Address" value={formatAddress(profile.officeAddress)} />
              </div>
            </ProfileCard>

            <ProfileCard title="Desk Phone & Computer" icon={<Laptop className="h-4 w-4" />}>
              <Field label="Desk Phone Number" value={textOrDash(profile.equipment.deskPhoneNumber)} />
              <Field label="Desk Phone Extension" value={textOrDash(profile.equipment.deskPhoneExtension)} />
              <Field label="Desk Phone MAC Address" value={textOrDash(profile.equipment.deskPhoneMac)} />
              <Field label="Desk Phone Brand" value={textOrDash(profile.equipment.deskPhoneBrand)} />
              <Field label="Desk Phone Model" value={textOrDash(profile.equipment.deskPhoneModel)} />
              <Field label="PC Brand" value={textOrDash(profile.equipment.pcBrand)} />
              <Field label="PC Model" value={textOrDash(profile.equipment.pcModel)} />
              <Field label="PC Service Tag" value={textOrDash(profile.equipment.pcServiceTag)} />
              <Field label="Bluetooth Status" value={textOrDash(profile.equipment.bluetoothStatus)} />
              <Field label="PC Windows Name" value={textOrDash(profile.equipment.pcWindowsName)} />
            </ProfileCard>

            <section className="rounded-lg border border-neutral-200 bg-white p-5 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-neutral-950">
                <span className="rounded-md bg-neutral-100 p-1.5 text-neutral-800" aria-hidden>
                  <KeyRound className="h-4 w-4" />
                </span>
                Microsoft 365
              </h2>
              <div className="space-y-4">
                <div>
                  <dt className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                    Microsoft Office License
                  </dt>
                  <TagList items={profile.entra.microsoftOfficeLicenses} empty="No licenses found." />
                </div>
                <div>
                  <dt className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                    Microsoft Group Membership
                  </dt>
                  <TagList items={profile.entra.microsoftGroups} empty="No group memberships found." />
                </div>
              </div>
            </section>

            {/* ── Health Insurance ─────────────────────────────────────── */}
            <section className="rounded-lg border border-neutral-200 bg-white p-5 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-neutral-950">
                <span className="rounded-md bg-neutral-100 p-1.5 text-neutral-800" aria-hidden>
                  <HeartPulse className="h-4 w-4" />
                </span>
                Health Insurance
              </h2>
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
                    <p className="text-sm font-medium text-neutral-500">
                      No insurance elections on file.
                    </p>
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
            </section>

            {/* ── Experience ───────────────────────────────────────────── */}
            <section className="rounded-lg border border-neutral-200 bg-white p-5 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-neutral-950">
                <span className="rounded-md bg-neutral-100 p-1.5 text-neutral-800" aria-hidden>
                  <Ticket className="h-4 w-4" />
                </span>
                Experience
              </h2>
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
            </section>
          </div>
        ) : null}
      </main>
    </InternalPageFrame>
  );
}
