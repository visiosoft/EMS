import { InternalLayout } from "@/modules/internal/layout/InternalLayout";
import { InternalNavigationProvider, useInternalNavigation } from "@/modules/internal/routing/InternalNavigationContext";
import { viewsWithLayout } from "@/modules/internal/routing/internalSessionRoute";
import { ArtGraphicDesignPage } from "@/modules/internal/pages/ArtGraphicDesignPage";
import { BookingPage } from "@/modules/internal/pages/BookingPage";
import { CompanyNewsPage } from "@/modules/internal/pages/CompanyNewsPage";
import { DepartmentsPage } from "@/modules/internal/pages/DepartmentsPage";
import { EmployeeServicesPage } from "@/modules/internal/pages/EmployeeServicesPage";
import { EventBusinessPage } from "@/modules/internal/pages/EventBusinessPage";
import { InternalHomePage } from "@/modules/internal/pages/HomePage";
import { LeadershipPage } from "@/modules/internal/pages/LeadershipPage";
import { MarketingPage } from "@/modules/internal/pages/MarketingPage";
import { ProductionPage } from "@/modules/internal/pages/ProductionPage";
import { ShippingRequestsPage } from "@/modules/internal/pages/ShippingRequestsPage";
import { TechSupportPage } from "@/modules/internal/pages/TechSupportPage";
import { TicketingSalesPage } from "@/modules/internal/pages/TicketingSalesPage";

function InternalAppViews() {
  const { currentView } = useInternalNavigation();

  switch (currentView) {
    case "company-news":
      return <CompanyNewsPage />;
    case "employee-services":
      return <EmployeeServicesPage />;
    case "leadership":
      return <LeadershipPage />;
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
    case "tech-support":
      return <TechSupportPage />;
    case "shipping-requests":
      return <ShippingRequestsPage />;
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
  const content = <InternalAppViews />;

  if (!viewsWithLayout(currentView)) {
    return content;
  }

  return <InternalLayout>{content}</InternalLayout>;
}
