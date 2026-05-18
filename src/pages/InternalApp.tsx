import { Route, Routes } from "react-router-dom";
import { InternalLayout } from "@/modules/internal/layout/InternalLayout";
import { DepartmentsPage } from "@/modules/internal/pages/DepartmentsPage";
import { EmployeeServicesPage } from "@/modules/internal/pages/EmployeeServicesPage";
import { InternalHomePage } from "@/modules/internal/pages/HomePage";
import { LeadershipPage } from "@/modules/internal/pages/LeadershipPage";

/** Route tree for the Company Hub module (`/internal/*`). */
export default function InternalApp() {
  return (
    <Routes>
      <Route element={<InternalLayout />}>
        <Route index element={<InternalHomePage />} />
        <Route path="employee-services" element={<EmployeeServicesPage />} />
        <Route path="leadership" element={<LeadershipPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
      </Route>
    </Routes>
  );
}
