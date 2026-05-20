import type { InternalView } from "../routing/internalSessionRoute";

export type InternalNavItem = {
  label: string;
  key: string;
  view?: InternalView;
};

export const INTERNAL_NAV_ITEMS: InternalNavItem[] = [
  { key: "employee-services", label: "Employee Services", view: "employee-services" },
  { key: "leadership", label: "Leadership", view: "leadership" },
  { key: "departments", label: "Departments", view: "departments" },
  { key: "markets", label: "Markets", view: "markets" },
  { key: "venues", label: "Venues", view: "venues" },
  { key: "attractions", label: "Attractions", view: "attractions" },
];
