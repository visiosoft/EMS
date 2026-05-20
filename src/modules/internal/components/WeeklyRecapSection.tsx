import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { handleOpenEngagements } from "../lib/emsOpenIntent";
import { useHubEngagementSchedule } from "../hooks/useHubEngagementSchedule";
import type { HubEngagementEvent } from "../lib/hubEngagementSchedule";

type WeeklyRecapSectionProps = {
  /** When true, sits in the page footer band (black fills remaining viewport height). */
  pinned?: boolean;
};

function EventCard({ event }: { event: HubEngagementEvent }) {
  return (
    <article className="flex min-w-0 items-center gap-5">
      <div className="flex h-[64px] w-[72px] shrink-0 flex-col items-center justify-center border border-white/25 bg-black">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/85">{event.month}</span>
        <span className="text-[26px] font-semibold leading-none text-white">{event.day}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold leading-snug text-white">{event.title}</p>
        <p className="mt-1.5 text-sm font-medium leading-relaxed text-white/90">{event.time}</p>
      </div>
    </article>
  );
}

function StatusMessage({ children }: { children: ReactNode }) {
  return <p className="text-base font-medium leading-relaxed text-white/78">{children}</p>;
}

export function WeeklyRecapSection({ pinned = false }: WeeklyRecapSectionProps) {
  const { events, isLoading, isError, isAuthenticated, userOid } = useHubEngagementSchedule("this");

  const showEmptyWeek =
    !isLoading && !isError && userOid && events.length === 0;

  return (
    <section
      className={cn(
        "w-full bg-black px-5 py-10 text-white sm:px-8 sm:py-12 lg:px-10 xl:px-12",
        pinned ? "pt-10 sm:pt-12" : "mt-8",
      )}
    >
      <div className="mx-auto w-full max-w-[1104px]">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/35 pb-5">
          <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-[32px]">
            Weekly Dept Head Meeting Recap
          </h2>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            onClick={(event) => handleOpenEngagements(event)}
            className="shrink-0 text-sm font-semibold text-white/90 underline-offset-4 hover:text-white hover:underline sm:text-base"
          >
            See all
          </a>
        </div>

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          onClick={(event) => handleOpenEngagements(event, true)}
          className="mt-6 inline-flex items-center gap-3 text-sm font-semibold text-white hover:text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-black sm:mt-8 sm:text-base"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add event
        </a>

        {isLoading ? (
          <div className="mt-8">
            <StatusMessage>Loading your engagements…</StatusMessage>
          </div>
        ) : null}

        {isError ? (
          <div className="mt-8">
            <StatusMessage>Could not load engagements. Try again later.</StatusMessage>
          </div>
        ) : null}

        {isAuthenticated && !userOid ? (
          <div className="mt-8">
            <StatusMessage>Sign in to see your engagements for this week.</StatusMessage>
          </div>
        ) : null}

        {!isLoading && !isError && events.length > 0 ? (
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-8">
            {events.map((event) => (
              <EventCard key={event.key} event={event} />
            ))}
          </div>
        ) : null}

        {showEmptyWeek ? (
          <p className="mt-6 text-sm font-medium text-white/65 sm:text-base">
            No engagements scheduled for you this week.
          </p>
        ) : null}
      </div>
    </section>
  );
}
