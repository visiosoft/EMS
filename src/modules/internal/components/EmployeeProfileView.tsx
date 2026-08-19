import { useState, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { useMutation, useQuery, useQueryClient, useIsFetching } from "@tanstack/react-query";
import {
  Award,
  Briefcase,
  Eye,
  EyeOff,
  HeartPulse,
  KeyRound,
  Laptop,
  Loader2,
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
import { ToastContainer, type ToastItem } from "@/components/ems/Primitives";
import { fetchWorkstations } from "@/api/employeeEmploymentApi";
import { fetchEmployeeHealthInsurance, bulkUpdateHealthInsurance, type HealthPlanOption, type BulkUpdateHealthInsuranceRequest, type EmployeeHealthInsurance } from "@/api/employeeHealthInsuranceApi";
import { formatE164ForDisplay } from "@/lib/contactPhoneField";
import { EntraSyncButton } from "@/components/ems/EntraSyncButton";

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
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">{label}</dt>
      <dd className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm font-medium text-neutral-900 break-words">{value}</dd>
    </div>
  );
}

function LinkField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">{label}</dt>
      <dd className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm font-medium break-words">
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{value}</a>
      </dd>
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
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </label>
      <input
        type="text"
        className="block w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
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
    <div className="flex flex-col gap-1">
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
      <dd className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm font-medium text-neutral-900 break-words">
        {has ? (shown ? value : "••••••") : "—"}
      </dd>
    </div>
  );
}

type ProfileSection = "Personal" | "Employment" | "Health Insurance" | "Property" | "Licenses & Groups" | "Certifications" | "Experience";

const sectionIcons: Record<ProfileSection, ReactNode> = {
  Personal: <UserRound className="h-3.5 w-3.5" />,
  Employment: <Briefcase className="h-3.5 w-3.5" />,
  "Health Insurance": <HeartPulse className="h-3.5 w-3.5" />,
  Property: <Laptop className="h-3.5 w-3.5" />,
  "Licenses & Groups": <KeyRound className="h-3.5 w-3.5" />,
  Certifications: <Award className="h-3.5 w-3.5" />,
  Experience: <Ticket className="h-3.5 w-3.5" />,
};

function ProfileTabBar({ tabs, active, onChange }: { tabs: ProfileSection[]; active: ProfileSection; onChange: (t: ProfileSection) => void }) {
  return (
    <div className="flex border-b border-neutral-200 overflow-x-auto -mx-2 px-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm sm:px-4 font-medium transition-colors relative whitespace-nowrap ${
            active === tab
              ? "text-neutral-950 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-neutral-900"
              : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          {sectionIcons[tab]}
          {tab}
        </button>
      ))}
    </div>
  );
}

function TabFooterActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4 mt-4">
      {children}
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
  number?: number;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  editActions?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-5 py-4 sm:px-6">
        {number != null && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-bold tabular-nums text-white">
            {String(number).padStart(2, "0")}
          </span>
        )}
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

type FieldItem = { label: string; value: string; kind?: "text" | "reveal"; admin?: boolean; link?: boolean; public?: boolean };

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
        ) : item.link && item.value !== "—" ? (
          <LinkField key={item.label} label={item.label} value={item.value} />
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <WmsReadOnlyField label="Chosen Plan" value={textOrDash(election.planName)} />
            <WmsReadOnlyField label="Additional Insureds" value={textOrDash(election.additionalInsureds)} />
            <WmsReadOnlyField label="Plan Price" value={textOrDash(election.planPrice)} />
            <WmsReadOnlyField label="Monthly Rate" value={textOrDash(election.monthlyRate)} />
            <WmsReadOnlyField label="Payroll Deduction" value={textOrDash(election.payrollDeduction)} />
            {companyContributionPerPayPeriod != null && companyContributionPerPayPeriod > 0 ? (
              <WmsReadOnlyField label="Company Contribution Per Pay Period" value={currency.format(companyContributionPerPayPeriod)} />
            ) : null}
          </div>
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

// ─── Health-insurance sub-components (WMS) ────────────────────────────────────

function WmsSelectField({
  label, value, onChange, options, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-neutral-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 disabled:opacity-50"
      >
        <option value="">— Select —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function WmsReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-neutral-500">{label}</label>
      <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-700 cursor-default">
        {value || "—"}
      </div>
    </div>
  );
}

function WmsInsuranceSection({
  insuranceType,
  plans,
  optIn,
  setOptIn,
  planId,
  setPlanId,
  additionalInsureds,
  setAdditionalInsureds,
  price,
  setPrice,
  benefits,
  setBenefits,
  rate,
  setRate,
  deduction,
  setDeduction,
  companyContrib,
  setCompanyContrib,
  tenureTier,
  benchmarkBiweekly,
  editable,
}: {
  insuranceType: "Medical" | "Dental" | "Vision";
  plans: HealthPlanOption[];
  optIn: string;
  setOptIn: (v: string) => void;
  planId: string;
  setPlanId: (v: string) => void;
  additionalInsureds: string;
  setAdditionalInsureds: (v: string) => void;
  price: string;
  setPrice: (v: string) => void;
  benefits: string;
  setBenefits: (v: string) => void;
  rate?: string;
  setRate?: (v: string) => void;
  deduction: string;
  setDeduction: (v: string) => void;
  companyContrib: string;
  setCompanyContrib: (v: string) => void;
  tenureTier: "<1 yr" | "1+ yr" | null;
  benchmarkBiweekly: number;
  editable: boolean;
}) {
  const typePlans = plans.filter((p) => p.planType === insuranceType);
  const planOptions = typePlans.map((p) => ({ value: String(p.healthPlanId), label: p.planName }));

  const opted = optIn.toLowerCase().includes("opt-in") || optIn.toLowerCase().includes("opt in");

  const coverageOptions = useMemo(() => {
    if (!planId) return [];
    const plan = plans.find((p) => String(p.healthPlanId) === planId);
    if (!plan) return [];
    const bases = new Set<string>();
    for (const pr of plan.pricing) {
      bases.add(pr.coverageType.replace(/\s*\(<1 yr\)|\s*\(1\+ yr\)/g, ""));
    }
    return Array.from(bases).sort();
  }, [planId, plans]);

  const recalcPricing = useCallback((currentPlanId: string, currentTier?: string) => {
    if (!currentPlanId) {
      setPrice(""); setBenefits(""); setRate?.(""); setDeduction(""); setCompanyContrib("");
      return;
    }
    const plan = plans.find((p) => String(p.healthPlanId) === currentPlanId);
    if (!plan) return;
    setBenefits(plan.benefits.join("; "));

    let base = currentTier || "Employee";
    if (base === "Employee Only") base = "Employee";

    const coverageType = tenureTier ? `${base} (${tenureTier})` : base;
    let priceEntry = plan.pricing.find((p) => p.coverageType === coverageType);
    if (!priceEntry) {
      const candidates = plan.pricing.filter((p) =>
        p.coverageType.replace(/\s*\(.*\)\s*$/, "").trim().toLowerCase() === base.toLowerCase(),
      );
      if (candidates.length >= 1) {
        const marker = tenureTier === "<1 yr" ? "<1" : "1+";
        priceEntry = candidates.find((p) => p.coverageType.includes(marker)) ?? candidates[0];
      }
    }

    if (priceEntry) {
      const empMonthly = priceEntry.monthlyPremium;
      setPrice(`$${empMonthly.toFixed(2)}/mo`);
      setRate?.(`$${empMonthly.toFixed(2)}/mo`);
      const rules = plan.contributionRules ?? [];
      let employerPct = 0;
      if (rules.length > 0 && tenureTier) {
        const match = rules.find((r) => {
          const t = r.tenureTier.toLowerCase();
          if (tenureTier === "1+ yr") return t.startsWith("1+");
          if (tenureTier === "<1 yr") return t.includes("less than") || t.includes("<1");
          return false;
        });
        if (match) employerPct = match.employerContributionPct;
      }
      const biweekly = (empMonthly * 12) / 26;
      const employerPerPP = employerPct * benchmarkBiweekly;
      const employerApplied = Math.min(employerPerPP, biweekly);
      const payrollDed = Math.round((biweekly - employerApplied) * 100) / 100;
      setDeduction(`$${payrollDed.toFixed(2)}/pay period`);
      setCompanyContrib(`$${employerApplied.toFixed(2)}/pay period`);
    } else {
      setPrice(""); setRate?.(""); setDeduction(""); setCompanyContrib("");
    }
  }, [plans, tenureTier, benchmarkBiweekly, setPrice, setBenefits, setRate, setDeduction, setCompanyContrib]);

  useEffect(() => {
    if (planId && opted) recalcPricing(planId, additionalInsureds);
  }, [additionalInsureds]);

  const handlePlanChange = (newPlanId: string) => {
    setPlanId(newPlanId);
    recalcPricing(newPlanId, additionalInsureds);
  };

  const handleOptInChange = (v: string) => {
    setOptIn(v);
    if (v === "Opt-Out") {
      setPlanId("");
      setPrice(""); setBenefits(""); setRate?.(""); setDeduction(""); setCompanyContrib("");
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-neutral-700">{insuranceType}</h4>
      {editable ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <WmsSelectField label="Enrollment" value={optIn} onChange={handleOptInChange} options={[
            { value: "Opt-In", label: "Opt-In" },
            { value: "Opt-Out", label: "Opt-Out" },
          ]} />
          <WmsSelectField label="Plan" value={planId} onChange={handlePlanChange} options={planOptions} disabled={!opted} />
          <WmsSelectField
            label="Tier"
            value={additionalInsureds}
            onChange={setAdditionalInsureds}
            options={coverageOptions.length > 0
              ? coverageOptions.map((ct) => ({ value: ct, label: ct }))
              : [
                  { value: "Employee", label: "Employee Only" },
                  { value: "Employee + Spouse", label: "Employee + Spouse" },
                  { value: "Employee + Child(ren)", label: "Employee + Child(ren)" },
                  { value: "Employee + Family", label: "Employee + Family" },
                ]}
            disabled={!opted}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <WmsReadOnlyField label="Enrollment" value={optIn || "—"} />
          <WmsReadOnlyField label="Plan" value={!opted ? "—" : (plans.find((p) => String(p.healthPlanId) === planId)?.planName || "—")} />
          <WmsReadOnlyField label="Tier" value={!opted ? "—" : (additionalInsureds || "—")} />
        </div>
      )}
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${rate !== undefined || insuranceType === "Medical" ? "lg:grid-cols-3" : ""} border-t border-neutral-100 pt-3`}>
        <WmsReadOnlyField label="Plan Price" value={!opted ? "—" : (price || "—")} />
        <WmsReadOnlyField label="Benefits" value={!opted ? "—" : (benefits || "—")} />
        {rate !== undefined && <WmsReadOnlyField label="Monthly Rate" value={!opted ? "—" : (rate || "—")} />}
        <WmsReadOnlyField label="Payroll Deduction" value={!opted ? "—" : (deduction || "—")} />
        {insuranceType === "Medical" && <WmsReadOnlyField label="Company Contribution" value={!opted ? "—" : (companyContrib || "—")} />}
      </div>
    </div>
  );
}

export function EmployeeProfileView({ profile, editable = false, targetContactId }: { profile: LinkedSelfProfile; editable?: boolean; targetContactId?: number }) {
  const limited = profile.visibility === "limited" || profile.visibility === "public";
  const isPublic = profile.visibility === "public";
  const canEdit = editable && !limited;
  const canEditAdminFields = canEdit && profile.isAdmin;
  const queryClient = useQueryClient();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const addToast = useCallback((message: string, type: ToastItem['type'], title?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type, title }]);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const profileQueryKey = targetContactId ? ["employee-profile", targetContactId] : ["self-profile"];
  const isRefetchingProfile = useIsFetching({ queryKey: profileQueryKey }) > 0;

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
  const [workAuthLinkUrl, setWorkAuthLinkUrl] = useState(profile.employment.workAuthorizationLinkUrl || "");

  const workstationsQuery = useQuery({
    queryKey: ["workstations"],
    queryFn: fetchWorkstations,
    enabled: canEdit && editingEmployment,
    staleTime: 5 * 60 * 1000,
  });
  const workstationOffices = workstationsQuery.data?.offices ?? [];
  const allWorkstations = workstationOffices.flatMap((o) => o.workstations);

  // ─── Form state: Property section (equipment IDs for dropdown selection)
  const [selectedExtensionId, setSelectedExtensionId] = useState<number | null>(profile.equipment.currentExtensionId);
  const [selectedPhoneId, setSelectedPhoneId] = useState<number | null>(profile.equipment.currentPhoneId);
  const [selectedComputerId, setSelectedComputerId] = useState<number | null>(profile.equipment.currentComputerId);

  // Freeform Entra-CSA-backed equipment fields (admin only) — writes to the
  // linked EquipmentPhone/EquipmentComputer row on save.
  const [deskPhoneMacInput, setDeskPhoneMacInput] = useState(profile.equipment.deskPhoneMac || "");
  const [deskPhoneModelInput, setDeskPhoneModelInput] = useState(profile.equipment.deskPhoneModel || "");
  const [pcServiceTagInput, setPcServiceTagInput] = useState(profile.equipment.pcServiceTag || "");
  const [pcBrandInput, setPcBrandInput] = useState(profile.equipment.pcBrand || "");
  const [pcModelInput, setPcModelInput] = useState(profile.equipment.pcModel || "");
  const [bluetoothStatusInput, setBluetoothStatusInput] = useState(profile.equipment.bluetoothStatus || "");

  // Hoisted so the equipment queries below can prefetch when the Property tab is opened.
  const [activeTab, setActiveTab] = useState<ProfileSection>("Personal");

  // Dropdown options come inline with the profile — no extra network calls.
  const phoneExtensions = profile.equipmentOptions?.phoneExtensions ?? [];
  const phoneDevices = profile.equipmentOptions?.phoneDevices ?? [];
  const pcDevices = profile.equipmentOptions?.pcDevices ?? [];  // ─── Save mutation ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (payload: UpdateMyProfilePayload) =>
      targetContactId
        ? updateEmployeeProfile(targetContactId, payload)
        : updateMyProfile(payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: targetContactId ? ["employee-profile", targetContactId] : ["self-profile"],
      });
      setEditingPersonal(false);
      setEditingEmployment(false);
      setEditingProperty(false);
      if (response.entraSyncWarningCode) {
        addToast(
          response.entraSyncWarning ||
            "Data saved in database, but not updated in Entra. Check permissions/roles or Graph sync errors.",
          "warning",
          "Saved in database, not updated in Entra",
        );
      } else {
        addToast(
          "Data saved in database and updated in Entra.",
          "success",
          "Data saved successfully",
        );
      }
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
    saveMutation.mutate({ workstation, workAuthorizationLinkUrl: workAuthLinkUrl });
  }

  function saveProperty() {
    const payload: UpdateMyProfilePayload = {
      deskPhoneExtensionId: selectedExtensionId,
      deskPhoneId: selectedPhoneId,
      pcComputerId: selectedComputerId,
    };
    if (canEditAdminFields) {
      payload.deskPhoneMac = deskPhoneMacInput;
      payload.deskPhoneModel = deskPhoneModelInput;
      payload.pcServiceTag = pcServiceTagInput;
      payload.pcBrand = pcBrandInput;
      payload.pcModel = pcModelInput;
      payload.bluetoothStatus = bluetoothStatusInput;
    }
    saveMutation.mutate(payload);
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
    setWorkAuthLinkUrl(profile.employment.workAuthorizationLinkUrl || "");
    setEditingEmployment(false);
  }

  function cancelProperty() {
    setSelectedExtensionId(profile.equipment.currentExtensionId);
    setSelectedPhoneId(profile.equipment.currentPhoneId);
    setSelectedComputerId(profile.equipment.currentComputerId);
    setDeskPhoneMacInput(profile.equipment.deskPhoneMac || "");
    setDeskPhoneModelInput(profile.equipment.deskPhoneModel || "");
    setPcServiceTagInput(profile.equipment.pcServiceTag || "");
    setPcBrandInput(profile.equipment.pcBrand || "");
    setPcModelInput(profile.equipment.pcModel || "");
    setBluetoothStatusInput(profile.equipment.bluetoothStatus || "");
    setEditingProperty(false);
  }

  function updateEmergencyContact(idx: number, field: string, value: string | boolean) {
    setEmergencyContacts((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    );
  }

  const health = profile.healthInsurance;
  const experience = profile.experience;
  const certifications = profile.certifications?.certifications ?? [];

  const userEmail = profile.basics.email;
  const syncTargetEmail = targetContactId ? userEmail : undefined;
  const syncInvalidateKeys = targetContactId
    ? [["employee-profile", targetContactId]]
    : [["self-profile"]];

  const homeAddress = formatAddress(profile.homeAddress);
  const officeAddress = formatAddress(profile.officeAddress);
  const licenses = profile.entra.microsoftOfficeLicenses;
  const groups = profile.entra.microsoftGroups;

  const personalFields: FieldItem[] = [
    { label: "First Name", value: textOrDash(profile.basics.firstName), public: true },
    { label: "Middle Name", value: textOrDash(profile.basics.middleName) },
    { label: "Last Name", value: textOrDash(profile.basics.lastName), public: true },
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
    { label: "Title", value: textOrDash(profile.employment.title), public: true },
    { label: "Access Level", value: textOrDash(profile.employment.accessLevel), admin: true },
    { label: "Work Email", value: textOrDash(profile.basics.email), public: true },
    { label: "Office", value: textOrDash(profile.employment.office) },
    { label: "Workstation", value: textOrDash(profile.employment.workstation) },
    { label: "Work Authorization", value: textOrDash(profile.employment.workAuthorization), admin: true },
    { label: "Work Authorization Photos", value: profile.employment.workAuthorizationLinkUrl || "—", link: true, admin: true },
    { label: "Department", value: textOrDash(profile.basics.department), public: true },
    { label: "Department Rank", value: textOrDash(profile.employment.departmentRank) },
    { label: "Role", value: textOrDash(profile.basics.role) },
    { label: "Start Date at IAE", value: formatDate(profile.employment.startDate), admin: true },
    { label: "Years of Service", value: textOrDash(profile.employment.yearsOfService), admin: true },
    { label: "Supervisor", value: textOrDash(profile.employment.supervisor) },
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

  const visiblePersonalFields = isPublic
    ? personalFields.filter((f) => f.public)
    : limited
      ? personalFields.filter((f) => !f.admin)
      : personalFields;
  const visibleEmploymentFields = isPublic
    ? employmentFields.filter((f) => f.public)
    : limited
      ? employmentFields.filter((f) => !f.admin)
      : employmentFields;

  // Categories that are entirely Administrator-only are skipped for limited viewers.
  const showHealth = !limited;
  const showSoftware = !limited;
  const showHomeAddress = !limited && !isPublic;
  const showEmergency = !limited && !isPublic;
  const showOfficeAddress = !isPublic;
  const showGroups = !limited;
  const showProperty = !isPublic;

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

  const personalTabFields = [
    'firstName', 'lastName', 'cellPhone', 'workPhone', 'middleName',
    'personalEmail', 'birthDate', 'ssn',
    'streetAddress', 'streetAddress2', 'city', 'state', 'postalCode', 'country',
    'emergencyContactName', 'emergencyContactPhone', 'emergencyContactEmail',
  ];
  const employmentTabFields = [
    'email',
    'title', 'department', 'accessLevel', 'office', 'workstation', 'workAuthorization',
    'workAuthorizationLink',
    'role',
    'officeAddressStreet1', 'officeAddressStreet2', 'officeAddressCity', 'officeAddressState', 'officeAddressZip', 'officeAddressCountry',
    'departmentRank', 'startDate', 'supervisor', 'ptoAccrualRate',
    'employmentAgreement', 'rampAccount', 'rampCreditCard', 'employmentType',
  ];
  const propertyTabFields = [
    'deskPhoneExtension', 'deskPhoneMac', 'deskPhoneBrand', 'deskPhoneModel',
    'pcServiceTag', 'pcWindowsName', 'pcBrand', 'pcModel', 'bluetoothStatus',
  ];

  // ─── Tab state ─────────────────────────────────────────────────────────────
  const availableTabs: ProfileSection[] = isPublic
    ? ["Personal", "Employment"]
    : limited
      ? ["Personal", "Employment", "Property", "Certifications", "Experience"]
      : ["Personal", "Employment", "Health Insurance", "Property", "Licenses & Groups", "Certifications", "Experience"];

  // ─── Health Insurance data (fetched when tab is active) ────────────────────
  const healthInsuranceQuery = useQuery({
    queryKey: ["employee-health-insurance-full", userEmail],
    queryFn: () => fetchEmployeeHealthInsurance(userEmail),
    enabled: activeTab === "Health Insurance" && !limited,
    staleTime: 30_000,
  });

  const hiPlans: HealthPlanOption[] = healthInsuranceQuery.data?.plans ?? [];
  const hiElections = healthInsuranceQuery.data?.elections ?? [];
  const hiInsuranceEligibility = healthInsuranceQuery.data?.insuranceEligibility ?? health?.insuranceEligibility ?? "Ineligible";
  const hiTenureTier = healthInsuranceQuery.data?.tenureTier ?? health?.tenureTier ?? null;
  const hiBenchmarkBiweekly = healthInsuranceQuery.data?.benchmarkBiweekly ?? 0;

  const [hiHealthOptIn, setHiHealthOptIn] = useState("");
  const [hiHealthPlanId, setHiHealthPlanId] = useState("");
  const [hiAdditionalInsureds, setHiAdditionalInsureds] = useState("");
  const [hiDentalOptIn, setHiDentalOptIn] = useState("");
  const [hiDentalPlanId, setHiDentalPlanId] = useState("");
  const [hiDentalAdditionalInsureds, setHiDentalAdditionalInsureds] = useState("");
  const [hiVisionOptIn, setHiVisionOptIn] = useState("");
  const [hiVisionPlanId, setHiVisionPlanId] = useState("");
  const [hiVisionAdditionalInsureds, setHiVisionAdditionalInsureds] = useState("");
  const [hiHealthPrice, setHiHealthPrice] = useState("");
  const [hiHealthBenefits, setHiHealthBenefits] = useState("");
  const [hiHealthRate, setHiHealthRate] = useState("");
  const [hiHealthDeduction, setHiHealthDeduction] = useState("");
  const [hiDentalPrice, setHiDentalPrice] = useState("");
  const [hiDentalBenefits, setHiDentalBenefits] = useState("");
  const [hiDentalDeduction, setHiDentalDeduction] = useState("");
  const [hiVisionPrice, setHiVisionPrice] = useState("");
  const [hiVisionBenefits, setHiVisionBenefits] = useState("");
  const [hiVisionDeduction, setHiVisionDeduction] = useState("");
  const [hiHealthCompanyContrib, setHiHealthCompanyContrib] = useState("");
  const [hiDentalCompanyContrib, setHiDentalCompanyContrib] = useState("");
  const [hiVisionCompanyContrib, setHiVisionCompanyContrib] = useState("");

  const populateHiForm = useCallback((data: EmployeeHealthInsurance) => {
    const med = data.elections.find((e) => e.insuranceType === "Medical");
    const den = data.elections.find((e) => e.insuranceType === "Dental");
    const vis = data.elections.find((e) => e.insuranceType === "Vision");
    const normTier = (v: string | undefined) => { const t = v || ""; return t === "Employee Only" ? "Employee" : t; };
    setHiHealthOptIn(med?.optInStatus || ""); setHiHealthPlanId(med?.healthPlanId ? String(med.healthPlanId) : "");
    setHiAdditionalInsureds(normTier(med?.additionalInsureds)); setHiHealthPrice(med?.planPrice || "");
    setHiHealthBenefits(med?.planBenefits || ""); setHiHealthRate(med?.monthlyRate || ""); setHiHealthDeduction(med?.payrollDeduction || "");
    setHiDentalOptIn(den?.optInStatus || ""); setHiDentalPlanId(den?.healthPlanId ? String(den.healthPlanId) : "");
    setHiDentalAdditionalInsureds(normTier(den?.additionalInsureds)); setHiDentalPrice(den?.planPrice || "");
    setHiDentalBenefits(den?.planBenefits || ""); setHiDentalDeduction(den?.payrollDeduction || "");
    setHiVisionOptIn(vis?.optInStatus || ""); setHiVisionPlanId(vis?.healthPlanId ? String(vis.healthPlanId) : "");
    setHiVisionAdditionalInsureds(normTier(vis?.additionalInsureds)); setHiVisionPrice(vis?.planPrice || "");
    setHiVisionBenefits(vis?.planBenefits || ""); setHiVisionDeduction(vis?.payrollDeduction || "");

    const bm = data.benchmarkBiweekly ?? 0;
    const recalcContrib = (planIdStr: string | undefined, tier: string, plans: HealthPlanOption[], tenureTier: string | null) => {
      if (!planIdStr) return "";
      const plan = plans.find((p) => String(p.healthPlanId) === planIdStr);
      if (!plan) return "";
      let base = tier || "Employee";
      if (base === "Employee Only") base = "Employee";
      const rules = plan.contributionRules ?? [];
      let employerPct = 0;
      if (rules.length > 0 && tenureTier) {
        const match = rules.find((r) => {
          const t = r.tenureTier.toLowerCase();
          if (tenureTier === "1+ yr") return t.startsWith("1+");
          if (tenureTier === "<1 yr") return t.includes("less than") || t.includes("<1");
          return false;
        });
        if (match) employerPct = match.employerContributionPct;
      }
      const coverageType = tenureTier ? `${base} (${tenureTier})` : base;
      let priceEntry = plan.pricing.find((p) => p.coverageType === coverageType);
      if (!priceEntry) {
        const candidates = plan.pricing.filter((p) => p.coverageType.replace(/\s*\(.*\)\s*$/, "").trim().toLowerCase() === base.toLowerCase());
        priceEntry = candidates[0];
      }
      if (priceEntry) {
        const planPriceBiweekly = (priceEntry.monthlyPremium * 12) / 26;
        const employerPerPP = employerPct * bm;
        const employerApplied = Math.min(employerPerPP, planPriceBiweekly);
        return `$${employerApplied.toFixed(2)}/pay period`;
      }
      return "";
    };
    const tt = data.tenureTier;
    const pl = data.plans;
    setHiHealthCompanyContrib(recalcContrib(med?.healthPlanId ? String(med.healthPlanId) : undefined, normTier(med?.additionalInsureds), pl, tt));
    setHiDentalCompanyContrib(recalcContrib(den?.healthPlanId ? String(den.healthPlanId) : undefined, normTier(den?.additionalInsureds), pl, tt));
    setHiVisionCompanyContrib(recalcContrib(vis?.healthPlanId ? String(vis.healthPlanId) : undefined, normTier(vis?.additionalInsureds), pl, tt));
  }, []);

  useEffect(() => {
    if (healthInsuranceQuery.data) populateHiForm(healthInsuranceQuery.data);
  }, [healthInsuranceQuery.data, populateHiForm]);

  const saveHiMutation = useMutation({
    mutationFn: (payload: BulkUpdateHealthInsuranceRequest) => bulkUpdateHealthInsurance(userEmail, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(["employee-health-insurance-full", userEmail], data);
      populateHiForm(data);
      queryClient.invalidateQueries({ queryKey: targetContactId ? ["employee-profile", targetContactId] : ["self-profile"] });
    },
  });

  const handleHiSave = () => {
    saveHiMutation.mutate({
      medical: { optInStatus: hiHealthOptIn || null, healthPlanId: hiHealthPlanId ? Number(hiHealthPlanId) : null, additionalInsureds: hiAdditionalInsureds || null },
      dental: { optInStatus: hiDentalOptIn || null, healthPlanId: hiDentalPlanId ? Number(hiDentalPlanId) : null, additionalInsureds: hiDentalAdditionalInsureds || null },
      vision: { optInStatus: hiVisionOptIn || null, healthPlanId: hiVisionPlanId ? Number(hiVisionPlanId) : null, additionalInsureds: hiVisionAdditionalInsureds || null },
    });
  };

  return (
    <div className="space-y-4">
      {saveMutation.isError || saveHiMutation.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          Failed to save changes. Please try again.
        </div>
      ) : null}

      <ProfileTabBar tabs={availableTabs} active={activeTab} onChange={setActiveTab} />

      {isRefetchingProfile && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-3 py-2 mt-3">
          <Loader2 className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-xs text-amber-700 dark:text-amber-300">Fetching data from database…</span>
        </div>
      )}

      {/* ── Personal Tab ──────────────────────────────────────────── */}
      {activeTab === "Personal" && (
        <SectionShell
          title="Personal"
          icon={<UserRound className="h-4 w-4" />}
          editActions={
            canEdit && !editingPersonal ? (
              <>
                <EntraSyncButton targetEmail={syncTargetEmail} tabFields={personalTabFields} invalidateKeys={syncInvalidateKeys} variant="light" />
                {editBtn(() => setEditingPersonal(true))}
              </>
            ) : undefined
          }
        >
          {editingPersonal ? (
            <>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="First Name" value={textOrDash(profile.basics.firstName)} />
                <Field label="Middle Name" value={textOrDash(profile.basics.middleName)} />
                <Field label="Last Name" value={textOrDash(profile.basics.lastName)} />
                <Field label="Personal Email" value={textOrDash(profile.basics.personalEmail)} />
                <EditableField label="Cell Phone Number" value={phoneOrDash(cellPhone)} editing editValue={cellPhone} onChange={setCellPhone} />
                <EditableField label="Work Phone" value={phoneOrDash(workPhone)} editing editValue={workPhone} onChange={setWorkPhone} />
                <Field label="Birth Date" value={formatDate(profile.personal.dateOfBirth)} />
              </dl>

              {canEditAdminFields && (
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
              )}

              {canEditAdminFields && (
              <SubGroup label="Emergency Contact">
                <div className="space-y-4">
                  {emergencyContacts.length > 0 ? (
                    <div className="rounded-md border border-neutral-200 bg-neutral-50/60 p-4">
                      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                        <EditableField label="First Name" value="" editing editValue={(emergencyContacts[0].fullName.split(/\s+/)[0]) || ""} onChange={(v) => { const parts = emergencyContacts[0].fullName.split(/\s+/); parts[0] = v; updateEmergencyContact(0, "fullName", parts.join(" ")); }} />
                        <EditableField label="Last Name" value="" editing editValue={(emergencyContacts[0].fullName.split(/\s+/).slice(1).join(" ")) || ""} onChange={(v) => { const first = emergencyContacts[0].fullName.split(/\s+/)[0] || ""; updateEmergencyContact(0, "fullName", `${first} ${v}`.trim()); }} />
                        <EditableField label="Phone" value="" editing editValue={emergencyContacts[0].phoneNumber} onChange={(v) => updateEmergencyContact(0, "phoneNumber", v)} />
                        <EditableField label="Email" value="" editing editValue={emergencyContacts[0].email} onChange={(v) => updateEmergencyContact(0, "email", v)} />
                      </dl>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-neutral-500">No emergency contact on file.</p>
                  )}
                </div>
              </SubGroup>
              )}

              <TabFooterActions>
                {cancelBtn(cancelPersonal)}{saveBtn(savePersonal)}
              </TabFooterActions>
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
                      {profile.emergencyContacts.map((contact, index) => {
                        const nameParts = (contact.fullName || "").trim().split(/\s+/);
                        const firstName = nameParts[0] || "";
                        const lastName = nameParts.slice(1).join(" ") || "";
                        return (
                          <dl
                            key={`${contact.fullName}-${index}`}
                            className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-md border border-neutral-100 bg-neutral-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
                          >
                            <Field label="First Name" value={textOrDash(firstName)} />
                            <Field label="Last Name" value={textOrDash(lastName)} />
                            <Field label="Phone" value={phoneOrDash(contact.phoneNumber)} />
                            <Field label="Email" value={textOrDash(contact.email)} />
                          </dl>
                        );
                      })}
                    </div>
                  )}
                </SubGroup>
              ) : null}
            </>
          )}
        </SectionShell>
      )}

      {/* ── Employment Tab ────────────────────────────────────────── */}
      {activeTab === "Employment" && (
        <SectionShell
          title="Employment information"
          icon={<Briefcase className="h-4 w-4" />}
          editActions={
            canEdit && !editingEmployment ? (
              <>
                <EntraSyncButton targetEmail={syncTargetEmail} tabFields={employmentTabFields} invalidateKeys={syncInvalidateKeys} variant="light" />
                {editBtn(() => setEditingEmployment(true))}
              </>
            ) : undefined
          }
        >
          {editingEmployment ? (
            <>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Title" value={textOrDash(profile.employment.title)} />
                {canEditAdminFields && <Field label="Access Level" value={textOrDash(profile.employment.accessLevel)} />}
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
                {canEditAdminFields && <Field label="Work Authorization" value={textOrDash(profile.employment.workAuthorization)} />}
                {canEditAdminFields && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                    Work Authorization Photos
                  </label>
                  <input
                    type="url"
                    placeholder="https://…"
                    className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                    value={workAuthLinkUrl}
                    onChange={(e) => setWorkAuthLinkUrl(e.target.value)}
                  />
                </div>
                )}
                <Field label="Department" value={textOrDash(profile.basics.department)} />
                <Field label="Department Rank" value={textOrDash(profile.employment.departmentRank)} />
                <Field label="Role" value={textOrDash(profile.basics.role)} />
                <Field label="Start Date at IAE" value={formatDate(profile.employment.startDate)} />
                <Field label="Years of Service" value={textOrDash(profile.employment.yearsOfService)} />
                <Field label="Supervisor" value={textOrDash(profile.employment.supervisor)} />
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

              <TabFooterActions>
                {cancelBtn(cancelEmployment)}{saveBtn(saveEmployment)}
              </TabFooterActions>
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
      )}

      {/* ── Health Insurance Tab ──────────────────────────────────── */}
      {activeTab === "Health Insurance" && (
        <SectionShell
          title="Health Insurance"
          icon={<HeartPulse className="h-4 w-4" />}
        >
          {healthInsuranceQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading insurance details…
            </div>
          ) : healthInsuranceQuery.data ? (
            <>
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <WmsReadOnlyField label="Insurance Eligibility" value={textOrDash(hiInsuranceEligibility)} />
                <WmsReadOnlyField label="Tenure Tier" value={hiTenureTier || "—"} />
              </div>
              <div className="space-y-4">
                <WmsInsuranceSection
                  insuranceType="Medical" plans={hiPlans} editable={canEditAdminFields}
                  optIn={hiHealthOptIn} setOptIn={setHiHealthOptIn}
                  planId={hiHealthPlanId} setPlanId={setHiHealthPlanId}
                  additionalInsureds={hiAdditionalInsureds} setAdditionalInsureds={setHiAdditionalInsureds}
                  price={hiHealthPrice} setPrice={setHiHealthPrice}
                  benefits={hiHealthBenefits} setBenefits={setHiHealthBenefits}
                  rate={hiHealthRate} setRate={setHiHealthRate}
                  deduction={hiHealthDeduction} setDeduction={setHiHealthDeduction}
                  companyContrib={hiHealthCompanyContrib} setCompanyContrib={setHiHealthCompanyContrib}
                  tenureTier={hiTenureTier} benchmarkBiweekly={hiBenchmarkBiweekly}
                />
                <WmsInsuranceSection
                  insuranceType="Dental" plans={hiPlans} editable={canEditAdminFields}
                  optIn={hiDentalOptIn} setOptIn={setHiDentalOptIn}
                  planId={hiDentalPlanId} setPlanId={setHiDentalPlanId}
                  additionalInsureds={hiDentalAdditionalInsureds} setAdditionalInsureds={setHiDentalAdditionalInsureds}
                  price={hiDentalPrice} setPrice={setHiDentalPrice}
                  benefits={hiDentalBenefits} setBenefits={setHiDentalBenefits}
                  deduction={hiDentalDeduction} setDeduction={setHiDentalDeduction}
                  companyContrib={hiDentalCompanyContrib} setCompanyContrib={setHiDentalCompanyContrib}
                  tenureTier={hiTenureTier} benchmarkBiweekly={hiBenchmarkBiweekly}
                />
                <WmsInsuranceSection
                  insuranceType="Vision" plans={hiPlans} editable={canEditAdminFields}
                  optIn={hiVisionOptIn} setOptIn={setHiVisionOptIn}
                  planId={hiVisionPlanId} setPlanId={setHiVisionPlanId}
                  additionalInsureds={hiVisionAdditionalInsureds} setAdditionalInsureds={setHiVisionAdditionalInsureds}
                  price={hiVisionPrice} setPrice={setHiVisionPrice}
                  benefits={hiVisionBenefits} setBenefits={setHiVisionBenefits}
                  deduction={hiVisionDeduction} setDeduction={setHiVisionDeduction}
                  companyContrib={hiVisionCompanyContrib} setCompanyContrib={setHiVisionCompanyContrib}
                  tenureTier={hiTenureTier} benchmarkBiweekly={hiBenchmarkBiweekly}
                />
              </div>
              {saveHiMutation.isSuccess && (
                <p className="mt-3 text-sm font-medium text-green-700">Insurance saved successfully.</p>
              )}
              {canEditAdminFields && (
                <TabFooterActions>
                  <button
                    type="button"
                    onClick={() => { if (healthInsuranceQuery.data) populateHiForm(healthInsuranceQuery.data); }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
                  >
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleHiSave}
                    disabled={saveHiMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-md border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {saveHiMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {saveHiMutation.isPending ? "Saving…" : "Save"}
                  </button>
                </TabFooterActions>
              )}
            </>
          ) : health ? (
            <>
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <WmsReadOnlyField label="Health Insurance Status" value={textOrDash(health.insuranceEligibility)} />
                <WmsReadOnlyField label="Tenure Tier" value={health.tenureTier || "—"} />
              </div>
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
      )}

      {/* ── Property Tab ──────────────────────────────────────────── */}
      {activeTab === "Property" && (
        <SectionShell
          title="Company Property Assignments"
          icon={<Laptop className="h-4 w-4" />}
          editActions={
            canEdit && !editingProperty ? (
              <>
                {canEditAdminFields && <EntraSyncButton targetEmail={syncTargetEmail} tabFields={propertyTabFields} invalidateKeys={syncInvalidateKeys} variant="light" />}
                {editBtn(() => setEditingProperty(true))}
              </>
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
                        <option key={ext.extensionId} value={ext.extensionId} disabled={ext.isAssigned}>
                          {ext.extensionNumber}{ext.isAssigned && ext.assignedToEmail ? ` (assigned to ${ext.assignedToEmail})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {canEditAdminFields && (
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">Desk Phone Device</label>
                    <select
                      className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                      value={selectedPhoneId ?? ""}
                      onChange={(e) => {
                        const id = e.target.value ? Number(e.target.value) : null;
                        setSelectedPhoneId(id);
                        const picked = id != null ? phoneDevices.find((p) => p.phoneId === id) : null;
                        setDeskPhoneMacInput(picked?.macAddress ?? "");
                        setDeskPhoneModelInput(picked?.model ?? "");
                      }}
                    >
                      <option value="">— Select Phone —</option>
                      {phoneDevices.map((phone) => (
                        <option key={phone.phoneId} value={phone.phoneId} disabled={phone.isAssigned}>
                          {phone.make} {phone.model} — {phone.macAddress}{phone.isAssigned && phone.assignedToEmail ? ` (assigned to ${phone.assignedToEmail})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  )}
                  {canEditAdminFields && (
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">Desk Phone MAC Address</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
                      value={deskPhoneMacInput}
                      onChange={(e) => setDeskPhoneMacInput(e.target.value)}
                      placeholder="00:15:65:A8:63:F2"
                      disabled={selectedPhoneId == null}
                      title={selectedPhoneId == null ? "Select a Desk Phone Device first" : undefined}
                    />
                  </div>
                  )}
                  {canEditAdminFields && (
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">Desk Phone Model</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
                      value={deskPhoneModelInput}
                      onChange={(e) => setDeskPhoneModelInput(e.target.value)}
                      disabled={selectedPhoneId == null}
                      title={selectedPhoneId == null ? "Select a Desk Phone Device first" : undefined}
                    />
                  </div>
                  )}
                </dl>
              </SubGroup>
              {canEditAdminFields && (
              <SubGroup label="PC">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">Computer</label>
                    <select
                      className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                      value={selectedComputerId ?? ""}
                      onChange={(e) => {
                        const id = e.target.value ? Number(e.target.value) : null;
                        setSelectedComputerId(id);
                        const picked = id != null ? pcDevices.find((c) => c.computerId === id) : null;
                        setPcServiceTagInput(picked?.serviceTag ?? "");
                        setPcBrandInput(picked?.make ?? "");
                        setPcModelInput(picked?.model ?? "");
                        setBluetoothStatusInput(picked?.bluetoothStatus ?? "");
                      }}
                    >
                      <option value="">— Select Computer —</option>
                      {pcDevices.map((pc) => (
                        <option key={pc.computerId} value={pc.computerId} disabled={pc.isAssigned}>
                          {pc.make} {pc.model} — {pc.serviceTag}{pc.isAssigned && pc.assignedToEmail ? ` (assigned to ${pc.assignedToEmail})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">PC Service Tag</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
                      value={pcServiceTagInput}
                      onChange={(e) => setPcServiceTagInput(e.target.value)}
                      disabled={selectedComputerId == null}
                      title={selectedComputerId == null ? "Select a Computer first" : undefined}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">PC Brand</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
                      value={pcBrandInput}
                      onChange={(e) => setPcBrandInput(e.target.value)}
                      disabled={selectedComputerId == null}
                      title={selectedComputerId == null ? "Select a Computer first" : undefined}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">PC Model</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
                      value={pcModelInput}
                      onChange={(e) => setPcModelInput(e.target.value)}
                      disabled={selectedComputerId == null}
                      title={selectedComputerId == null ? "Select a Computer first" : undefined}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">Bluetooth Status</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
                      value={bluetoothStatusInput}
                      onChange={(e) => setBluetoothStatusInput(e.target.value)}
                      disabled={selectedComputerId == null}
                      title={selectedComputerId == null ? "Select a Computer first" : undefined}
                    />
                  </div>
                </dl>
              </SubGroup>
              )}

              <TabFooterActions>
                {cancelBtn(cancelProperty)}{saveBtn(saveProperty)}
              </TabFooterActions>
            </>
          ) : (
            <FieldGrid items={(() => {
              const items: FieldItem[] = [
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
              return limited ? items.filter((f) => !f.admin) : items;
            })()} />
          )}
        </SectionShell>
      )}

      {/* ── Licenses & Groups Tab ─────────────────────────────────── */}
      {activeTab === "Licenses & Groups" && (
        <div className="space-y-6">
          <SectionShell title="Software Assets" icon={<KeyRound className="h-4 w-4" />}>
            <dt className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
              Microsoft Office License
            </dt>
            <TagList items={licenses} empty="No licenses found." />
          </SectionShell>

          <SectionShell title="Group Membership" icon={<Users className="h-4 w-4" />}>
            <dt className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
              Microsoft Group Membership
            </dt>
            <TagList items={groups} empty="No group memberships found." />
          </SectionShell>
        </div>
      )}

      {/* ── Certifications Tab ────────────────────────────────────── */}
      {activeTab === "Certifications" && (
        <SectionShell title="Certifications" icon={<Award className="h-4 w-4" />}>
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
      )}

      {/* ── Experience Tab ────────────────────────────────────────── */}
      {activeTab === "Experience" && (
        <SectionShell title="Experience" icon={<Ticket className="h-4 w-4" />}>
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
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
