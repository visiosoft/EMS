import { Route, Routes } from "react-router-dom";
import { InternalLayout } from "@/modules/internal/layout/InternalLayout";
import { InternalHomePage } from "@/modules/internal/pages/HomePage";

/** Route tree for the Company Hub module (`/internal/*`). */
export default function InternalApp() {
  return (
    <Routes>
      <Route element={<InternalLayout />}>
        <Route index element={<InternalHomePage />} />
      </Route>
    </Routes>
  );
}
