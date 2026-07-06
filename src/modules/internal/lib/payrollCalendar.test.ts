import { describe, expect, it } from "vitest";
import { parseISO } from "date-fns";
import {
  ANCHOR_PAYDAY,
  getNextPayday,
  getPaydaysForMonth,
  getPaydaysForYear,
  isPayday,
} from "./payrollCalendar";

describe("payrollCalendar", () => {
  it("anchors on a Friday", () => {
    expect(parseISO(ANCHOR_PAYDAY).getDay()).toBe(5);
  });

  it("marks the anchor and every 14th day as paydays", () => {
    expect(isPayday(parseISO(ANCHOR_PAYDAY))).toBe(true);
    expect(isPayday(parseISO("2026-01-16"))).toBe(true);
    expect(isPayday(parseISO("2026-01-30"))).toBe(true);
    expect(isPayday(parseISO("2025-12-19"))).toBe(true); // one cycle before the anchor
    expect(isPayday(parseISO("2026-01-09"))).toBe(false); // off-week Friday
    expect(isPayday(parseISO("2026-01-01"))).toBe(false); // Thursday
  });

  it("matches the official ADP 2026 payday schedule", () => {
    // Boxed paydays from the ADP 2026 Payroll Schedule, month → days.
    const expected: Record<number, number[]> = {
      0: [2, 16, 30], 1: [13, 27], 2: [13, 27], 3: [10, 24],
      4: [8, 22], 5: [5, 19], 6: [3, 17, 31], 7: [14, 28],
      8: [11, 25], 9: [9, 23], 10: [6, 20], 11: [4, 18],
    };
    for (const [month, days] of Object.entries(expected)) {
      const actual = getPaydaysForMonth(2026, Number(month)).map((p) =>
        parseISO(p.payday).getDate(),
      );
      expect(actual).toEqual(days);
    }
  });

  it("covers the two-week period ending the previous Friday", () => {
    const jan = getPaydaysForMonth(2026, 0);
    const anchorPeriod = jan.find((p) => p.payday === ANCHOR_PAYDAY);
    expect(anchorPeriod).toBeDefined();
    // Payday Fri 2026-01-02 covers Sat 2025-12-13 through Fri 2025-12-26.
    expect(anchorPeriod!.periodEnd).toBe("2025-12-26");
    expect(anchorPeriod!.periodStart).toBe("2025-12-13");
    expect(parseISO(anchorPeriod!.periodEnd).getDay()).toBe(5);
    expect(parseISO(anchorPeriod!.periodStart).getDay()).toBe(6);
  });

  it("lists ~26 paydays a year, all Fridays, 14 days apart, within the year", () => {
    for (const year of [2025, 2026, 2027]) {
      const periods = getPaydaysForYear(year);
      expect(periods.length).toBeGreaterThanOrEqual(26);
      expect(periods.length).toBeLessThanOrEqual(27);
      for (const period of periods) {
        const payday = parseISO(period.payday);
        expect(payday.getFullYear()).toBe(year);
        expect(payday.getDay()).toBe(5);
      }
      for (let i = 1; i < periods.length; i += 1) {
        const gap =
          (parseISO(periods[i].payday).getTime() - parseISO(periods[i - 1].payday).getTime()) /
          86_400_000;
        expect(gap).toBe(14);
      }
    }
  });

  it("finds the next payday on or after a date", () => {
    expect(getNextPayday(parseISO("2026-01-02")).payday).toBe("2026-01-02");
    expect(getNextPayday(parseISO("2026-01-03")).payday).toBe("2026-01-16");
    expect(getNextPayday(parseISO("2025-12-27")).payday).toBe("2026-01-02");
  });
});
