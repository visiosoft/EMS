import { Plus } from "lucide-react";
import { handleOpenEngagements } from "../lib/emsOpenIntent";
import { useHubEngagementSchedule } from "../hooks/useHubEngagementSchedule";

export function WeeklyRecapSection() {
  const { events, isLoading, isError, isAuthenticated, userOid } = useHubEngagementSchedule("this");

  return (
    <section className="mt-8 bg-black px-5 py-10 text-white sm:px-8 lg:px-10 xl:px-12">
      <div className="mx-auto max-w-[1180px]">
        <div className="flex items-end justify-between gap-4 border-b border-white/35 pb-4">
          <h2 className="text-2xl font-semibold tracking-[0.01em] sm:text-[30px]">Weekly Dept Head Meeting Recap</h2>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            onClick={(event) => handleOpenEngagements(event)}
            className="text-sm font-semibold text-white/90 underline-offset-4 hover:underline"
          >
            See all
          </a>
        </div>

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          onClick={(event) => handleOpenEngagements(event, true)}
          className="mt-8 inline-flex items-center gap-3 text-sm font-semibold text-white hover:text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-black"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add event
        </a>

        {isLoading ? (
          <p className="mt-8 text-sm font-medium text-white/75">Loading your engagements…</p>
        ) : null}

        {isError ? (
          <p className="mt-8 text-sm font-medium text-white/75">Could not load engagements. Try again later.</p>
        ) : null}

        {isAuthenticated && !userOid ? (
          <p className="mt-8 text-sm font-medium text-white/75">Sign in to see your engagements for this week.</p>
        ) : null}

        {!isLoading && !isError && userOid && events.length === 0 ? (
          <p className="mt-8 text-sm font-medium text-white/75">No engagements scheduled for you this week.</p>
        ) : null}

        {events.length > 0 ? (
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <article key={event.key} className="flex items-center gap-4">
                <div className="flex h-[58px] w-[66px] shrink-0 flex-col items-center justify-center border border-white/20 bg-black">
                  <span className="text-xs font-semibold text-white/85">{event.month}</span>
                  <span className="text-2xl font-semibold leading-none text-white">{event.day}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{event.title}</p>
                  <p className="mt-1 text-xs font-semibold text-white/90">{event.time}</p>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
