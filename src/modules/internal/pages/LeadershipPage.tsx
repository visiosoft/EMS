import { Mail, Phone, Smartphone, UserRound } from "lucide-react";
import { IaeLogoIcon } from "@/components/brand/IaeBrandMark";
import { InternalPageHero } from "../components/InternalPageHero";
import { InternalPageFrame } from "../layout/InternalPageFrame";
import { WeeklyRecapSection } from "../components/WeeklyRecapSection";
import { LEADERSHIP_CONTACTS } from "../constants/pageData";

export function LeadershipPage() {
  return (
    <InternalPageFrame footer={<WeeklyRecapSection pinned />}>
      <InternalPageHero
        title="Leadership Hub"
        subtitle="A central space for leaders to share updates, align on strategy, and drive organizational success."
      />

      <main className="mx-auto w-full max-w-[1060px] px-5 pb-8 pt-16 sm:px-8 lg:px-0">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {LEADERSHIP_CONTACTS.map((person, index) => (
            <article
              key={person.name}
              className="group min-h-[258px] w-full rounded-lg bg-[#050505] px-4 py-5 text-white shadow-[0_4px_16px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(0,0,0,0.28)] sm:px-6"
              style={{ animationDelay: `${index * 55}ms` }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full border-2 border-white/85 text-white">
                  {person.companyMark ? (
                    <IaeLogoIcon surface="on-dark" className="h-7 w-12" />
                  ) : (
                    <UserRound className="h-9 w-9" strokeWidth={1.25} aria-hidden />
                  )}
                </div>
                <h3 className="mt-3 text-base font-semibold leading-tight text-white">{person.name}</h3>
                <p className="mt-1 min-h-[28px] text-[10px] font-semibold uppercase tracking-[0.18em] text-white/58">
                  {person.title}
                </p>
              </div>

              <div className="mt-4 border-t border-white/18 pt-3">
                <dl className="space-y-2 text-xs">
                  <div className="grid grid-cols-[28px_1fr] gap-2">
                    <dt className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-black">
                      <Phone className="h-3.5 w-3.5" aria-label="Extension" />
                    </dt>
                    <dd>
                      <span className="block text-[9px] uppercase tracking-[0.16em] text-white/50">Extension</span>
                      <span className="font-semibold text-white">{person.extension}</span>
                    </dd>
                  </div>
                  <div className="grid grid-cols-[28px_1fr] gap-2">
                    <dt className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-black">
                      <Smartphone className="h-3.5 w-3.5" aria-label="Mobile" />
                    </dt>
                    <dd>
                      <span className="block text-[9px] uppercase tracking-[0.16em] text-white/50">Mobile</span>
                      <span className="font-semibold text-white">{person.mobile}</span>
                    </dd>
                  </div>
                  <div className="grid grid-cols-[28px_1fr] gap-2">
                    <dt className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-black">
                      <Mail className="h-3.5 w-3.5" aria-label="Email" />
                    </dt>
                    <dd className="min-w-0">
                      <span className="block text-[9px] uppercase tracking-[0.16em] text-white/50">Email</span>
                      <span className="block truncate font-semibold text-white">{person.email}</span>
                    </dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </section>
      </main>
    </InternalPageFrame>
  );
}
