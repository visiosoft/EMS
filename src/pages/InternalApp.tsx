import { Route, Routes } from "react-router-dom";
import { InternalLayout } from "@/modules/internal/layout/InternalLayout";
import { ArtGraphicDesignPage } from "@/modules/internal/pages/ArtGraphicDesignPage";
import { BookingPage } from "@/modules/internal/pages/BookingPage";
import { CompanyNewsPage } from "@/modules/internal/pages/CompanyNewsPage";
import { DepartmentsPage } from "@/modules/internal/pages/DepartmentsPage";
import { EmployeeServicesPage } from "@/modules/internal/pages/EmployeeServicesPage";
import { EventBusinessPage } from "@/modules/internal/pages/EventBusinessPage";
import { InternalHomePage } from "@/modules/internal/pages/HomePage";
import { LeadershipPage } from "@/modules/internal/pages/LeadershipPage";
import { ShippingRequestsPage } from "@/modules/internal/pages/ShippingRequestsPage";
import { TechSupportPage } from "@/modules/internal/pages/TechSupportPage";

/** Route tree for the Company Hub module (`/internal/*`). */
export default function InternalApp() {
  return (
    <Routes>
      <Route path="tech-support" element={<TechSupportPage />} />
      <Route path="shipping-requests" element={<ShippingRequestsPage />} />

      <Route element={<InternalLayout />}>
        <Route index element={<InternalHomePage />} />
        <Route path="company-news" element={<CompanyNewsPage />} />
        <Route path="employee-services" element={<EmployeeServicesPage />} />
        <Route path="leadership" element={<LeadershipPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="departments/art-graphic-design" element={<ArtGraphicDesignPage />} />
        <Route path="departments/booking" element={<BookingPage />} />
        <Route path="departments/event-business" element={<EventBusinessPage />} />
      </Route>
    </Routes>
  );
}
