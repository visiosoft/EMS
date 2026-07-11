import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  ChevronDown,
  Eye,
  HeartPulse,
  Loader2,
  ShieldAlert,
  Smile,
} from "lucide-react";
import {
  fetchBenefitPlans,
  fetchMyInsurance,
  type BenefitPlan,
  type BenefitPlanPricing,
  type MyInsuranceElection,
  type TenureTier,
} from "@/api/internalBenefitsApi";
import { cn } from "@/lib/utils";
import { InternalPageHero } from "../components/InternalPageHero";
import { InternalPageFrame } from "../layout/InternalPageFrame";

const COVERAGE_TYPES = ["Medical", "Dental", "Vision"] as const;

type CoverageType = (typeof COVERAGE_TYPES)[number];

const COVERAGE_ICONS: Record<CoverageType, typeof HeartPulse> = {
  Medical: HeartPulse,
  Dental: Smile,
  Vision: Eye,
};

/** Pay periods per year — biweekly payroll, matching the backend. */
const PAY_PERIODS_PER_YEAR = 26;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function isOptedIn(election: MyInsuranceElection | undefined): boolean {
  const status = election?.optInStatus?.trim().toLowerCase() ?? "";
  return status.startsWith("opt-in") || status === "enrolled" || status === "active";
}

/** HealthPlanContributionRule.EmployerContributionPct is a fraction (1.0 = 100%). */
function formatPct(pct: number): string {
  const value = pct <= 1 ? pct * 100 : pct;
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function perPayPeriod(monthlyPremium: number): number {
  return (monthlyPremium * 12) / PAY_PERIODS_PER_YEAR;
}

/** HealthPlanPricing.CoverageType looks like "Employee + Spouse (1+ yr)" — drop the tenure suffix. */
function baseTier(coverageType: string): string {
  return coverageType.replace(/\s*\(.*\)\s*$/, "").trim();
}

/**
 * EmployeeHealthInsurance.*CoverageTier stores "Employee Only" for single coverage,
 * while HealthPlanPricing.CoverageType uses plain "Employee". Mirrors the backend's
 * matchPremium so the elected tier highlights against the right card.
 */
function normalizeElectedTier(coverageTier: string | null): string | null {
  const raw = (coverageTier ?? "").trim();
  if (!raw) return null;
  return raw === "Employee Only" ? "Employee" : raw;
}

/**
 * Collapse the pricing rows to one per coverage tier, picking the row that matches the
 * employee's tenure bucket when a plan prices "<1 yr" and "1+ yr" separately. An unknown
 * tenure falls back to the fully-vested rate, matching the backend's premium match.
 *
 * Tiers are whatever HealthPlanPricing.CoverageType contains — no fixed list — ordered by
 * premium so single coverage leads and family coverage trails, however a plan names them.
 */
function tiersForTenure(
  pricing: BenefitPlanPricing[],
  tenureTier: TenureTier | null,
): Array<{ tier: string; monthlyPremium: number }> {
  const marker = tenureTier === "<1 yr" ? "<1" : "1+";

  const byTier = new Map<string, BenefitPlanPricing>();
  for (const row of pricing) {
    const tier = baseTier(row.coverageType);
    if (!tier) continue;
    const existing = byTier.get(tier);
    if (!existing) {
      byTier.set(tier, row);
      continue;
    }
    if (row.coverageType.includes(marker) && !existing.coverageType.includes(marker)) {
      byTier.set(tier, row);
    }
  }

  return [...byTier.entries()]
    .map(([tier, row]) => ({ tier, monthlyPremium: row.monthlyPremium }))
    .sort((a, b) => a.monthlyPremium - b.monthlyPremium || a.tier.localeCompare(b.tier));
}

/** One card per coverage tier. Auto-fit so any number of tiers stays on an even grid. */
function TierCards({
  pricing,
  tenureTier,
  electedTier,
}: {
  pricing: BenefitPlanPricing[];
  tenureTier: TenureTier | null;
  electedTier: string | null;
}) {
  const tiers = tiersForTenure(pricing, tenureTier);
  if (tiers.length === 0) {
    return <p className="text-sm text-neutral-500">Current pricing available from HR.</p>;
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
      {tiers.map(({ tier, monthlyPremium }) => {
        const elected = electedTier === tier;
        return (
          <article
            key={tier}
            aria-current={elected ? "true" : undefined}
            className={cn(
              "rounded-lg border p-4 transition-colors",
              elected
                ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
                : "border-neutral-200 bg-white",
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
              {tier}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-neutral-950">
              {currencyFormatter.format(monthlyPremium)}
            </p>
            <p className="mt-0.5 text-xs tabular-nums text-neutral-500">
              {currencyFormatter.format(perPayPeriod(monthlyPremium))} / pay period
            </p>
            {elected ? (
              <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-700">
                <BadgeCheck className="h-3 w-3" aria-hidden />
                Your tier
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

type CostRow = { label: string; value: string; caption?: string; emphasis?: boolean };

/** What the plan costs, what iAE pays, and what comes out of the employee's paycheck. */
function CostBreakdown({ election }: { election: MyInsuranceElection }) {
  const {
    monthlyPremium,
    employerContributionPct,
    employerContributionPerPayPeriod,
    deductionPerPayPeriod,
  } = election;

  const rows: CostRow[] = [];

  if (monthlyPremium != null) {
    rows.push({
      label: "Plan premium",
      value: `${currencyFormatter.format(monthlyPremium)} / month`,
      caption: `${currencyFormatter.format(perPayPeriod(monthlyPremium))} per pay period`,
    });
  }
  if (employerContributionPerPayPeriod != null) {
    rows.push({
      label: "iAE contributes",
      value: `${currencyFormatter.format(employerContributionPerPayPeriod)} / pay period`,
      // EmployerContributionPct applies to the benchmark plan (the cheapest Medical
      // employee-tier premium), not to this plan — say so rather than implying the
      // employer covers that share of the premium above.
      caption:
        employerContributionPct != null
          ? `${formatPct(employerContributionPct)} of the benchmark plan rate`
          : undefined,
    });
  } else if (employerContributionPct != null) {
    rows.push({
      label: "Employer contribution rate",
      value: formatPct(employerContributionPct),
      caption: "Applied to the benchmark plan rate",
    });
  }
  if (deductionPerPayPeriod != null) {
    rows.push({
      label: "Your payroll deduction",
      value: `${currencyFormatter.format(deductionPerPayPeriod)} / pay period`,
      emphasis: true,
    });
  }

  if (rows.length === 0) {
    return <p className="text-sm text-neutral-500">Cost details available from HR.</p>;
  }

  return (
    <dl className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
      {rows.map((row) => (
        <div
          key={row.label}
          className={cn(
            "flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-3.5",
            row.emphasis && "bg-neutral-50",
          )}
        >
          <dt className="text-sm text-neutral-600">{row.label}</dt>
          <dd className="text-right">
            <span
              className={cn(
                "block tabular-nums text-neutral-950",
                row.emphasis ? "text-base font-bold" : "text-sm font-medium",
              )}
            >
              {row.value}
            </span>
            {row.caption ? (
              <span className="block text-xs text-neutral-500">{row.caption}</span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
      {children}
    </h3>
  );
}

function ElectedPlanDetail({
  type,
  plan,
  election,
  tenureTier,
}: {
  type: CoverageType;
  plan: BenefitPlan | undefined;
  election: MyInsuranceElection;
  tenureTier: TenureTier | null;
}) {
  const Icon = COVERAGE_ICONS[type];
  const electedTier = normalizeElectedTier(election.coverageTier);
  const pricing = plan?.pricing ?? election.pricing;
  const planName = plan?.planName ?? election.planName ?? "Plan on file";
  const carrierName = plan?.carrierName || election.carrierName;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-neutral-200 bg-white px-6 py-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 rounded-lg bg-neutral-100 p-2" aria-hidden>
            <Icon className="h-5 w-5 text-neutral-700" strokeWidth={1.6} />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold uppercase tracking-[0.02em] text-neutral-950">
              {planName}
            </h2>
            {carrierName ? <p className="mt-1 text-sm text-neutral-500">{carrierName}</p> : null}
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          <BadgeCheck className="h-3 w-3" aria-hidden />
          Enrolled
        </span>
      </header>

      <section aria-label={`${type} coverage tiers`}>
        <SectionHeading>Coverage tiers</SectionHeading>
        <TierCards pricing={pricing} tenureTier={tenureTier} electedTier={electedTier} />
      </section>

      <section aria-label={`${type} cost breakdown`}>
        <SectionHeading>Your cost</SectionHeading>
        <CostBreakdown election={election} />
      </section>
    </div>
  );
}

function PlanCard({ plan, tenureTier }: { plan: BenefitPlan; tenureTier: TenureTier | null }) {
  const [open, setOpen] = useState(false);
  const panelId = `benefit-plan-${plan.healthPlanId}`;

  return (
    <article className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-neutral-50"
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-neutral-950">{plan.planName}</h3>
          <p className="mt-0.5 text-xs font-medium text-neutral-500">
            {plan.carrierName || plan.planType}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-neutral-500 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div id={panelId} className="space-y-6 border-t border-neutral-100 bg-neutral-50/60 px-5 py-5">
          <section aria-label={`${plan.planName} coverage tiers`}>
            <SectionHeading>Coverage tiers</SectionHeading>
            <TierCards pricing={plan.pricing} tenureTier={tenureTier} electedTier={null} />
          </section>

          {plan.contributionRules.length > 0 ? (
            <section aria-label={`${plan.planName} employer contribution`}>
              <SectionHeading>Employer contribution</SectionHeading>
              <dl className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
                {plan.contributionRules.map((rule) => (
                  <div
                    key={rule.tenureTier}
                    className="flex items-baseline justify-between gap-6 px-5 py-3"
                  >
                    <dt className="text-sm text-neutral-600">{rule.tenureTier}</dt>
                    <dd className="text-sm font-medium tabular-nums text-neutral-950">
                      {formatPct(rule.employerContributionPct)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function CoveragePanel({
  type,
  election,
  plans,
  tenureTier,
}: {
  type: CoverageType;
  election: MyInsuranceElection | undefined;
  plans: BenefitPlan[];
  tenureTier: TenureTier | null;
}) {
  const enrolled = isOptedIn(election) && election?.healthPlanId != null;
  const electedPlan = enrolled
    ? plans.find((plan) => plan.healthPlanId === election?.healthPlanId)
    : undefined;
  const otherPlans = plans.filter((plan) => plan.healthPlanId !== election?.healthPlanId);

  return (
    <div className="space-y-12">
      {enrolled && election ? (
        <ElectedPlanDetail
          type={type}
          plan={electedPlan}
          election={election}
          tenureTier={tenureTier}
        />
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-6 py-8 text-center">
          <p className="text-sm leading-relaxed text-neutral-700">
            {election
              ? `You have waived ${type.toLowerCase()} coverage. Contact HR during open enrollment to opt in.`
              : `No ${type.toLowerCase()} election on file. Contact HR to review your options.`}
          </p>
        </div>
      )}

      {otherPlans.length > 0 ? (
        <section aria-label={`Other ${type} plans`}>
          <SectionHeading>{enrolled ? `Other ${type} plans` : `Available ${type} plans`}</SectionHeading>
          <p className="-mt-2 mb-4 text-sm text-neutral-600">
            Every active {type.toLowerCase()} plan iAE offers, priced for your tenure.
          </p>
          <div className="space-y-3">
            {otherPlans.map((plan) => (
              <PlanCard key={plan.healthPlanId} plan={plan} tenureTier={tenureTier} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function HealthInsurancePage() {
  const [activeTab, setActiveTab] = useState<CoverageType>("Medical");

  const myInsuranceQuery = useQuery({
    queryKey: ["internal-my-insurance"],
    queryFn: fetchMyInsurance,
    retry: 1,
  });

  const plansQuery = useQuery({
    queryKey: ["internal-benefit-plans"],
    queryFn: fetchBenefitPlans,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const tenureTier = myInsuranceQuery.data?.tenureTier ?? null;

  const electionsByType = useMemo(() => {
    const map = new Map<string, MyInsuranceElection>();
    for (const election of myInsuranceQuery.data?.elections ?? []) {
      map.set(election.insuranceType.trim().toLowerCase(), election);
    }
    return map;
  }, [myInsuranceQuery.data]);

  const plansByType = useMemo(() => {
    const grouped = new Map<string, BenefitPlan[]>();
    for (const plan of plansQuery.data ?? []) {
      const key = plan.planType.trim().toLowerCase();
      const list = grouped.get(key) ?? [];
      list.push(plan);
      grouped.set(key, list);
    }
    return grouped;
  }, [plansQuery.data]);

  const isLoading = myInsuranceQuery.isLoading || plansQuery.isLoading;
  const isError = myInsuranceQuery.isError || plansQuery.isError;

  return (
    <InternalPageFrame>
      <InternalPageHero
        title="Health Insurance"
        subtitle="Your Medical, Dental, and Vision coverage — plus every plan iAE offers."
      />

      <main className="mx-auto w-full max-w-[1060px] px-5 pb-16 pt-14 sm:px-8 lg:px-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" aria-hidden />
            <span className="sr-only">Loading your benefits</span>
          </div>
        ) : null}

        {isError ? (
          <div className="mx-auto mb-10 max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-6 py-6 text-center">
            <ShieldAlert className="mx-auto mb-2 h-7 w-7 text-amber-600" aria-hidden />
            <p className="text-sm font-medium text-amber-900">
              Benefits information could not be loaded right now. Refresh to try again.
            </p>
          </div>
        ) : null}

        {!isLoading && myInsuranceQuery.data?.noProfile ? (
          <div className="mx-auto mb-12 max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-6 py-6 text-center">
            <p className="text-sm leading-relaxed text-amber-900">
              Your sign-in isn't linked to an iAE employee record yet, so personal elections
              can't be shown. The plans we offer are listed below.
            </p>
          </div>
        ) : null}

        {!isLoading && !isError ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-200">
              <div
                role="tablist"
                aria-label="Coverage type"
                className="flex space-x-8 overflow-x-auto text-sm font-bold [scrollbar-width:none]"
              >
                {COVERAGE_TYPES.map((type) => (
                  <button
                    key={type}
                    role="tab"
                    id={`coverage-tab-${type}`}
                    aria-selected={activeTab === type}
                    aria-controls={`coverage-panel-${type}`}
                    onClick={() => setActiveTab(type)}
                    className={cn(
                      "-mb-px border-b-2 pb-4 uppercase tracking-wide transition-colors",
                      activeTab === type
                        ? "border-black text-black"
                        : "border-transparent text-neutral-400 hover:text-black",
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
              {tenureTier ? (
                <span className="pb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                  Tenure: {tenureTier}
                </span>
              ) : null}
            </div>

            <div
              role="tabpanel"
              id={`coverage-panel-${activeTab}`}
              aria-labelledby={`coverage-tab-${activeTab}`}
              className="pt-8"
            >
              <CoveragePanel
                type={activeTab}
                election={electionsByType.get(activeTab.toLowerCase())}
                plans={plansByType.get(activeTab.toLowerCase()) ?? []}
                tenureTier={tenureTier}
              />
            </div>
          </>
        ) : null}
      </main>
    </InternalPageFrame>
  );
}
