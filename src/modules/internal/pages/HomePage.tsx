import { EngagementWidget } from "../components/EngagementWidget";
import { HomeNewsSection } from "../components/HomeNewsSection";
import { HubActionCards } from "../components/HubActionCards";
import { InternalFooter } from "../components/InternalFooter";
import { TimeZonesWidget } from "../components/TimeZonesWidget";

export function InternalHomePage() {
  return (
    <div className="bg-white text-black">
      <div className="mx-auto w-full max-w-[1180px] px-5 pb-0 pt-8 sm:px-8 md:pt-12 lg:px-10 xl:px-12">
        <section className="relative mb-12 overflow-hidden py-8 text-center sm:mb-24 sm:py-10 md:mb-28 lg:mb-32">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-full max-w-[820px] opacity-[0.035]"
            style={{
              backgroundImage:
                "radial-gradient(circle at center, #000 0 1.2px, transparent 1.3px)",
              backgroundSize: "14px 14px",
              maskImage: "radial-gradient(circle at 50% 45%, black 0%, black 42%, transparent 76%)",
            }}
            aria-hidden
          />
          <p className="relative mx-auto mb-4 inline-flex bg-black px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-white shadow-sm">
            Welcome
          </p>
          <h1 className="relative text-3xl font-bold tracking-[-0.02em] text-black sm:text-4xl lg:text-[38px]">
            Your Hub For All Things iAE
          </h1>
        </section>

        <HubActionCards />

        <section className="mt-12 grid gap-x-8 gap-y-10 lg:grid-cols-[minmax(260px,1fr)_minmax(260px,0.92fr)_minmax(260px,1fr)] xl:gap-x-10">
          <EngagementWidget title="Engagements This Week" />
          <TimeZonesWidget />
          <EngagementWidget title="Engagements Next Week" />
        </section>

        <HomeNewsSection />
      </div>

      <div className="mx-auto w-full max-w-[1180px] px-5 sm:px-8 lg:px-10 xl:px-12">
        <InternalFooter />
      </div>
    </div>
  );
}
