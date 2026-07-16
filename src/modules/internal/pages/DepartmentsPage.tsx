import { useState, useEffect } from "react";
import { Loader2, Building2 } from "lucide-react";
import type { InternalView } from "../routing/internalSessionRoute";
import { InternalPageHero } from "../components/InternalPageHero";
import { WeeklyRecapSection } from "../components/WeeklyRecapSection";
import { useInternalNavigation } from "../routing/InternalNavigationContext";
import { InternalPageFrame } from "../layout/InternalPageFrame";
import { apiFetch } from "@/api/config";

type DepartmentLookup = { departmentId: number; departmentName: string };
type DepartmentItem = { departmentId: number; departmentName: string };

/** Departments that have a custom detail page instead of the generic one. Keyed by DB name. */
const CUSTOM_DEPARTMENT_VIEWS: Record<string, InternalView> = {
  "Event Business": "department-event-business",
};

export function DepartmentsPage() {
  const { navigate } = useInternalNavigation();
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<DepartmentLookup[]>('/lookups/departments')
      .then((all) => {
        setDepartments(all);
      })
      .catch(() => {
        setDepartments([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <InternalPageFrame footer={<WeeklyRecapSection pinned />}>
      <InternalPageHero
        title="Departments"
        subtitle="A centralized view of all departments, making it easy to explore teams, roles, and responsibilities across the organization."
      />

      <main className="mx-auto w-full max-w-[1070px] px-5 pb-[22px] pt-[70px] sm:px-8 lg:px-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          </div>
        ) : (
        <section className="grid grid-cols-2 gap-[10px] sm:grid-cols-3 lg:grid-cols-6 lg:gap-[12px]" aria-label="Departments">
          {departments.map((department, index) => (
            <article
              key={department.departmentId}
              className="group flex h-[166px] w-full flex-col rounded-md bg-black px-5 pb-5 pt-6 text-white shadow-[0_4px_16px_rgba(0,0,0,0.24)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(0,0,0,0.28)] lg:h-[178px] lg:px-[18px] lg:pb-[18px] lg:pt-[22px]"
              style={{ animationDelay: `${index * 65}ms` }}
            >
              <div className="flex flex-1 items-center justify-center pb-2">
                <Building2 className="h-[50px] w-[50px] transition-transform duration-300 group-hover:scale-110 lg:h-[58px] lg:w-[58px]" strokeWidth={1.45} aria-hidden />
              </div>
              <h3 className="mb-2 min-h-[22px] text-[13px] font-semibold leading-tight text-white lg:text-[13px]">{department.departmentName}</h3>
              <button
                type="button"
                onClick={() => {
                  const customView = CUSTOM_DEPARTMENT_VIEWS[department.departmentName];
                  navigate(customView || "department", { departmentId: department.departmentId });
                }}
                className="inline-flex h-[25px] items-center justify-center rounded-sm bg-white px-4 text-[10px] font-bold uppercase tracking-[0.08em] text-black hover:bg-neutral-200 lg:h-[28px]"
              >
                See more
              </button>
            </article>
          ))}
        </section>
        )}
      </main>
    </InternalPageFrame>
  );
}
