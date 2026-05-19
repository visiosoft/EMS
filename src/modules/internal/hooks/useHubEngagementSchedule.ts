import { useMemo } from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useQuery } from "@tanstack/react-query";
import { fetchHubEngagementSchedule } from "@/api/engagementApi";
import { getAccountOid } from "@/auth/entra";
import {
  getHubWeekDateRange,
  mapEngagementRowsToHubEvents,
  type HubEngagementEvent,
  type HubScheduleWeek,
} from "../lib/hubEngagementSchedule";

export function useHubEngagementSchedule(scheduleWeek: HubScheduleWeek) {
  const { accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const userOid = getAccountOid() || getAccountOid(accounts[0]) || "";

  const weekRange = useMemo(() => getHubWeekDateRange(scheduleWeek), [scheduleWeek]);

  const scheduleQuery = useQuery({
    queryKey: ["internal-hub-engagements", scheduleWeek, weekRange.startDate, weekRange.endDate, userOid],
    queryFn: () => fetchHubEngagementSchedule(weekRange.startDate, weekRange.endDate),
    enabled: Boolean(isAuthenticated && userOid),
    staleTime: 60_000,
  });

  const events: HubEngagementEvent[] = useMemo(
    () => mapEngagementRowsToHubEvents(scheduleQuery.data ?? []),
    [scheduleQuery.data],
  );

  return {
    events,
    isLoading: scheduleQuery.isLoading,
    isError: scheduleQuery.isError,
    isAuthenticated,
    userOid,
    weekRange,
  };
}
