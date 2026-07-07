import { useMemo } from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useQuery } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { fetchHubRedAlertEngagements, type ApiHubRedAlertRow } from "@/api/engagementApi";
import { getAccountOid } from "@/auth/entra";
import { ScrollArea } from "@/components/ui/scroll-area";
import { primeEmsOpenIntent } from "../lib/emsOpenIntent";

const LIST_HEIGHT = 336;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function alertTitle(row: ApiHubRedAlertRow): string {
  return row.attractionName?.trim() || row.tourName?.trim() || `Engagement #${row.engagementId}`;
}

function alertLocation(row: ApiHubRedAlertRow): string {
  const place = [row.city?.trim(), row.stateProvince?.trim()].filter(Boolean).join(", ");
  return [row.venueName?.trim(), place].filter(Boolean).join(" · ");
}

export function RedAlertEngagementsWidget() {
  const { accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const userOid = getAccountOid(accounts[0]) || "";

  const alertsQuery = useQuery({
    queryKey: ["internal-hub-red-alerts", userOid],
    queryFn: fetchHubRedAlertEngagements,
    enabled: Boolean(isAuthenticated && userOid),
    staleTime: 60_000,
  });

  const alerts = useMemo(() => alertsQuery.data ?? [], [alertsQuery.data]);

  return (
    <section className="group min-w-0 animate-slide-up bg-white">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-[17px] font-semibold leading-tight tracking-[0.02em] text-neutral-900">
          <TriangleAlert className="h-[18px] w-[18px] text-red-600" aria-hidden />
          Red Alert Engagements
        </h3>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          onClick={() => primeEmsOpenIntent({ view: "engagements", mineOnly: true, timingFilter: "all" })}
          className="shrink-0 text-xs font-semibold text-neutral-900 underline-offset-4 hover:underline"
        >
          See all
        </a>
      </div>

      <p className="mb-5 text-sm font-medium text-neutral-600">
        Your engagements still below their sales revenue goal.
      </p>

      {alertsQuery.isLoading ? (
        <p className="text-sm text-neutral-600">Checking your engagements…</p>
      ) : null}

      {alertsQuery.isError ? (
        <p className="text-sm text-neutral-600">Could not load sales alerts. Try again later.</p>
      ) : null}

      {isAuthenticated && !userOid ? (
        <p className="text-sm text-neutral-600">Sign in to see your sales alerts.</p>
      ) : null}

      {userOid && !alertsQuery.isLoading && !alertsQuery.isError && alerts.length === 0 ? (
        <p className="text-sm text-neutral-600">No engagements are behind their sales goal.</p>
      ) : null}

      {alerts.length > 0 ? (
        <ScrollArea style={{ height: LIST_HEIGHT }} className="pr-4">
          <ul className="space-y-4">
            {alerts.map((row) => (
              <li key={row.engagementId} className="rounded-sm transition-colors duration-200 hover:bg-neutral-50">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[14px] font-semibold text-neutral-950">{alertTitle(row)}</p>
                  <span className="shrink-0 text-[12px] font-bold text-red-600">{Math.round(row.pctToGoal)}%</span>
                </div>
                {alertLocation(row) ? (
                  <p className="mt-0.5 truncate text-[12px] font-medium text-neutral-800">{alertLocation(row)}</p>
                ) : null}
                <p className="mt-1 text-[12px] font-medium text-neutral-700">
                  {currencyFormatter.format(row.totalRevenue)} of {currencyFormatter.format(row.salesRevenueGoal)} goal
                </p>
                <div
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200"
                  role="progressbar"
                  aria-valuenow={Math.round(row.pctToGoal)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${alertTitle(row)} at ${Math.round(row.pctToGoal)}% of sales goal`}
                >
                  <div
                    className="h-full rounded-full bg-red-600 transition-[width] duration-500"
                    style={{ width: `${Math.max(2, Math.min(100, row.pctToGoal))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      ) : null}
    </section>
  );
}
