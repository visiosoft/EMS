import { ChevronDown, Plus, UserRound } from "lucide-react";
import { HOME_NEWS_ITEMS } from "../constants/quickLinks";

function NewsImage({ variant, featured = false }: { variant: string; featured?: boolean }) {
  if (featured) {
    return (
      <div className="relative h-[220px] overflow-hidden bg-[#f2d400] md:h-[250px]">
        <div className="absolute -left-12 top-0 h-[130%] w-[48%] rotate-[-10deg] bg-white shadow-[10px_0_20px_rgba(0,0,0,0.12)]" />
        <div className="absolute left-5 top-5 grid h-[210px] w-[180px] rotate-[-10deg] grid-cols-4 grid-rows-7 gap-px border border-neutral-300 bg-neutral-200 opacity-90">
          {Array.from({ length: 28 }).map((_, index) => (
            <span key={index} className="flex items-center justify-center bg-white text-[11px] text-neutral-500">
              {index % 5 === 0 ? index + 1 : ""}
            </span>
          ))}
        </div>
        <div className="absolute right-0 top-0 h-full w-[58%] bg-gradient-to-l from-[#f5d900] via-[#f2d400] to-[#e9cb00]" />
      </div>
    );
  }

  const variantClass =
    variant === "orange"
      ? "bg-[radial-gradient(circle_at_20%_40%,#ef8c4b_0,#ef8c4b_22%,#ff762d_23%,#ff762d_55%,#fff_56%)]"
      : variant === "charcoal"
        ? "bg-[linear-gradient(135deg,#efefef_0%,#efefef_40%,#565656_41%,#565656_100%)]"
        : "bg-[linear-gradient(180deg,#f4f4f4_0%,#f4f4f4_45%,#545454_46%,#545454_100%)]";

  return <div className={`h-[78px] w-full shrink-0 overflow-hidden ${variantClass} md:w-[166px]`} aria-hidden />;
}

export function HomeNewsSection() {
  return (
    <section id="company-news" className="mt-14 animate-slide-up md:mt-16">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-[0.01em] text-neutral-950">News</h2>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-neutral-900 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
        <a href="#see-news" className="text-xs font-semibold text-neutral-900 underline-offset-4 hover:underline">
          See all
        </a>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(330px,0.92fr)]">
        <article className="group min-w-0">
          <NewsImage variant="yellow" featured />
          <div className="mt-4">
            <h3 className="text-xl font-semibold text-neutral-950">Company News</h3>
            <p className="mt-2 line-clamp-2 max-w-[560px] text-[15px] leading-relaxed text-neutral-600">
              Company News Stay updated with the latest announcements, achievements, and company-wide updates.
            </p>
            <div className="mt-6 flex items-center gap-3 text-xs text-neutral-700">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-neutral-500">
                <UserRound className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <strong className="font-semibold text-neutral-900">Haider Khalil</strong> about an hour ago
                <br />
                <span className="text-neutral-500">45 views</span>
              </span>
            </div>
          </div>
        </article>

        <div className="space-y-0 divide-y divide-neutral-200">
          {HOME_NEWS_ITEMS.map((item) => (
            <article
              key={item.title}
              className="group flex flex-col gap-4 py-3 transition-colors duration-200 first:pt-0 hover:bg-neutral-50 md:flex-row md:px-2"
            >
              <NewsImage variant={item.accent} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[16px] font-semibold text-neutral-950 group-hover:underline group-hover:underline-offset-4">
                  {item.title}
                </h3>
                <p className="mt-2 line-clamp-1 text-[13px] text-neutral-600">{item.summary}</p>
                <p className="mt-5 text-xs text-neutral-700">
                  <strong className="font-semibold text-neutral-900">{item.author}</strong> {item.date}
                </p>
                <p className="text-xs text-neutral-500">{item.views}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
