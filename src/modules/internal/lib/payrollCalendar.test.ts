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
    expect(isPayday(parseISO("2026-01-23"))).toBe(true);
    expect(isPayday(parseISO("2025-12-26"))).toBe(true); // one cycle before the anchor
    expect(isPayday(parseISO("2026-01-16"))).toBe(false); // off-week Friday
    expect(isPayday(parseISO("2026-01-08"))).toBe(false); // Thursday
  });

  it("covers the two-week period ending the previous Friday", () => {
    const jan = getPaydaysForMonth(2026, 0);
    const anchorPeriod = jan.find((p) => p.payday === ANCHOR_PAYDAY);
    expect(anchorPeriod).toBeDefined();
    // Payday Fri 2026-01-09 covers Sat 2025-12-20 through Fri 2026-01-02.
    expect(anchorPeriod!.periodEnd).toBe("2026-01-02");
    expect(anchorPeriod!.periodStart).toBe("2025-12-20");
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
    expect(getNextPayday(parseISO("2026-01-09")).payday).toBe("2026-01-09");
    expect(getNextPayday(parseISO("2026-01-10")).payday).toBe("2026-01-23");
    expect(getNextPayday(parseISO("2025-12-27")).payday).toBe("2026-01-09");
  });
});
