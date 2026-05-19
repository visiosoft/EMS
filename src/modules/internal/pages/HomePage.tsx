import { EngagementWidget } from "../components/EngagementWidget";
import { HomeNewsSection } from "../components/HomeNewsSection";
import { HubActionCards } from "../components/HubActionCards";
import { TimeZonesWidget } from "../components/TimeZonesWidget";

export function InternalHomePage() {
  return (
    <div className="bg-white text-black">
      <section
        className="relative isolate flex min-h-[320px] items-center justify-center overflow-hidden bg-[#0b080c] px-4 py-12 text-center text-white sm:px-8 sm:py-16 md:min-h-[360px] lg:px-10 xl:px-12"
        style={{
          backgroundImage: "url('/internal-hub-bg.svg')",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      >
        <div className="absolute inset-0 bg-black/8" aria-hidden />
        <div className="relative mx-auto flex max-w-[980px] flex-col items-center">
          <p className="mb-5 inline-flex border border-white/35 bg-black/55 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-white shadow-sm backdrop-blur-sm">
            Welcome
          </p>
          <h1 className="text-[clamp(2rem,9vw,4rem)] font-bold tracking-[-0.035em] text-white leading-[1.08] lg:leading-[1.05]">
            Your Hub For All Things iAE
          </h1>
          <p className="mt-4 max-w-[620px] text-base font-semibold leading-relaxed text-white/86 sm:mt-6 sm:text-lg">
            A central space for news, services, documents, events, and the resources that keep the day moving.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-14 pt-10 sm:px-8 sm:pb-16 sm:pt-14 md:pt-20 lg:px-10 xl:px-12">
        <HubActionCards />

        <section className="mt-12 grid gap-x-8 gap-y-10 lg:grid-cols-[minmax(260px,1fr)_minmax(260px,0.92fr)_minmax(260px,1fr)] xl:gap-x-10">
          <EngagementWidget title="Engagements This Week" scheduleWeek="this" />
          <TimeZonesWidget />
          <EngagementWidget title="Engagements Next Week" scheduleWeek="next" />
        </section>

        <HomeNewsSection />
      </div>
    </div>
  );
}
