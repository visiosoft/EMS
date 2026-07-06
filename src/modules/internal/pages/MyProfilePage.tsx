import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  BadgeCheck,
  Briefcase,
  HeartPulse,
  Home,
  Laptop,
  Loader2,
  MapPin,
  ShieldAlert,
  Users,
  UserRound,
} from "lucide-react";
import { fetchMySelfProfile, type SelfProfileAddress } from "@/api/selfProfileApi";
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

function maskedSsn(last4: string | null | undefined): string {
  const trimmed = (last4 ?? "").trim();
  return trimmed ? `•••-••-${trimmed.slice(-4)}` : "—";
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
            <ProfileCard title="Basics" icon={<UserRound className="h-4 w-4" />}>
              <Field label="Name" value={textOrDash(fullName)} />
              <Field label="Department" value={textOrDash(profile.basics.department)} />
              <Field label="Role" value={textOrDash(profile.basics.role)} />
              <Field label="Company" value={textOrDash(profile.basics.company)} />
              <Field label="Work Email" value={textOrDash(profile.basics.email)} />
              <Field label="Personal Email" value={textOrDash(profile.basics.personalEmail)} />
              <Field label="Cell Phone" value={phoneOrDash(profile.basics.cellPhone)} />
              <Field label="Work Phone" value={phoneOrDash(profile.basics.workPhone)} />
            </ProfileCard>

            <ProfileCard title="Personal" icon={<BadgeCheck className="h-4 w-4" />}>
              <Field label="Date of Birth" value={formatDate(profile.personal.dateOfBirth)} />
              <Field label="Gender" value={textOrDash(profile.personal.gender)} />
              <Field label="Marital Status" value={textOrDash(profile.personal.maritalStatus)} />
              <Field label="Ethnicity" value={textOrDash(profile.personal.ethnicity)} />
              <Field label="SSN" value={maskedSsn(profile.personal.ssnLast4)} />
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

            <ProfileCard title="Employment" icon={<Briefcase className="h-4 w-4" />}>
              <Field label="Access Level" value={textOrDash(profile.employment.accessLevel)} />
              <Field label="Work Authorization" value={textOrDash(profile.employment.workAuthorization)} />
              <Field label="Employment Status" value={textOrDash(profile.employment.employmentStatus)} />
              <Field label="Employment Type" value={textOrDash(profile.employment.employmentType)} />
              <Field label="Start Date" value={formatDate(profile.employment.startDate)} />
              <Field label="Hire Date" value={formatDate(profile.employment.hireDate)} />
              <Field label="Termination Date" value={formatDate(profile.employment.terminationDate)} />
              <Field label="Supervisor" value={textOrDash(profile.employment.supervisor)} />
              <Field label="Pay Type" value={textOrDash(profile.employment.payType)} />
              <Field label="Pay Rate" value={textOrDash(profile.employment.payRate)} />
              <Field label="PTO Accrual Rate" value={textOrDash(profile.employment.ptoAccrualRate)} />
              <Field label="Employment Agreement" value={textOrDash(profile.employment.employmentAgreement)} />
              <Field label="Ramp Account" value={textOrDash(profile.employment.rampAccount)} />
              <Field label="Ramp Credit Card" value={textOrDash(profile.employment.rampCreditCard)} />
              <Field label="Workstation" value={textOrDash(profile.employment.workstation)} />
            </ProfileCard>

            <ProfileCard title="Office Address" icon={<MapPin className="h-4 w-4" />}>
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Address" value={formatAddress(profile.officeAddress)} />
              </div>
            </ProfileCard>

            <ProfileCard title="Equipment" icon={<Laptop className="h-4 w-4" />}>
              <Field label="Desk Phone Extension" value={textOrDash(profile.equipment.deskPhoneExtension)} />
              <Field label="Desk Phone MAC" value={textOrDash(profile.equipment.deskPhoneMac)} />
              <Field label="Desk Phone Brand" value={textOrDash(profile.equipment.deskPhoneBrand)} />
              <Field label="Desk Phone Model" value={textOrDash(profile.equipment.deskPhoneModel)} />
              <Field label="PC Brand" value={textOrDash(profile.equipment.pcBrand)} />
              <Field label="PC Model" value={textOrDash(profile.equipment.pcModel)} />
              <Field label="PC Service Tag" value={textOrDash(profile.equipment.pcServiceTag)} />
              <Field label="Bluetooth" value={textOrDash(profile.equipment.bluetoothStatus)} />
              <Field label="PC Windows Name" value={textOrDash(profile.equipment.pcWindowsName)} />
            </ProfileCard>

            <section className="rounded-lg border border-neutral-200 bg-white p-5 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-neutral-950">
                <span className="rounded-md bg-neutral-100 p-1.5 text-neutral-800" aria-hidden>
                  <HeartPulse className="h-4 w-4" />
                </span>
                Health Insurance
              </h2>
              {profile.healthInsurance.length === 0 ? (
                <p className="text-sm font-medium text-neutral-500">No health insurance enrollments on file.</p>
              ) : (
                <div className="space-y-4">
                  {profile.healthInsurance.map((plan, index) => (
                    <dl
                      key={`${plan.insuranceType}-${index}`}
                      className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-md border border-neutral-100 bg-neutral-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
                    >
                      <div className="flex items-center gap-2">
                        <Field label="Coverage" value={textOrDash(plan.insuranceType)} />
                        <span
                          className={`mt-4 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            plan.optInStatus.toLowerCase().includes("opt-in")
                              ? "bg-emerald-600 text-white"
                              : "bg-neutral-300 text-neutral-800"
                          }`}
                        >
                          {textOrDash(plan.optInStatus)}
                        </span>
                      </div>
                      <Field label="Plan" value={textOrDash(plan.planName)} />
                      <Field label="Plan Type" value={textOrDash(plan.planType)} />
                      <Field label="Covered" value={textOrDash(plan.additionalInsureds)} />
                    </dl>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </main>
    </InternalPageFrame>
  );
}
