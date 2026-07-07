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
  type MyInsuranceElection,
} from "@/api/internalBenefitsApi";
import { cn } from "@/lib/utils";
import { InternalPageHero } from "../components/InternalPageHero";
import { InternalPageFrame } from "../layout/InternalPageFrame";

const COVERAGE_TYPES = ["Health", "Dental", "Vision"] as const;

const COVERAGE_ICONS: Record<(typeof COVERAGE_TYPES)[number], typeof HeartPulse> = {
  Health: HeartPulse,
  Dental: Smile,
  Vision: Eye,
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function isOptedIn(election: MyInsuranceElection | undefined): boolean {
  const status = election?.optInStatus?.trim().toLowerCase() ?? "";
  return status.startsWith("opt-in") || status === "enrolled" || status === "active";
}

function CoverageCard({
  type,
  election,
}: {
  type: (typeof COVERAGE_TYPES)[number];
  election: MyInsuranceElection | undefined;
}) {
  const Icon = COVERAGE_ICONS[type];
  const optedIn = isOptedIn(election);

  return (
    <article className="flex flex-col rounded-lg bg-[#0c0c0c] p-6 text-white shadow-[0_4px_16px_rgba(0,0,0,0.22)]">
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-xl bg-black/25 p-3" aria-hidden>
          <Icon className="h-9 w-9" strokeWidth={1.6} />
        </span>
        {election ? (
          <span
            className={cn(
              "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em]",
              optedIn ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/70",
            )}
          >
            {optedIn ? "Enrolled" : "Waived"}
          </span>
        ) : (
          <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/70">
            No election
          </span>
        )}
      </div>

      <h3 className="text-lg font-semibold">{type}</h3>

      {election && optedIn ? (
        <div className="mt-3 space-y-1.5 text-sm">
          <p className="font-semibold text-white">{election.planName ?? "Plan on file"}</p>
          {election.additionalInsureds ? (
            <p className="text-white/75">{election.additionalInsureds}</p>
          ) : null}
          {election.monthlyPremium != null ? (
            <p className="pt-1 text-xl font-bold">
              {currencyFormatter.format(election.monthlyPremium)}
              <span className="ml-1 text-xs font-medium text-white/60">/ month</span>
            </p>
          ) : election.pricing.length > 0 ? (
            <div className="pt-1 text-xs text-white/70">
              {election.pricing.map((price) => (
                <p key={price.coverageType}>
                  {price.coverageType}: {currencyFormatter.format(price.monthlyPremium)}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          {election
            ? "You have waived this coverage. Contact HR during open enrollment to opt in."
            : "No election on file. Contact HR to review your options."}
        </p>
      )}
    </article>
  );
}

function PlanCard({ plan, elected }: { plan: BenefitPlan; elected: boolean }) {
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
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-neutral-950">{plan.planName}</h3>
            {elected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                <BadgeCheck className="h-3 w-3" aria-hidden />
                Your plan
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs font-medium text-neutral-500">{plan.planType}</p>
        </div>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-neutral-500 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div id={panelId} className="border-t border-neutral-100 px-5 py-4">
          {plan.benefits.length > 0 ? (
            <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-neutral-800">
              {plan.benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-neutral-500">Benefit details available from HR.</p>
          )}

          {plan.pricing.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-xs font-semibold text-neutral-600">
                    <th className="py-2 pr-4">Coverage</th>
                    <th className="py-2 text-right">Monthly premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {plan.pricing.map((price) => (
                    <tr key={price.coverageType}>
                      <td className="py-2 pr-4 text-neutral-800">{price.coverageType}</td>
                      <td className="py-2 text-right font-medium tabular-nums text-neutral-900">
                        {currencyFormatter.format(price.monthlyPremium)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Current pricing available from HR.</p>
          )}
        </div>
      ) : null}
    </article>
  );
}

export function HealthInsurancePage() {
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

  const electionsByType = useMemo(() => {
    const map = new Map<string, MyInsuranceElection>();
    for (const election of myInsuranceQuery.data?.elections ?? []) {
      map.set(election.insuranceType.trim().toLowerCase(), election);
    }
    return map;
  }, [myInsuranceQuery.data]);

  const electedPlanIds = useMemo(
    () =>
      new Set(
        (myInsuranceQuery.data?.elections ?? [])
          .filter((election) => isOptedIn(election) && election.healthPlanId != null)
          .map((election) => election.healthPlanId as number),
      ),
    [myInsuranceQuery.data],
  );

  const plansByType = useMemo(() => {
    const grouped = new Map<string, BenefitPlan[]>();
    for (const plan of plansQuery.data ?? []) {
      const key = plan.planType.trim() || "Other";
      const list = grouped.get(key) ?? [];
      list.push(plan);
      grouped.set(key, list);
    }
    return grouped;
  }, [plansQuery.data]);

  const isLoading = myInsuranceQuery.isLoading || plansQuery.isLoading;

  return (
    <InternalPageFrame>
      <InternalPageHero
        title="Health Insurance"
        subtitle="Your Health, Dental, and Vision coverage — plus every plan iAE offers."
      />

      <main className="mx-auto w-full max-w-[1060px] px-5 pb-16 pt-14 sm:px-8 lg:px-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" aria-hidden />
            <span className="sr-only">Loading your benefits</span>
          </div>
        ) : null}

        {myInsuranceQuery.isError || plansQuery.isError ? (
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

        {!isLoading && myInsuranceQuery.data && !myInsuranceQuery.data.noProfile ? (
          <section aria-label="Your coverage" className="mb-14">
            <h2 className="mb-5 text-2xl font-semibold tracking-[0.01em] text-neutral-950">Your Coverage</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {COVERAGE_TYPES.map((type) => (
                <CoverageCard
                  key={type}
                  type={type}
                  election={electionsByType.get(type.toLowerCase())}
                />
              ))}
            </div>
          </section>
        ) : null}

        {!isLoading && (plansQuery.data?.length ?? 0) > 0 ? (
          <section aria-label="All available plans">
            <h2 className="mb-2 text-2xl font-semibold tracking-[0.01em] text-neutral-950">
              All Available Plans
            </h2>
            <p className="mb-6 text-sm text-neutral-600">
              Every active plan iAE offers, including those you haven't chosen.
            </p>
            <div className="space-y-8">
              {[...plansByType.entries()].map(([planType, plans]) => (
                <div key={planType}>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                    {planType} plans
                  </h3>
                  <div className="space-y-3">
                    {plans.map((plan) => (
                      <PlanCard key={plan.healthPlanId} plan={plan} elected={electedPlanIds.has(plan.healthPlanId)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </InternalPageFrame>
  );
}
