import { useMemo } from "react";
import { useMsal } from "@azure/msal-react";
import { getAccountName, getActiveAccount } from "@/auth/entra";
import { EngagementWidget } from "../components/EngagementWidget";
import { HomeNewsSection } from "../components/HomeNewsSection";
import { HubActionCards } from "../components/HubActionCards";
import { TimeZonesWidget } from "../components/TimeZonesWidget";

export function InternalHomePage() {
  const { accounts } = useMsal();
  const account = getActiveAccount() ?? accounts[0] ?? null;
  const displayName = useMemo(() => getAccountName(account), [account]);
  const heroName = displayName && displayName !== "Entra user" ? displayName : "iAE Team";

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
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.035] blur-2xl" aria-hidden />
        <div className="relative mx-auto flex max-w-[980px] flex-col items-center">
          <div className="mb-5 flex flex-col items-center gap-3 sm:mb-6">
            <p className="inline-flex border border-white/35 bg-black/55 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-white shadow-sm backdrop-blur-sm">
              Welcome to your iAE hub
            </p>

            <div className="relative isolate overflow-hidden rounded-full border border-white/18 bg-white/[0.075] px-5 py-2.5 shadow-[0_18px_52px_rgba(0,0,0,0.25)] backdrop-blur-md transition duration-300 hover:border-white/35 hover:bg-white/[0.11] sm:px-6">
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" aria-hidden />
              <div className="flex flex-col items-center gap-0.5 sm:flex-row sm:gap-2.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/58 sm:text-[11px]">
                  Signed in as
                </span>
                <span className="hidden h-1.5 w-1.5 rounded-full bg-white/35 sm:block" aria-hidden />
                <strong className="max-w-[min(78vw,30rem)] truncate text-sm font-extrabold tracking-[0.08em] text-white sm:text-base">
                  {heroName}
                </strong>
              </div>
            </div>
          </div>

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
