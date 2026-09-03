/** Official paid company holidays, per the Employee Handbook. */

export type WorkHoliday = {
  /** `yyyy-MM-dd` */
  date: string;
  label: string;
};

const WORK_HOLIDAY_SCHEDULE: Record<number, WorkHoliday[]> = {
  2026: [
    { date: "2026-01-01", label: "New Years Day" },
    { date: "2026-05-25", label: "Memorial Day" },
    { date: "2026-07-03", label: "Independence Day" },
    { date: "2026-07-04", label: "Independence Day" },
    { date: "2026-09-07", label: "Labor Day" },
    { date: "2026-11-26", label: "Thanksgiving" },
    { date: "2026-11-27", label: "Thanksgiving" },
    { date: "2026-12-25", label: "Christmas Day" },
    { date: "2026-12-31", label: "New Years Eve" },
  ],
};

/** First published year; earlier years are not shown. */
const FIRST_YEAR = 2026;

/** How many years past the current one are projected from the published pattern. */
const YEARS_AHEAD = 3;

function toYmd(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** nth (1-based) weekday of a month; pass nth = -1 for the last one. */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date {
  if (nth < 0) {
    const last = new Date(year, month + 1, 0);
    return new Date(year, month, last.getDate() - ((last.getDay() - weekday + 7) % 7));
  }
  const first = new Date(year, month, 1);
  return new Date(year, month, 1 + ((weekday - first.getDay() + 7) % 7) + (nth - 1) * 7);
}

/** Saturday holidays are also observed the Friday before, Sunday holidays the Monday after. */
function withObservedDay(date: Date, label: string): WorkHoliday[] {
  const day = date.getDay();
  const entry = { date: toYmd(date), label };
  if (day === 6) {
    return [{ date: toYmd(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1)), label }, entry];
  }
  if (day === 0) {
    return [entry, { date: toYmd(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)), label }];
  }
  return [entry];
}

/** Projects the published holiday pattern onto a year that has no explicit schedule yet. */
function projectHolidaysForYear(year: number): WorkHoliday[] {
  const thanksgiving = nthWeekdayOfMonth(year, 10, 4, 4);

  return [
    ...withObservedDay(new Date(year, 0, 1), "New Years Day"),
    { date: toYmd(nthWeekdayOfMonth(year, 4, 1, -1)), label: "Memorial Day" },
    ...withObservedDay(new Date(year, 6, 4), "Independence Day"),
    { date: toYmd(nthWeekdayOfMonth(year, 8, 1, 1)), label: "Labor Day" },
    { date: toYmd(thanksgiving), label: "Thanksgiving" },
    { date: toYmd(new Date(year, 10, thanksgiving.getDate() + 1)), label: "Thanksgiving" },
    ...withObservedDay(new Date(year, 11, 25), "Christmas Day"),
    ...withObservedDay(new Date(year, 11, 31), "New Years Eve"),
  ].sort((a, b) => a.date.localeCompare(b.date));
}

export function getWorkHolidayYears(from: Date = new Date()): number[] {
  const lastYear = Math.max(from.getFullYear() + YEARS_AHEAD, FIRST_YEAR);
  const years: number[] = [];
  for (let year = FIRST_YEAR; year <= lastYear; year += 1) years.push(year);
  return years;
}

export function getWorkHolidaysForYear(year: number): WorkHoliday[] {
  if (year < FIRST_YEAR) return [];
  return WORK_HOLIDAY_SCHEDULE[year] ?? projectHolidaysForYear(year);
}

/** The next holiday on or after `from`, searching forward across the available years. */
export function getNextWorkHoliday(from: Date = new Date()): WorkHoliday | undefined {
  const today = toYmd(from);
  for (const year of getWorkHolidayYears(from)) {
    const match = getWorkHolidaysForYear(year).find((entry) => entry.date >= today);
    if (match) return match;
  }
  return undefined;
}
