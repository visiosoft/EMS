import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { BadgeDollarSign, ChevronLeft, ChevronRight } from "lucide-react";
import { InternalPageHero } from "../components/InternalPageHero";
import { InternalPageFrame } from "../layout/InternalPageFrame";
import {
  getNextPayday,
  getPaydaysForYear,
  type PayPeriod,
} from "../lib/payrollCalendar";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatShort(ymd: string): string {
  return format(parseISO(ymd), "MMM d");
}

function formatLong(ymd: string): string {
  return format(parseISO(ymd), "EEEE, MMMM d, yyyy");
}

function PaydayRow({ period, highlight }: { period: PayPeriod; highlight: boolean }) {
  return (
    <li
      className={`flex items-center gap-4 rounded-md border px-4 py-3 ${
        highlight ? "border-black bg-black text-white" : "border-neutral-200 bg-white"
      }`}
    >
      <div
        className={`flex h-[56px] w-[56px] shrink-0 flex-col items-center justify-center rounded-md border ${
          highlight ? "border-white/30 bg-white/10" : "border-neutral-200 bg-neutral-50"
        }`}
      >
        <span className={`text-[10px] font-semibold uppercase ${highlight ? "text-white/80" : "text-neutral-600"}`}>
          {format(parseISO(period.payday), "MMM")}
        </span>
        <span className="text-[22px] font-bold leading-none">{format(parseISO(period.payday), "d")}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">
          Payday — {format(parseISO(period.payday), "EEEE")}
          {highlight ? (
            <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
              Next
            </span>
          ) : null}
        </p>
        <p className={`mt-0.5 text-xs font-medium ${highlight ? "text-white/80" : "text-neutral-600"}`}>
          Covers {formatShort(period.periodStart)} – {formatShort(period.periodEnd)}
        </p>
      </div>
    </li>
  );
}

export function PayrollSchedulePage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const periods = useMemo(() => getPaydaysForYear(year), [year]);
  const nextPayday = useMemo(() => getNextPayday(), []);

  const periodsByMonth = useMemo(() => {
    const grouped = new Map<number, PayPeriod[]>();
    for (const period of periods) {
      const month = parseISO(period.payday).getMonth();
      const list = grouped.get(month) ?? [];
      list.push(period);
      grouped.set(month, list);
    }
    return grouped;
  }, [periods]);

  return (
    <InternalPageFrame>
      <InternalPageHero
        title="Payroll Schedule"
        subtitle="Paychecks land every other Friday and cover the two-week period ending the previous Friday."
      />

      <main className="mx-auto w-full max-w-[1060px] px-5 pb-16 pt-14 sm:px-8 lg:px-0">
        <section className="mb-10 flex flex-col items-start justify-between gap-4 rounded-lg bg-[#0c0c0c] px-6 py-5 text-white shadow-[0_4px_16px_rgba(0,0,0,0.22)] sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <span className="rounded-xl bg-black/30 p-3" aria-hidden>
              <BadgeDollarSign className="h-9 w-9" strokeWidth={1.7} />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Next payday</p>
              <p className="mt-1 text-lg font-semibold">{formatLong(nextPayday.payday)}</p>
              <p className="mt-0.5 text-xs font-medium text-white/75">
                Covers {formatShort(nextPayday.periodStart)} – {formatShort(nextPayday.periodEnd)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2" role="group" aria-label="Choose year">
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/25 bg-white/10 transition-colors hover:bg-white/20"
              aria-label="Previous year"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <span className="min-w-[64px] text-center text-lg font-bold tabular-nums">{year}</span>
            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/25 bg-white/10 transition-colors hover:bg-white/20"
              aria-label="Next year"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </section>

        <section aria-label={`Paydays in ${year}`} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MONTH_NAMES.map((monthName, monthIndex) => {
            const monthPeriods = periodsByMonth.get(monthIndex) ?? [];
            if (monthPeriods.length === 0) return null;
            return (
              <article key={monthName} className="rounded-lg border border-neutral-200 bg-white p-4">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-neutral-900">
                  {monthName} {year}
                </h2>
                <ul className="space-y-2.5">
                  {monthPeriods.map((period) => (
                    <PaydayRow
                      key={period.payday}
                      period={period}
                      highlight={period.payday === nextPayday.payday}
                    />
                  ))}
                </ul>
              </article>
            );
          })}
        </section>

        <p className="mt-10 text-xs leading-relaxed text-neutral-500">
          Generated from the ADP biweekly cycle: every other Friday is payday for the two-week
          period that ends the previous Friday. Contact HR if a listed date differs from the
          official ADP schedule.
        </p>
      </main>
    </InternalPageFrame>
  );
}
