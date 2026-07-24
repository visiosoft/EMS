import { InternalLayout } from "@/modules/internal/layout/InternalLayout";
import { InternalNavigationProvider, useInternalNavigation } from "@/modules/internal/routing/InternalNavigationContext";
import { DepartmentDetailPage } from "@/modules/internal/pages/DepartmentDetailPage";
import { EventBusinessPage } from "@/modules/internal/pages/EventBusinessPage";
import { CompanyNewsPage } from "@/modules/internal/pages/CompanyNewsPage";
import { DepartmentsPage } from "@/modules/internal/pages/DepartmentsPage";
import { EmployeeServicesPage } from "@/modules/internal/pages/EmployeeServicesPage";
import { EmployeeDirectoryPage } from "@/modules/internal/pages/EmployeeDirectoryPage";
import { EmployeeProfilePage } from "@/modules/internal/pages/EmployeeProfilePage";
import { InternalHomePage } from "@/modules/internal/pages/HomePage";
import { LeadershipPage } from "@/modules/internal/pages/LeadershipPage";
import { MarketsPage } from "@/modules/internal/pages/MarketsPage";
import { VenuesPage } from "@/modules/internal/pages/VenuesPage";
import { AttractionsPage } from "@/modules/internal/pages/AttractionsPage";
import { LearningPortalPage } from "@/modules/internal/pages/LearningPortalPage";
import { LearningAdminPage } from "@/modules/internal/pages/LearningAdminPage";
import { MyProfilePage } from "@/modules/internal/pages/MyProfilePage";
import { PayrollSchedulePage } from "@/modules/internal/pages/PayrollSchedulePage";
import { HealthInsurancePage } from "@/modules/internal/pages/HealthInsurancePage";
import { DocumentLibraryPage } from "@/features/document-library/pages/DocumentLibraryPage";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import { ShieldAlert } from "lucide-react";

function InternalAppViews() {
  const { currentView } = useInternalNavigation();

  switch (currentView) {
    case "company-news":
      return <CompanyNewsPage />;
    case "employee-services":
      return <EmployeeServicesPage />;
    case "employee-directory":
      return <EmployeeDirectoryPage />;
    case "employee-profile":
      return <EmployeeProfilePage />;
    case "leadership":
      return <LeadershipPage />;
    case "markets":
      return <MarketsPage />;
    case "venues":
      return <VenuesPage />;
    case "attractions":
      return <AttractionsPage />;
    case "departments":
      return <DepartmentsPage />;
    case "department-event-business":
      return <EventBusinessPage />;
    case "department":
    case "department-art-graphic-design":
    case "department-booking":
    case "department-marketing":
    case "department-production":
    case "department-ticketing-sales":
      return <DepartmentDetailPage />;
    case "learning-portal":
      return <LearningPortalPage />;
    case "document-library":
      return <DocumentLibraryPage />;
    case "my-profile":
      return <MyProfilePage />;
    case "payroll-schedule":
      return <PayrollSchedulePage />;
    case "health-insurance":
      return <HealthInsurancePage />;
    case "home":
    default:
      return <InternalHomePage />;
  }
}

/** Company Hub shell — in-app navigation only; the address bar stays on `/internal`. */
export default function InternalApp() {
  return (
    <InternalNavigationProvider>
      <InternalAppShell />
    </InternalNavigationProvider>
  );
}

function InternalAppShell() {
  const { currentView, navigate } = useInternalNavigation();
  const { isAdministrator, isLoading: accessLevelLoading } = useAccessLevel();
  
  if (currentView === "learning-admin") {
    if (accessLevelLoading) return null;
    if (!isAdministrator) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
          <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
            <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h1 className="mb-2 text-xl font-semibold text-gray-900">Access Denied</h1>
            <p className="mb-6 text-sm text-gray-600">
              You do not have the required permission to access the Admin Panel.
              This area is restricted to Administrators only.
            </p>
            <button
              type="button"
              onClick={() => navigate("learning-portal")}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
            >
              Back to Learning Portal
            </button>
          </div>
        </div>
      );
    }
    return <LearningAdminPage />;
  }

  return (
    <InternalLayout>
      <InternalAppViews />
    </InternalLayout>
  );
}
