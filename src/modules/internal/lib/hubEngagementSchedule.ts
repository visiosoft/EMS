import type { ApiEngagementListRow } from "@/api/engagementApi";

export type HubScheduleWeek = "this" | "next";

export type HubEngagementEvent = {
  key: string;
  month: string;
  day: string;
  title: string;
  time: string;
};

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Sunday–Saturday week in the user's local timezone. */
export function getHubWeekDateRange(week: HubScheduleWeek): { startDate: string; endDate: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekOffset = week === "next" ? 1 : 0;
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay() + weekOffset * 7);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  return { startDate: toYmd(sunday), endDate: toYmd(saturday) };
}

function formatTime12(sqlTime: string): string {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(sqlTime.trim());
  if (!match) return sqlTime;
  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), match[3] != null ? Number(match[3]) : 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatEventTime(performanceDate: string, performanceTime: string): string {
  const [y, m, d] = performanceDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
  return `${weekday} ${formatTime12(performanceTime)}`;
}

function monthDayFromYmd(ymd: string): { month: string; day: string } {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return {
    month: date.toLocaleDateString(undefined, { month: "short" }),
    day: String(d).padStart(2, "0"),
  };
}

export function mapEngagementRowsToHubEvents(rows: ApiEngagementListRow[]): HubEngagementEvent[] {
  return rows.map((row) => {
    const performanceDate = row.openingPerformanceDate?.trim() || "";
    const performanceTime = row.openingPerformanceTime?.trim() || "00:00:00";
    const { month, day } = performanceDate
      ? monthDayFromYmd(performanceDate)
      : { month: "—", day: "—" };

    return {
      key: String(row.engagementId),
      month,
      day,
      title: row.displayTitle?.trim() || `Engagement #${row.engagementId}`,
      time: performanceDate
        ? formatEventTime(performanceDate, performanceTime)
        : "Date to be scheduled",
    };
  });
}
