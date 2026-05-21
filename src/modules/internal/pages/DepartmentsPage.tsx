import { InternalPageHero } from "../components/InternalPageHero";
import { WeeklyRecapSection } from "../components/WeeklyRecapSection";
import { DEPARTMENT_CARDS } from "../constants/pageData";
import { departmentTitleToView } from "../routing/internalSessionRoute";
import { useInternalNavigation } from "../routing/InternalNavigationContext";
import { InternalPageFrame } from "../layout/InternalPageFrame";

export function DepartmentsPage() {
  const { navigate } = useInternalNavigation();

  return (
    <InternalPageFrame footer={<WeeklyRecapSection pinned />}>
      <InternalPageHero
        title="Departments"
        subtitle="A centralized view of all departments, making it easy to explore teams, roles, and responsibilities across the organization."
      />

      <main className="mx-auto w-full max-w-[1070px] px-5 pb-[22px] pt-[70px] sm:px-8 lg:px-0">
        <section className="grid grid-cols-2 gap-[10px] sm:grid-cols-3 lg:grid-cols-6 lg:gap-[12px]" aria-label="Departments">
          {DEPARTMENT_CARDS.map((department, index) => {
            const Icon = department.icon;
            const view = departmentTitleToView(department.title);

            return (
              <article
                key={department.title}
                className="group flex h-[166px] w-full flex-col rounded-md bg-black px-5 pb-5 pt-6 text-white shadow-[0_4px_16px_rgba(0,0,0,0.24)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(0,0,0,0.28)] lg:h-[178px] lg:px-[18px] lg:pb-[18px] lg:pt-[22px]"
                style={{ animationDelay: `${index * 65}ms` }}
              >
                <div className="flex flex-1 items-center justify-center pb-2">
                  <Icon className="h-[50px] w-[50px] transition-transform duration-300 group-hover:scale-110 lg:h-[58px] lg:w-[58px]" strokeWidth={1.45} aria-hidden />
                </div>
                <h3 className="mb-2 min-h-[22px] text-[13px] font-semibold leading-tight text-white lg:text-[13px]">{department.title}</h3>
                {view ? (
                  <button
                    type="button"
                    onClick={() => navigate(view)}
                    className="inline-flex h-[25px] items-center justify-center rounded-sm bg-white px-4 text-[10px] font-bold uppercase tracking-[0.08em] text-black hover:bg-neutral-200 lg:h-[28px]"
                  >
                    See more
                  </button>
                ) : null}
              </article>
            );
          })}
        </section>
      </main>
    </InternalPageFrame>
  );
}
