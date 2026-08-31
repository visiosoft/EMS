import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Umbrella } from "lucide-react";
import { InternalPageHero } from "../components/InternalPageHero";
import { InternalPageFrame } from "../layout/InternalPageFrame";
import {
  getNextWorkHoliday,
  getWorkHolidayYears,
  getWorkHolidaysForYear,
  type WorkHoliday,
} from "../lib/workHolidays";

function DayCard({ entry, highlight }: { entry: WorkHoliday; highlight: boolean }) {
  const date = parseISO(entry.date);

  return (
    <li
      className={`flex items-center gap-4 rounded-lg border px-4 py-4 ${
        highlight ? "border-black bg-black text-white" : "border-neutral-200 bg-white"
      }`}
    >
      <div
        className={`flex h-[56px] w-[56px] shrink-0 flex-col items-center justify-center rounded-md border ${
          highlight ? "border-white/30 bg-white/10" : "border-neutral-200 bg-neutral-50"
        }`}
      >
        <span className={`text-[10px] font-semibold uppercase ${highlight ? "text-white/80" : "text-neutral-600"}`}>
          {format(date, "MMM")}
        </span>
        <span className="text-[22px] font-bold leading-none">{format(date, "d")}</span>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{entry.label}</p>
          {highlight ? (
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
              Next
            </span>
          ) : null}
        </div>
        <p className={`mt-0.5 text-xs font-medium ${highlight ? "text-white/80" : "text-neutral-600"}`}>
          {format(date, "EEEE, MMMM d, yyyy")}
        </p>
      </div>
    </li>
  );
}

export function WorkHolidaysPage() {
  const years = useMemo(() => getWorkHolidayYears(), []);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(years.includes(currentYear) ? currentYear : years[0]);

  const entries = useMemo(() => getWorkHolidaysForYear(year), [year]);
  const nextHoliday = useMemo(() => getNextWorkHoliday(), []);

  const yearIndex = years.indexOf(year);
  const canGoBack = yearIndex > 0;
  const canGoForward = yearIndex >= 0 && yearIndex < years.length - 1;

  return (
    <InternalPageFrame>
      <InternalPageHero
        title="Official Work Holidays"
        subtitle="The paid company holidays observed each year, as published in the Employee Handbook."
      />

      <main className="mx-auto w-full max-w-[1060px] px-5 pb-16 pt-14 sm:px-8 lg:px-0">
        <section className="mb-10 flex flex-col items-start justify-between gap-4 rounded-lg bg-[#0c0c0c] px-6 py-5 text-white shadow-[0_4px_16px_rgba(0,0,0,0.22)] sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <span className="rounded-xl bg-black/30 p-3" aria-hidden>
              <Umbrella className="h-9 w-9" strokeWidth={1.7} />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Next holiday</p>
              {nextHoliday ? (
                <>
                  <p className="mt-1 text-lg font-semibold">{nextHoliday.label}</p>
                  <p className="mt-0.5 text-xs font-medium text-white/75">
                    {format(parseISO(nextHoliday.date), "EEEE, MMMM d, yyyy")}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm font-medium text-white/75">
                  No upcoming holidays published yet — check back for the next schedule.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2" role="group" aria-label="Choose year">
            <button
              type="button"
              onClick={() => setYear(years[yearIndex - 1])}
              disabled={!canGoBack}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/25 bg-white/10 transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white/10"
              aria-label="Previous year"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <span className="min-w-[64px] text-center text-lg font-bold tabular-nums">{year}</span>
            <button
              type="button"
              onClick={() => setYear(years[yearIndex + 1])}
              disabled={!canGoForward}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/25 bg-white/10 transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white/10"
              aria-label="Next year"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </section>

        <section aria-label={`Official work holidays in ${year}`}>
          {entries.length === 0 ? (
            <p className="rounded-lg border border-neutral-200 bg-white px-5 py-8 text-center text-sm text-neutral-600">
              The {year} holiday schedule has not been published yet.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => (
                <DayCard
                  key={`${entry.date}-${entry.label}`}
                  entry={entry}
                  highlight={entry.date === nextHoliday?.date && entry.label === nextHoliday?.label}
                />
              ))}
            </ul>
          )}
        </section>

        <p className="mt-10 text-xs leading-relaxed text-neutral-500">
          Official paid company holidays, as published in the Employee Handbook. Contact HR with
          questions about eligibility or holiday pay.
        </p>
      </main>
    </InternalPageFrame>
  );
}
