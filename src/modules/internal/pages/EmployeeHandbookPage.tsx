import { BadgeDollarSign, BookOpen, ClipboardCheck, Home, Star, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { InternalPageHero } from "../components/InternalPageHero";

type HandbookSection = {
  title: string;
  icon: LucideIcon;
};

const handbookSections: HandbookSection[] = [
  { title: "Introduction", icon: UserRound },
  { title: "Employment Policies and Practices", icon: UserRound },
  { title: "Company Policies and Practices", icon: Home },
  { title: "Compensation and Benefits", icon: BadgeDollarSign },
  { title: "Department Guides and Procedures", icon: BookOpen },
  { title: "Work Performance", icon: Star },
  { title: "Employee Acknowledgment Form", icon: ClipboardCheck },
];

function HandbookIntroCard() {
  return (
    <article className="group relative min-h-[305px] overflow-hidden rounded-md border border-neutral-800 bg-[#130606] bg-[url('/images/internal/employee-handbook-stage.svg')] bg-cover bg-center text-white shadow-[0_2px_8px_rgba(0,0,0,0.18)] sm:min-h-[350px]">
      <div className="absolute inset-0 bg-black/20" />

      <div className="relative flex min-h-[305px] flex-col px-6 py-6 sm:min-h-[350px] sm:px-8 sm:py-7">
        <span className="w-max bg-black/70 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
          Employee Handbook
        </span>
        <h2 className="mt-8 max-w-[410px] text-[clamp(1.65rem,4.5vw,2.95rem)] font-semibold leading-tight tracking-[0.05em] text-white">
          A Message from the Chief Executive Officer
        </h2>
        <p className="mt-auto max-w-[410px] text-sm leading-7 text-white/90 sm:text-base">
          Introducing the Innovation Arts Entertainment Employee Handbook.
        </p>
        <a
          href="#introduction"
          className="mt-4 inline-flex h-9 w-max items-center justify-center bg-white px-5 text-sm font-semibold text-black transition duration-200 hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          View Section
        </a>
      </div>
    </article>
  );
}

export function EmployeeHandbookPage() {
  return (
    <div className="bg-white text-black">
      <InternalPageHero
        title="iAE Employee Handbook"
        subtitle="This page is designed to help you familiarize yourself with essential information and provide a quick reference for when you need assistance."
      />

      <main className="mx-auto grid w-full max-w-[1040px] gap-12 px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-16 lg:px-0">
        <section id="introduction" aria-labelledby="handbook-introduction-title">
          <h2 id="handbook-introduction-title" className="mb-10 text-[clamp(1.75rem,3.2vw,2.35rem)] font-semibold tracking-[-0.03em] text-neutral-900">
            Introduction
          </h2>
          <HandbookIntroCard />
        </section>

        <aside aria-labelledby="handbook-toc-title" className="lg:pt-0">
          <h2 id="handbook-toc-title" className="mb-8 text-xl font-semibold tracking-[-0.01em] text-neutral-900 sm:text-2xl">
            Table of Contents
          </h2>
          <nav className="space-y-2" aria-label="Employee handbook table of contents">
            {handbookSections.map((section) => {
              const Icon = section.icon;
              return (
                <a
                  key={section.title}
                  href={`#${section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
                  className="group flex min-h-[58px] items-center gap-4 rounded-sm bg-black px-4 text-sm font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#111] hover:shadow-[0_10px_22px_rgba(0,0,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                >
                  <Icon className="h-6 w-6 shrink-0 text-white/95 transition-transform duration-200 group-hover:scale-110" strokeWidth={1.35} aria-hidden />
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
