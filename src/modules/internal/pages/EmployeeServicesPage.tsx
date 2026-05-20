import { InternalPageHero } from "../components/InternalPageHero";
import { InternalPageFrame } from "../layout/InternalPageFrame";
import { IaeEmployeesTable } from "../components/IaeEmployeesTable";
import { EMPLOYEE_SERVICE_ITEMS } from "../constants/pageData";
import { useInternalNavigation } from "../routing/InternalNavigationContext";
import {
  EmployeeHandbookIntroductionPage,
  EmployeeHandbookPage,
  EmployeeHandbookSectionPage,
  resolveEmployeeHandbookView,
} from "./EmployeeHandbookPage";

function resolveHandbookViewFromData(
  handbook?: string,
  handbookHash?: string,
): ReturnType<typeof resolveEmployeeHandbookView> {
  if (handbook === "index" || handbook === "introduction" || handbook === "section" || handbook === "services") {
    if (handbook !== "services") return handbook;
  }
  if (handbookHash) return resolveEmployeeHandbookView(`#${handbookHash}`);
  return "services";
}

export function EmployeeServicesPage() {
  const { viewData, openEmployeeHandbook } = useInternalNavigation();
  const handbookView = resolveHandbookViewFromData(viewData.handbook, viewData.handbookHash);
  const handbookCard = EMPLOYEE_SERVICE_ITEMS.find((item) => item.wide);
  const serviceCards = EMPLOYEE_SERVICE_ITEMS.filter((item) => !item.wide);

  if (handbookView === "introduction") {
    return <EmployeeHandbookIntroductionPage handbookHash={viewData.handbookHash} />;
  }

  if (handbookView === "section") {
    return <EmployeeHandbookSectionPage handbookHash={viewData.handbookHash} />;
  }

  if (handbookView === "index") {
    return <EmployeeHandbookPage />;
  }

  return (
    <InternalPageFrame>
      <InternalPageHero
        title="Employee Services"
        subtitle="A dedicated space to connect with employees, discover profiles, and access people-related resources in one place."
      />

      <main className="mx-auto w-full max-w-[1060px] px-5 pb-16 pt-16 sm:px-8 sm:pt-20 lg:px-0">
        <section className="space-y-3" aria-label="Employee services resources">
          {handbookCard ? (
            <button
              type="button"
              onClick={() => openEmployeeHandbook("index")}
              className="group flex min-h-[126px] w-full items-center justify-center gap-5 rounded-lg bg-[#0c0c0c] px-8 py-6 text-white shadow-[0_4px_16px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1 hover:bg-black hover:shadow-[0_20px_40px_rgba(0,0,0,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4 sm:gap-7"
            >
              <span className="rounded-xl bg-black/20 p-3 transition-transform duration-300 group-hover:scale-110" aria-hidden>
                <handbookCard.icon className="h-[66px] w-[66px]" strokeWidth={1.55} />
              </span>
              <span className="text-lg font-semibold tracking-[0.02em]">{handbookCard.title}</span>
            </button>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {serviceCards.map((item, index) => {
              const Icon = item.icon;
              const cardClassName =
                "group flex min-h-[246px] flex-col items-center justify-center gap-5 rounded-lg bg-[#0c0c0c] px-6 py-9 text-center text-white shadow-[0_4px_16px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1 hover:bg-black hover:shadow-[0_20px_40px_rgba(0,0,0,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4";
              const cardStyle = { animationDelay: `${index * 70}ms` };
              const cardContent = (
                <>
                  <span className="rounded-xl bg-black/20 p-3 transition-transform duration-300 group-hover:scale-110" aria-hidden>
                    <Icon className="h-[84px] w-[84px]" strokeWidth={1.55} />
                  </span>
                  <span className="text-base font-semibold tracking-[0.02em]">{item.title}</span>
                </>
              );

              if (item.externalUrl) {
                return (
                  <a
                    key={item.title}
                    href={item.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cardClassName}
                    style={cardStyle}
                  >
                    {cardContent}
                  </a>
                );
              }

              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => {
                    if (item.handbookHash) {
                      openEmployeeHandbook("section", item.handbookHash);
                    }
                  }}
                  className={cardClassName}
                  style={cardStyle}
                >
                  {cardContent}
                </button>
              );
            })}
          </div>
        </section>

        <IaeEmployeesTable />
      </main>
    </InternalPageFrame>
  );
}
