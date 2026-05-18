import { Calendar, Plus } from "lucide-react";

type EngagementWidgetProps = {
  title: string;
};

export function EngagementWidget({ title }: EngagementWidgetProps) {
  return (
    <section className="flex min-h-[260px] flex-col rounded border border-neutral-200 bg-white p-4">
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-black leading-tight">{title}</h3>
        <a
          href="#see-all"
          className="shrink-0 text-sm text-neutral-600 underline-offset-2 hover:underline"
        >
          See all
        </a>
      </div>

      {/* Add event button */}
      <button
        type="button"
        className="mb-4 inline-flex w-fit items-center gap-1 rounded border border-neutral-300 bg-white px-2.5 py-1 text-sm font-medium text-black hover:bg-neutral-50 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Add event
      </button>

      {/* Empty state */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6">
        <div className="flex h-12 w-12 items-center justify-center rounded bg-black text-white">
          <Calendar className="h-6 w-6" strokeWidth={1.5} aria-hidden />
        </div>
        <p className="max-w-[190px] text-center text-sm text-neutral-500 leading-snug">
          Create an event to see it listed here.
        </p>
      </div>
    </section>
  );
}