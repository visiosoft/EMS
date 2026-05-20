import { UserRound } from "lucide-react";
import { useLocation } from "react-router-dom";
import { InternalPageHero } from "../components/InternalPageHero";
import { EMPLOYEE_DIRECTORY_ROWS, EMPLOYEE_SERVICE_ITEMS } from "../constants/pageData";
import {
  EmployeeHandbookIntroductionPage,
  EmployeeHandbookPage,
  EmployeeHandbookSectionPage,
} from "./EmployeeHandbookPage";

const HANDBOOK_INTRO_HASHES = new Set(["#handbook-introduction", "#message-from-ceo", "#the-company", "#change-in-policy"]);
const HANDBOOK_SECTION_HASHES = new Set([
  "#handbook-employment-policies",
  "#handbook-company-policies",
  "#handbook-compensation-benefits",
  "#handbook-department-guides",
  "#handbook-work-performance",
  "#handbook-employee-acknowledgment",
]);

const contactBadgeClass: Record<string, string> = {
  Email: "bg-amber-100 text-amber-800",
  Phone: "bg-green-100 text-green-800",
  SMS: "bg-sky-100 text-sky-800",
};

export function EmployeeServicesPage() {
  const location = useLocation();
  const handbookCard = EMPLOYEE_SERVICE_ITEMS.find((item) => item.wide);
  const serviceCards = EMPLOYEE_SERVICE_ITEMS.filter((item) => !item.wide);

  if (HANDBOOK_INTRO_HASHES.has(location.hash)) {
    return <EmployeeHandbookIntroductionPage />;
  }

  if (HANDBOOK_SECTION_HASHES.has(location.hash)) {
    return <EmployeeHandbookSectionPage />;
  }

  if (location.hash === "#handbook") {
    return <EmployeeHandbookPage />;
  }

  return (
    <div className="bg-white text-black">
      <InternalPageHero
        title="Employee Services"
        subtitle="A dedicated space to connect with employees, discover profiles, and access people-related resources in one place."
      />

      <main className="mx-auto w-full max-w-[1060px] px-5 pb-16 pt-16 sm:px-8 sm:pt-20 lg:px-0">
        <section className="space-y-3" aria-label="Employee services resources">
          {handbookCard ? (
            <a
              href="#handbook"
              className="group flex min-h-[126px] items-center justify-center gap-5 rounded-lg bg-[#0c0c0c] px-8 py-6 text-white shadow-[0_4px_16px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1 hover:bg-black hover:shadow-[0_20px_40px_rgba(0,0,0,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4 sm:gap-7"
            >
              <span className="rounded-xl bg-black/20 p-3 transition-transform duration-300 group-hover:scale-110" aria-hidden>
                <handbookCard.icon className="h-[66px] w-[66px]" strokeWidth={1.55} />
              </span>
              <span className="text-lg font-semibold tracking-[0.02em]">{handbookCard.title}</span>
            </a>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {serviceCards.map((item, index) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.title}
                  href={`#${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  className="group flex min-h-[246px] flex-col items-center justify-center gap-5 rounded-lg bg-[#0c0c0c] px-6 py-9 text-center text-white shadow-[0_4px_16px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1 hover:bg-black hover:shadow-[0_20px_40px_rgba(0,0,0,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <span className="rounded-xl bg-black/20 p-3 transition-transform duration-300 group-hover:scale-110" aria-hidden>
                    <Icon className="h-[84px] w-[84px]" strokeWidth={1.55} />
                  </span>
                  <span className="text-base font-semibold tracking-[0.02em]">{item.title}</span>
                </a>
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-5 text-2xl font-semibold tracking-[0.01em] text-neutral-950">IAE Employees</h2>

          <div className="overflow-x-auto">
            <table className="min-w-[960px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs font-semibold text-neutral-900">
                  <th className="px-4 py-4">Picture</th>
                  <th className="px-4 py-4">Name</th>
                  <th className="px-4 py-4">Extension</th>
                  <th className="px-4 py-4">Mobile</th>
                  <th className="px-4 py-4">Work Email</th>
                  <th className="px-4 py-4">Preferred Conta...</th>
                  <th className="px-4 py-4">Title</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {EMPLOYEE_DIRECTORY_ROWS.map((row) => (
                  <tr key={row.name} className="transition-colors hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="flex h-10 w-10 items-end justify-center overflow-hidden bg-neutral-100 text-neutral-900">
                        <UserRound className="h-8 w-8" strokeWidth={1.3} aria-hidden />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-900">{row.name}</td>
                    <td className="px-4 py-3 text-neutral-800">{row.extension}</td>
                    <td className="px-4 py-3 text-neutral-800">{row.mobile}</td>
                    <td className="px-4 py-3 text-neutral-800">{row.email}</td>
                    <td className="px-4 py-3">
                      {row.preferred ? (
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${contactBadgeClass[row.preferred]}`}>
                          {row.preferred}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-neutral-800">{row.title ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
