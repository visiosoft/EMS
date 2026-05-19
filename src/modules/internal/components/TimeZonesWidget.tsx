import { useEffect, useMemo, useState } from "react";
import { TIME_ZONE_LOCATIONS } from "../constants/quickLinks";

type ClockSnapshot = {
  time: string;
  date: string;
};

function formatClock(timeZone: string, now: Date): ClockSnapshot {
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now);

  const date = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(now);

  return { time, date };
}

function getNextMinuteDelay(now: Date) {
  const millisecondsPastMinute = now.getSeconds() * 1000 + now.getMilliseconds();
  return Math.max(250, 60_000 - millisecondsPastMinute);
}

export function TimeZonesWidget() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeoutId: number;

    const scheduleNextTick = () => {
      timeoutId = window.setTimeout(() => {
        setNow(new Date());
        scheduleNextTick();
      }, getNextMinuteDelay(new Date()));
    };

    scheduleNextTick();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setNow(new Date());
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const clocks = useMemo(
    () => TIME_ZONE_LOCATIONS.map((loc) => ({ ...loc, ...formatClock(loc.timeZone, now) })),
    [now],
  );

  return (
    <section className="animate-slide-up bg-white" aria-label="Live time zones">
      <h3 className="mb-4 text-[17px] font-semibold tracking-[0.02em] text-neutral-900">Time Zones</h3>
      <ul className="space-y-2" aria-live="polite">
        {clocks.map((loc, index) => {
          const [clockTime, meridiem = ""] = loc.time.split(" ");
          const isPrimary = index === 0;

          return (
            <li
              key={loc.city}
              className="border border-neutral-200 bg-white px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_7px_20px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-neutral-700">{loc.city}</span>
                {loc.offsetLabel ? (
                  <span className="pt-5 text-[12px] font-medium text-neutral-600">{loc.offsetLabel}</span>
                ) : null}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span
                  className={
                    isPrimary
                      ? "text-[31px] font-semibold leading-none tracking-tight text-neutral-950"
                      : "text-[28px] font-semibold leading-none tracking-tight text-neutral-950"
                  }
                >
                  {clockTime}
                </span>
                <span className="text-xs font-semibold uppercase text-neutral-700">{meridiem}</span>
              </div>
              <p className="mt-0.5 text-xs text-neutral-500">{loc.date}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
