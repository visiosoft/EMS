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

      <main className="mx-auto w-full max-w-[1180px] px-5 pb-8 pt-14 sm:px-8 lg:px-10 xl:px-12">
        <section className="flex flex-wrap justify-center gap-3 sm:gap-4" aria-label="Departments">
          {DEPARTMENT_CARDS.map((department, index) => {
            const Icon = department.icon;
            return (
              <article
                key={department.title}
                className="group flex h-[170px] w-full max-w-[155px] flex-col justify-end rounded-md bg-black p-5 text-white shadow-[0_4px_16px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(0,0,0,0.28)] sm:w-[155px]"
                style={{ animationDelay: `${index * 65}ms` }}
              >
                <div className="mb-auto flex justify-center pt-4">
                  <Icon className="h-12 w-12 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.35} aria-hidden />
                </div>
                <h3 className="mb-2 text-sm font-semibold text-white">{department.title}</h3>
                <a
                  href={`#${department.title.toLowerCase().replace(/\s+/g, "-")}`}
                  className="inline-flex h-7 items-center justify-center rounded-sm bg-white px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-black hover:bg-neutral-200"
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
