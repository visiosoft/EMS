import { EngagementWidget } from "../components/EngagementWidget";
import { HomeNewsSection } from "../components/HomeNewsSection";
import { HubActionCards } from "../components/HubActionCards";
import { TimeZonesWidget } from "../components/TimeZonesWidget";

export function InternalHomePage() {
  return (
    <div className="bg-white text-black">
      <section className="relative isolate overflow-hidden bg-[#080708] px-5 py-20 text-center text-white sm:px-8 sm:py-24 lg:px-10 xl:px-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(circle at 50% 46%, rgba(255,255,255,0.18) 0 2px, transparent 2.4px), radial-gradient(circle at 50% 50%, rgba(255,255,255,0.20), rgba(255,255,255,0.03) 38%, transparent 68%)",
            backgroundSize: "16px 16px, 100% 100%",
            maskImage:
              "radial-gradient(ellipse at 50% 48%, black 0%, black 42%, rgba(0,0,0,0.68) 55%, transparent 78%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.12),rgba(8,7,8,0.78)_48%,#080708_100%)]"
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-[980px] flex-col items-center">
          <p className="mb-5 inline-flex border border-white/35 bg-black/50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-white shadow-sm backdrop-blur-sm">
            Welcome
          </p>
          <h1 className="text-4xl font-bold tracking-[-0.035em] text-white sm:text-5xl lg:text-[64px] lg:leading-[1.05]">
            Your Hub For All Things iAE
          </h1>
          <p className="mt-6 max-w-[620px] text-base font-semibold leading-relaxed text-white/86 sm:text-lg">
            A central space for news, services, documents, events, and the resources that keep the day moving.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1180px] px-5 pb-16 pt-14 sm:px-8 md:pt-20 lg:px-10 xl:px-12">
        <HubActionCards />

        <section className="mt-12 grid gap-x-8 gap-y-10 lg:grid-cols-[minmax(260px,1fr)_minmax(260px,0.92fr)_minmax(260px,1fr)] xl:gap-x-10">
          <EngagementWidget title="Engagements This Week" />
          <TimeZonesWidget />
          <EngagementWidget title="Engagements Next Week" />
        </section>

        <HomeNewsSection />
      </div>
    </div>
  );
}
