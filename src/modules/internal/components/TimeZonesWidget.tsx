import { useEffect, useState } from "react";
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

export function TimeZonesWidget() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="rounded-sm border border-neutral-200 bg-white p-4">
      <h3 className="mb-3 text-base font-semibold text-black">Time Zones</h3>
      <ul className="space-y-2">
        {TIME_ZONE_LOCATIONS.map((loc, index) => {
          const { time, date } = formatClock(loc.timeZone, now);
          const isPrimary = index === 0;

          return (
            <li
              key={loc.city}
              className={
                isPrimary
                  ? "rounded border border-neutral-200 bg-neutral-50 px-4 py-4"
                  : "rounded border border-neutral-100 px-4 py-3"
              }
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-neutral-800">{loc.city}</span>
                {loc.offsetLabel ? (
                  <span className="text-xs font-medium text-neutral-500">{loc.offsetLabel}</span>
                ) : null}
              </div>
              <p
                className={
                  isPrimary
                    ? "mt-1 text-3xl font-semibold tracking-tight text-black"
                    : "mt-0.5 text-xl font-semibold text-black"
                }
              >
                {time}
              </p>
              <p className="text-xs text-neutral-500">{date}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
