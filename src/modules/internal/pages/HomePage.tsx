import { EngagementWidget } from "../components/EngagementWidget";
import { HubActionCards } from "../components/HubActionCards";
import { TimeZonesWidget } from "../components/TimeZonesWidget";

export function InternalHomePage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-10 text-center">
        <p className="mx-auto mb-4 inline-block bg-black px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
          Welcome
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-black sm:text-4xl lg:text-[2.35rem]">
          Your Hub For All Things iAE
        </h1>
      </section>

      <HubActionCards />

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <EngagementWidget title="Engagements This Week" />
        <TimeZonesWidget />
        <EngagementWidget title="Engagements Next Week" />
      </section>
    </div>
  );
}
