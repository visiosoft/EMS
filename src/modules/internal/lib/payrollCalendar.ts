import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

/**
 * Biweekly ADP payroll: every other Friday is payday, covering the two-week
 * period that ends the previous Friday (per Adam Epstein's formula).
 *
 * TODO(verify): confirm this anchor against the ADP "2026 Payroll Schedule
 * (Revised)" PDF before release. Any confirmed payday works — the whole
 * schedule is derived from it in 14-day steps.
 */
export const ANCHOR_PAYDAY = "2026-01-09";

export type PayPeriod = {
  /** Payday Friday (YYYY-MM-DD). */
  payday: string;
  /** First day of the two-week period this check covers (a Saturday). */
  periodStart: string;
  /** Last day of the covered period — the Friday before payday. */
  periodEnd: string;
};

const PAY_CYCLE_DAYS = 14;

function anchorDate(): Date {
  return parseISO(ANCHOR_PAYDAY);
}

function toYmd(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** True when the given date falls on a payday Friday of the biweekly cycle. */
export function isPayday(date: Date): boolean {
  const diff = differenceInCalendarDays(date, anchorDate());
  return diff % PAY_CYCLE_DAYS === 0;
}

function payPeriodForPayday(payday: Date): PayPeriod {
  return {
    payday: toYmd(payday),
    // Two-week period ending the previous Friday: payday-20 … payday-7.
    periodStart: toYmd(addDays(payday, -20)),
    periodEnd: toYmd(addDays(payday, -7)),
  };
}

/** All paydays whose payday date falls inside the given calendar year, ascending. */
export function getPaydaysForYear(year: number): PayPeriod[] {
  const anchor = anchorDate();
  const yearStart = new Date(year, 0, 1);
  // Step back to the first cycle date on/after Jan 1.
  const diffToStart = differenceInCalendarDays(yearStart, anchor);
  const cyclesToStart = Math.ceil(diffToStart / PAY_CYCLE_DAYS);
  let cursor = addDays(anchor, cyclesToStart * PAY_CYCLE_DAYS);

  const periods: PayPeriod[] = [];
  while (cursor.getFullYear() === year) {
    periods.push(payPeriodForPayday(cursor));
    cursor = addDays(cursor, PAY_CYCLE_DAYS);
  }
  return periods;
}

/** Paydays for one month (0-based month to match Date). */
export function getPaydaysForMonth(year: number, month: number): PayPeriod[] {
  return getPaydaysForYear(year).filter(
    (period) => parseISO(period.payday).getMonth() === month,
  );
}

/** The next payday on/after the given date (defaults to today). */
export function getNextPayday(from: Date = new Date()): PayPeriod {
  const anchor = anchorDate();
  const diff = differenceInCalendarDays(from, anchor);
  const cycles = Math.ceil(diff / PAY_CYCLE_DAYS);
  return payPeriodForPayday(addDays(anchor, cycles * PAY_CYCLE_DAYS));
}
