import { InternalLayout } from "@/modules/internal/layout/InternalLayout";
import { InternalNavigationProvider, useInternalNavigation } from "@/modules/internal/routing/InternalNavigationContext";
import { ArtGraphicDesignPage } from "@/modules/internal/pages/ArtGraphicDesignPage";
import { BookingPage } from "@/modules/internal/pages/BookingPage";
import { CompanyNewsPage } from "@/modules/internal/pages/CompanyNewsPage";
import { DepartmentsPage } from "@/modules/internal/pages/DepartmentsPage";
import { EmployeeServicesPage } from "@/modules/internal/pages/EmployeeServicesPage";
import { EventBusinessPage } from "@/modules/internal/pages/EventBusinessPage";
import { InternalHomePage } from "@/modules/internal/pages/HomePage";
import { LeadershipPage } from "@/modules/internal/pages/LeadershipPage";
import { MarketsPage } from "@/modules/internal/pages/MarketsPage";
import { VenuesPage } from "@/modules/internal/pages/VenuesPage";
import { AttractionsPage } from "@/modules/internal/pages/AttractionsPage";
import { MarketingPage } from "@/modules/internal/pages/MarketingPage";
import { ProductionPage } from "@/modules/internal/pages/ProductionPage";
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
  return (
    <InternalLayout>
      <InternalAppViews />
    </InternalLayout>
  );
}
