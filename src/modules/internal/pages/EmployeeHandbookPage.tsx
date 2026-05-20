import { useEffect } from "react";
import { Banknote, BookOpen, ClipboardCheck, Home, Lectern, Star, UserRoundCog } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { InternalPageHero } from "../components/InternalPageHero";

type HandbookSection = {
  title: string;
  icon: LucideIcon;
};

const handbookStageImage = "/images/internal/bf7ddb8a-fab3-42ff-8fce-15c415b150c8";

const handbookSections: HandbookSection[] = [
  { title: "Introduction", icon: Lectern },
  { title: "Employment Policies and Practices", icon: UserRoundCog },
  { title: "Company Policies and Practices", icon: Home },
  { title: "Compensation and Benefits", icon: Banknote },
  { title: "Department Guides and Procedures", icon: BookOpen },
  { title: "Work Performance", icon: Star },
  { title: "Employee Acknowledgment Form", icon: ClipboardCheck },
];

function HandbookIntroCard() {
  return (
    <article
      className="relative h-[332px] overflow-hidden rounded-[5px] border border-neutral-800 bg-[#130606] bg-cover bg-center text-white shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
      style={{ backgroundImage: `url('${handbookStageImage}')` }}
    >
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/10 to-black/20" />

      <div className="relative flex h-full flex-col px-5 py-5">
        <span className="w-max bg-black/75 px-2 py-1 text-[8px] font-semibold uppercase leading-none text-white">
          Employee Handbook
        </span>
        <h2 className="mt-3 max-w-[310px] text-[30px] font-semibold leading-[1.28] text-white">
          A Message From the Chief Executive Officer
        </h2>
        <p className="mt-auto max-w-[390px] text-[14px] leading-[1.7] text-white/95">
          Introducing the Innovation Arts Entertainment Employee Handbook.
        </p>
        <a
          href="#introduction"
          className="mt-3 inline-flex h-[27px] w-[93px] items-center justify-center rounded-[3px] bg-white text-[13px] font-medium text-black transition duration-200 hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          View Section
        </a>
      </div>
    </article>
  );
}

export function EmployeeHandbookPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className="bg-white text-black">
      <InternalPageHero
        title="iAE Employee Handbook"
        subtitle="This page is designed to help you familiarize yourself with essential information and provide a quick reference for when you need assistance."
      />

      <main className="mx-auto grid w-full max-w-[970px] gap-12 px-5 pb-20 pt-[52px] sm:px-8 lg:grid-cols-[584px_280px] lg:gap-16 lg:px-0">
        <section id="introduction" aria-labelledby="handbook-introduction-title">
          <h2 id="handbook-introduction-title" className="mb-[37px] text-2xl font-semibold leading-tight text-neutral-900">
            Introduction
          </h2>
          <HandbookIntroCard />
        </section>

        <aside aria-labelledby="handbook-toc-title" className="lg:pt-0">
          <h2 id="handbook-toc-title" className="mb-[29px] text-base font-semibold leading-tight text-neutral-900">
            Table of Contents
          </h2>
          <nav className="space-y-[6px]" aria-label="Employee handbook table of contents">
            {handbookSections.map((section) => {
              const Icon = section.icon;
              return (
                <a
                  key={section.title}
                  href={`#${section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
                  className="group flex h-[53px] items-center gap-[14px] rounded-[4px] bg-black px-[14px] text-[12px] font-normal text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#111] hover:shadow-[0_10px_22px_rgba(0,0,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                >
                  <Icon className="h-[22px] w-[22px] shrink-0 text-white/95 transition-transform duration-200 group-hover:scale-110" strokeWidth={1.5} aria-hidden />
                  <span className="leading-tight">{section.title}</span>
                </a>
              );
            })}
          </nav>
        </aside>
      </main>
    </div>
  );
}
