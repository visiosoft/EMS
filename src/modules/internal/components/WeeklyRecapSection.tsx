import { Calendar, Plus } from "lucide-react";
import { RECAP_EVENTS } from "../constants/pageData";

export function WeeklyRecapSection() {
  return (
    <section className="mt-8 bg-black px-5 py-10 text-white sm:px-8 lg:px-10 xl:px-12">
      <div className="mx-auto max-w-[1180px]">
        <div className="flex items-end justify-between gap-4 border-b border-white/35 pb-4">
          <h2 className="text-2xl font-semibold tracking-[0.01em] sm:text-[30px]">Weekly Dept Head Meeting Recap</h2>
          <a href="#see-recaps" className="text-sm font-semibold text-white/90 underline-offset-4 hover:underline">
            See all
          </a>
        </div>

        <button
          type="button"
          className="mt-8 inline-flex items-center gap-3 text-sm font-semibold text-white hover:text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-black"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add event
        </button>

        <div className="mt-8 grid gap-8 md:grid-cols-[minmax(220px,1.1fr)_repeat(3,minmax(150px,1fr))]">
          <div className="flex items-center gap-4">
            <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center bg-white/40 text-black">
              <Calendar className="h-7 w-7" strokeWidth={1.7} aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold">Create an event</p>
              <p className="mt-1 max-w-[230px] text-xs font-semibold leading-snug text-white/90">
                When you add an event, it will show here where your readers can see it.
              </p>
            </div>
          </div>

          {RECAP_EVENTS.map((event, index) => (
            <article key={index} className="flex items-center gap-4">
              <div className="flex h-[58px] w-[66px] shrink-0 flex-col items-center justify-center border border-white/20 bg-black">
                <span className="text-xs font-semibold text-white/85">{event.month}</span>
                <span className="text-2xl font-semibold leading-none text-white">{event.day}</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{event.title}</p>
                <p className="mt-1 truncate text-xs font-semibold text-white/90">{event.time}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
