import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { handleOpenEngagements, handleOpenEmsCalendar } from "../lib/emsOpenIntent";
import { useHubEngagementSchedule } from "../hooks/useHubEngagementSchedule";
import type { HubEngagementEvent } from "../lib/hubEngagementSchedule";

type UrgentUpcomingSectionProps = {
  /** When true, sits in the page footer band (black fills remaining viewport height). */
  pinned?: boolean;
};

function EventCard({ event }: { event: HubEngagementEvent }) {
  return (
    <article className="flex min-w-0 items-center gap-4 sm:gap-5">
      <div className="flex h-[58px] w-[66px] shrink-0 flex-col items-center justify-center border border-white/25 bg-black sm:h-[64px] sm:w-[72px]">
        <span className="text-xs font-semibold text-white/85">{event.month}</span>
        <span className="text-2xl font-semibold leading-none text-white sm:text-[26px]">{event.day}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-white sm:text-base">{event.title}</p>
        <p className="mt-1 text-xs font-medium text-white/90 sm:text-sm">{event.time}</p>
      </div>
    </article>
  );
}

function StatusMessage({ children }: { children: ReactNode }) {
  return <p className="text-sm font-medium leading-relaxed text-white/78 sm:text-base">{children}</p>;
}

export function UrgentUpcomingSection({ pinned = false }: UrgentUpcomingSectionProps) {
  const { events, isLoading, isError, isAuthenticated, userOid } = useHubEngagementSchedule("this");

  const showEmptyWeek = !isLoading && !isError && userOid && events.length === 0;

  return (
    <section
      className={cn(
        "w-full bg-black px-4 py-10 text-white sm:px-8 sm:py-12 lg:px-10 xl:px-12",
        pinned ? "pt-10 sm:pt-12" : "mt-8 pb-14 pt-12 sm:pb-16 sm:pt-[84px]",
      )}
    >
      <div className="mx-auto w-full max-w-[1104px]">
        <div className="grid gap-4 sm:gap-7 md:grid-cols-[1fr_216px]">
          <h2 className="text-[28px] font-semibold leading-none tracking-[-0.02em] text-white sm:text-[34px]">
            Urgent / Upcoming
          </h2>
          <div className="flex items-center justify-between gap-4 md:relative md:block md:h-[116px] md:w-[216px]">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              onClick={handleOpenEmsCalendar}
              className="text-sm font-medium text-white underline underline-offset-2 hover:text-white/80 sm:text-base md:absolute md:left-[10px] md:top-0"
            >
              View Full Calendar
            </a>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              onClick={(event) => handleOpenEngagements(event)}
              className="text-sm font-semibold text-white hover:text-white/80 md:absolute md:left-[107px] md:top-[92px] sm:text-base"
            >
              See all
            </a>
          </div>
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
          <div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-8">
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
