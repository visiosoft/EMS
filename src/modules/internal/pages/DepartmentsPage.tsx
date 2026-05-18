import { InternalPageHero } from "../components/InternalPageHero";
import { WeeklyRecapSection } from "../components/WeeklyRecapSection";
import { DEPARTMENT_CARDS } from "../constants/pageData";

export function DepartmentsPage() {
  return (
    <div className="bg-white text-black">
      <InternalPageHero
        title="Departments"
        subtitle="A centralized view of all departments, making it easy to explore teams, roles, and responsibilities across the organization."
      />

      <main className="mx-auto w-full max-w-[920px] px-5 pb-[22px] pt-[70px] sm:px-8 lg:px-0">
        <section className="flex flex-wrap justify-center gap-[10px]" aria-label="Departments">
          {DEPARTMENT_CARDS.map((department, index) => {
            const Icon = department.icon;
            return (
              <article
                key={department.title}
                className="group flex h-[166px] w-[142px] flex-col rounded-md bg-black px-5 pb-5 pt-6 text-white shadow-[0_4px_16px_rgba(0,0,0,0.24)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(0,0,0,0.28)]"
                style={{ animationDelay: `${index * 65}ms` }}
              >
                <div className="flex flex-1 items-center justify-center pb-2">
                  <Icon className="h-[50px] w-[50px] transition-transform duration-300 group-hover:scale-110" strokeWidth={1.45} aria-hidden />
                </div>
                <h3 className="mb-2 min-h-[22px] text-[13px] font-semibold leading-tight text-white">{department.title}</h3>
                <a
                  href={`#${department.title.toLowerCase().replace(/\s+/g, "-")}`}
                  className="inline-flex h-[25px] items-center justify-center rounded-sm bg-white px-4 text-[10px] font-bold uppercase tracking-[0.08em] text-black hover:bg-neutral-200"
                >
                  See more
                </a>
              </article>
            );
          })}
        </section>
      </main>

      <WeeklyRecapSection />
    </div>
  );
}
