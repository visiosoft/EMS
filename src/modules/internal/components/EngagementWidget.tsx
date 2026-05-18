import { Calendar, Plus } from "lucide-react";
import { SAMPLE_ENGAGEMENTS } from "../constants/quickLinks";

type EngagementWidgetProps = {
  title: string;
};

export function EngagementWidget({ title }: EngagementWidgetProps) {
  return (
    <section className="group min-w-0 animate-slide-up bg-white">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-[17px] font-semibold leading-tight tracking-[0.02em] text-neutral-900">
          {title}
        </h3>
        <a
          href="#see-all"
          className="shrink-0 text-xs font-semibold text-neutral-900 underline-offset-4 hover:underline"
        >
          See all
        </a>
      </div>

      <button
        type="button"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-neutral-900 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add event
      </button>

      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center bg-black text-white shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5">
          <Calendar className="h-6 w-6" strokeWidth={1.5} aria-hidden />
        </div>
        <div className="pt-0.5">
          <p className="text-sm font-semibold text-neutral-950">Create an event</p>
          <p className="mt-1 max-w-[245px] text-[13px] leading-snug text-neutral-600">
            When you add an event, it will show here where your readers can see it.
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {SAMPLE_ENGAGEMENTS.map((event, index) => (
          <li
            key={`${title}-${index}`}
            className="flex items-center gap-4 rounded-sm transition-colors duration-200 hover:bg-neutral-50"
          >
            <div className="flex h-[64px] w-[64px] shrink-0 flex-col items-center justify-center border border-neutral-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]">
              <span className="text-[11px] font-medium text-neutral-700">{event.month}</span>
              <span className="text-[25px] font-semibold leading-none text-neutral-950">{event.day}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-neutral-950">{event.title}</p>
              <p className="mt-1 truncate text-[12px] font-medium text-neutral-800">{event.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}