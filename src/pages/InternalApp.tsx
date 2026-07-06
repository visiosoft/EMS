import { InternalLayout } from "@/modules/internal/layout/InternalLayout";
import { InternalNavigationProvider, useInternalNavigation } from "@/modules/internal/routing/InternalNavigationContext";
import { ArtGraphicDesignPage } from "@/modules/internal/pages/ArtGraphicDesignPage";
import { BookingPage } from "@/modules/internal/pages/BookingPage";
import { CompanyNewsPage } from "@/modules/internal/pages/CompanyNewsPage";
import { DepartmentsPage } from "@/modules/internal/pages/DepartmentsPage";
import { EmployeeServicesPage } from "@/modules/internal/pages/EmployeeServicesPage";
import { EmployeeDirectoryPage } from "@/modules/internal/pages/EmployeeDirectoryPage";
import { EmployeeProfilePage } from "@/modules/internal/pages/EmployeeProfilePage";
import { EventBusinessPage } from "@/modules/internal/pages/EventBusinessPage";
import { InternalHomePage } from "@/modules/internal/pages/HomePage";
import { LeadershipPage } from "@/modules/internal/pages/LeadershipPage";
import { MarketsPage } from "@/modules/internal/pages/MarketsPage";
import { VenuesPage } from "@/modules/internal/pages/VenuesPage";
import { AttractionsPage } from "@/modules/internal/pages/AttractionsPage";
import { MarketingPage } from "@/modules/internal/pages/MarketingPage";
import { ProductionPage } from "@/modules/internal/pages/ProductionPage";
import { TicketingSalesPage } from "@/modules/internal/pages/TicketingSalesPage";
import { LearningPortalPage } from "@/modules/internal/pages/LearningPortalPage";
import { LearningAdminPage } from "@/modules/internal/pages/LearningAdminPage";
import { MyProfilePage } from "@/modules/internal/pages/MyProfilePage";
import { PayrollSchedulePage } from "@/modules/internal/pages/PayrollSchedulePage";
import { HealthInsurancePage } from "@/modules/internal/pages/HealthInsurancePage";
import { DocumentLibraryPage } from "@/features/document-library/pages/DocumentLibraryPage";

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
    case "department-art-graphic-design":
      return <ArtGraphicDesignPage />;
    case "department-booking":
      return <BookingPage />;
    case "department-event-business":
      return <EventBusinessPage />;
    case "department-marketing":
      return <MarketingPage />;
    case "department-production":
      return <ProductionPage />;
    case "department-ticketing-sales":
      return <TicketingSalesPage />;
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
  const { currentView } = useInternalNavigation();
  
  if (currentView === "learning-admin") {
    return <LearningAdminPage />;
  }

  return (
    <InternalLayout>
      <InternalAppViews />
    </InternalLayout>
  );
}
