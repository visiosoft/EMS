import { useMemo } from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { fetchHubEngagementSchedule } from "@/api/engagementApi";
import { getAccountOid } from "@/auth/entra";
import { handleOpenEngagements } from "../lib/emsOpenIntent";
import {
  getHubWeekDateRange,
  mapEngagementRowsToHubEvents,
  type HubScheduleWeek,
} from "../lib/hubEngagementSchedule";

type EngagementWidgetProps = {
  title: string;
  /** When set, loads the signed-in user's engagements for that calendar week. */
  scheduleWeek?: HubScheduleWeek;
};

export function EngagementWidget({ title, scheduleWeek }: EngagementWidgetProps) {
  const { accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const userOid = getAccountOid(accounts[0]) || "";

  const weekRange = useMemo(
    () => (scheduleWeek ? getHubWeekDateRange(scheduleWeek) : null),
    [scheduleWeek],
  );

  const scheduleQuery = useQuery({
    queryKey: [
      "internal-hub-engagements",
      scheduleWeek,
      weekRange?.startDate,
      weekRange?.endDate,
      userOid,
    ],
    queryFn: () => fetchHubEngagementSchedule(weekRange!.startDate, weekRange!.endDate),
    enabled: Boolean(scheduleWeek && weekRange && isAuthenticated && userOid),
    staleTime: 60_000,
  });

  const events = useMemo(() => {
    if (!scheduleWeek) return [];
    return mapEngagementRowsToHubEvents(scheduleQuery.data ?? []);
  }, [scheduleWeek, scheduleQuery.data]);

  const emptyMessage =
    scheduleWeek === "next"
      ? "No engagements scheduled for you next week."
      : "No engagements scheduled for you this week.";

  return (
    <section className="group min-w-0 animate-slide-up bg-white">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-[17px] font-semibold leading-tight tracking-[0.02em] text-neutral-900">
          {title}
        </h3>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          onClick={(event) => handleOpenEngagements(event)}
          className="shrink-0 text-xs font-semibold text-neutral-900 underline-offset-4 hover:underline"
        >
          See all
        </a>
      </div>

      <a
        href="/"
        target="_blank"
        rel="noreferrer"
        onClick={(event) => handleOpenEngagements(event, true)}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-neutral-900 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add event
      </a>

      {scheduleWeek && scheduleQuery.isLoading ? (
        <p className="text-sm text-neutral-600">Loading your engagements…</p>
      ) : null}

      {scheduleWeek && scheduleQuery.isError ? (
        <p className="text-sm text-neutral-600">Could not load engagements. Try again later.</p>
      ) : null}

      {scheduleWeek && isAuthenticated && !userOid ? (
        <p className="text-sm text-neutral-600">Sign in to see your engagements for this week.</p>
      ) : null}

      {scheduleWeek &&
      userOid &&
      !scheduleQuery.isLoading &&
      !scheduleQuery.isError &&
      events.length === 0 ? (
        <p className="text-sm text-neutral-600">{emptyMessage}</p>
      ) : null}

      {events.length > 0 ? (
        <ul className="space-y-3">
          {events.map((event) => (
            <li
              key={event.key}
              className="flex items-center gap-4 rounded-sm transition-colors duration-200 hover:bg-neutral-50"
            >
              <div className="flex h-[64px] w-[64px] shrink-0 flex-col items-center justify-center border border-neutral-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]">
                <span className="text-[11px] font-medium text-neutral-700">{event.month}</span>
                <span className="text-[25px] font-semibold leading-none text-neutral-950">{event.day}</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-neutral-950">{event.title}</p>
                <p className="mt-1 truncate text-[12px] font-medium text-neutral-800">{event.time}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
